import { supabase } from '../config/supabase.js';
import { runReviewResolverAgent } from '../agents/runReviewResolverAgent.js';

/**
 * 📌 Helper para sanitizar y validar valores antes de insertarlos en columnas de tipo DATE en PostgreSQL
 */
const parseDbDate = (dateVal) => {
  if (!dateVal) return null;

  // Eliminar caracteres basura comúnmente retornados por la IA o concatenaciones (ej: ":null", "'null'", "undefined")
  const cleaned = String(dateVal)
    .replace(/^[:"'\s]+|[:"'\s]+$/g, '')
    .trim();

  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') {
    return null;
  }

  // Intentar parsear a fecha válida ISO
  const parsedDate = new Date(cleaned);
  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().split('T')[0];
};

export const saveInvoiceToDatabase = async (invoiceData, auditResult, fileBuffer, mimeType) => {
  try {
    const fileName = `${invoiceData.categoria || 'FACTURA'}_${Date.now()}_${(invoiceData.proveedor || 'Factura').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

    // 1. Subir imagen a Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('facturas')
      .upload(fileName, fileBuffer, { contentType: mimeType });

    if (storageError) throw new Error(`Error en Storage: ${storageError.message}`);

    const { data: publicUrlData } = supabase.storage
      .from('facturas')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // 2. Upsert de Proveedor para mantener la FK
    let proveedorId = null;
    if (invoiceData.proveedor) {
      const { data: provData } = await supabase
        .from('proveedores')
        .upsert(
          { nombre: invoiceData.proveedor, nit_rut: invoiceData.nit_rut || null },
          { onConflict: 'nombre' }
        )
        .select('id')
        .maybeSingle();

      if (provData) proveedorId = provData.id;
    }

    // 3. Insertar factura principal sanitizando fecha_emision
    const { data: insertedInvoice, error: dbError } = await supabase
      .from('facturas')
      .insert([
        {
          proveedor_id: proveedorId,
          proveedor: invoiceData.proveedor || null,
          nit_rut: invoiceData.nit_rut || null,
          numero_factura: invoiceData.numero_factura || null,
          fecha_emision: parseDbDate(invoiceData.fecha_emision), // 👈 Sanitización de fecha corregida
          categoria: invoiceData.categoria || 'OTROS',
          total_impuestos: invoiceData.total_impuestos || 0,
          monto_total: invoiceData.monto_total || 0,
          propina: invoiceData.propina || 0,
          url_imagen: publicUrl,
          nombre_archivo_storage: fileName,
          estado_auditoria: auditResult.estado_auditoria || 'PENDIENTE',
          observaciones_auditor: auditResult.observaciones_auditor || [],
          accion_sugerida: auditResult.accion_sugerida || null
        }
      ])
      .select()
      .maybeSingle();

    if (dbError || !insertedInvoice) {
      throw new Error(`Error en DB facturas: ${dbError?.message || 'No se pudo insertar la factura.'}`);
    }

    // 4. Insertar ítems
    if (invoiceData.items && invoiceData.items.length > 0) {
      const itemsToInsert = invoiceData.items.map(item => ({
        factura_id: insertedInvoice.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio_unitario || 0,
        precio_total: item.precio_total || 0
      }));

      const { error: itemsError } = await supabase
        .from('items_factura')
        .insert(itemsToInsert);

      if (itemsError) console.error('Error insertando ítems de factura:', itemsError);
    }

    return {
      facturaId: insertedInvoice.id,
      urlImagen: publicUrl,
      analisisIA: invoiceData,
      auditoriaIA: auditResult
    };

  } catch (error) {
    console.error('Error en saveInvoiceToDatabase:', error);
    throw error;
  }
};

export const getHistoricalInvoices = async () => {
  try {
    const { data, error } = await supabase
      .from('facturas')
      .select('*, items_factura(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener historial de facturas:', error);
    return [];
  }
};

/**
 * Servicio para resolver revisión vía Agente Resolutor (Agente 3)
 */
export const resolveReviewService = async (invoiceId, userMessage, chatHistory = []) => {
  try {
    const cleanId = String(invoiceId).trim().replace(/['"]/g, '');

    // 1. Buscar la factura
    const { data: invoice, error: fetchError } = await supabase
      .from('facturas')
      .select('*, items_factura(*)')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchError || !invoice) {
      throw new Error(`Factura con ID ${cleanId} no encontrada.`);
    }

    // 2. Ejecutar Agente 3 enviando el estado actual
    const resolution = await runReviewResolverAgent({
      invoiceData: invoice,
      auditObservations: invoice.observaciones_auditor,
      userMessage,
      chatHistory
    });

    const fa = resolution.factura_actualizada || resolution.datos_corregidos || {};

    // 3. Determinar el nuevo estado
    const nuevoEstado = resolution.nuevo_estado_auditoria || 'APROBADA';

    const updatePayload = {
      estado_auditoria: nuevoEstado,
      accion_sugerida: resolution.respuesta_usuario || 'Ajuste posterior realizado correctamente.'
    };

    // Actualizar campos que el usuario o el agente soliciten corregir
    if (fa.proveedor) updatePayload.proveedor = String(fa.proveedor);
    if (fa.nit_rut || fa.nit) updatePayload.nit_rut = String(fa.nit_rut || fa.nit);
    if (fa.monto_total) updatePayload.monto_total = Number(fa.monto_total);
    if (fa.categoria) updatePayload.categoria = String(fa.categoria);

    // 💡 Si la respuesta incluye fecha_emision corregida por el usuario
    if (fa.fecha_emision) {
      updatePayload.fecha_emision = parseDbDate(fa.fecha_emision);
    }

    if (fa.propina !== undefined && fa.propina !== null) {
      updatePayload.propina = Number(fa.propina);
    }

    // Si se re-aprueba o corrige una aprobada, dejamos observaciones vacías
    if (nuevoEstado === 'APROBADA') {
      updatePayload.observaciones_auditor = [];
    }

    // 4. Guardar en Supabase
    const { data: updatedRows, error: updateError } = await supabase
      .from('facturas')
      .update(updatePayload)
      .eq('id', cleanId)
      .select('*, items_factura(*)');

    if (updateError) throw updateError;

    return { resolution, updatedInvoice: updatedRows[0] };

  } catch (error) {
    console.error('❌ Error re-editando factura:', error);
    throw error;
  }
};

/**
 * 📌 Eliminar factura de Supabase (Base de datos y Storage)
 */
export const deleteInvoiceService = async (id) => {
  console.log(`🔎 Verificando existencia de la factura con ID: "${id}"...`);

  // 1. Buscar si la factura existe
  const { data: existingInvoice, error: searchError } = await supabase
    .from('facturas')
    .select('id, numero_factura, url_imagen, nombre_archivo_storage')
    .eq('id', id)
    .maybeSingle();

  if (searchError) {
    console.error('❌ Error al buscar la factura:', searchError.message);
    throw new Error(`Error en búsqueda: ${searchError.message}`);
  }

  if (!existingInvoice) {
    console.warn(`⚠️ La factura con ID ${id} NO existe en la tabla 'facturas'.`);
    const { data: allInvoices } = await supabase.from('facturas').select('id, numero_factura').limit(5);
    console.log('📋 IDs actualmente existentes en la base de datos:', allInvoices);
    return null;
  }

  console.log('✅ Factura encontrada:', existingInvoice);

  // 2. Eliminar imagen física del Storage si existe el nombre del archivo
  if (existingInvoice.nombre_archivo_storage) {
    const { error: storageDeleteError } = await supabase.storage
      .from('facturas')
      .remove([existingInvoice.nombre_archivo_storage]);

    if (storageDeleteError) {
      console.error('⚠️ No se pudo eliminar el archivo del Storage:', storageDeleteError.message);
    } else {
      console.log('🗑️ Imagen borrada de Supabase Storage exitosamente.');
    }
  }

  // 3. Proceder a eliminar de PostgreSQL
  const { data, error } = await supabase
    .from('facturas')
    .delete()
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(`Error en Supabase al eliminar: ${error.message}`);
  }

  console.log('🗑️ Factura eliminada con éxito de la DB:', data);
  return data;
};