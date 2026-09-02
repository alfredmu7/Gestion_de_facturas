import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { runReviewResolverAgent } from '../agents/runReviewResolverAgent.js';

/**
 * 📌 Helper para sanitizar y validar valores antes de insertarlos en columnas DATE
 */
const parseDbDate = (dateVal) => {
  if (!dateVal) return null;

  const cleaned = String(dateVal)
    .replace(/^[:"'\s]+|[:"'\s]+$/g, '')
    .trim();

  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const parsedDate = new Date(cleaned);
  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().split('T')[0];
};

/**
 * 📌 Guardar factura e ítems asociados al userId
 */
export const saveInvoiceToDatabase = async (userId, invoiceData, auditResult, fileBuffer, mimeType) => {
  try {
    const fileName = `${invoiceData.categoria || 'FACTURA'}_${Date.now()}_${(invoiceData.proveedor || 'Factura').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

    // 1. Subir imagen a Supabase Storage
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('facturas')
      .upload(fileName, fileBuffer, { contentType: mimeType });

    if (storageError) throw new Error(`Error en Storage: ${storageError.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('facturas')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // 2. Upsert de Proveedor asociado al userId
    let proveedorId = null;
    if (invoiceData.proveedor) {
      const { data: provData } = await supabaseAdmin
        .from('proveedores')
        .upsert(
          { 
            user_id: userId, // 👈 Asociado al usuario
            nombre: invoiceData.proveedor, 
            nit_rut: invoiceData.nit_rut || null 
          },
          { onConflict: 'nombre' }
        )
        .select('id')
        .maybeSingle();

      if (provData) proveedorId = provData.id;
    }

    // 3. Insertar factura principal incluyendo el user_id
    const { data: insertedInvoice, error: dbError } = await supabaseAdmin
      .from('facturas')
      .insert([
        {
          user_id: userId, // 👈 CRÍTICO: Asigna la propiedad al usuario autenticado
          proveedor_id: proveedorId,
          proveedor: invoiceData.proveedor || null,
          nit_rut: invoiceData.nit_rut || null,
          numero_factura: invoiceData.numero_factura || null,
          fecha_emision: parseDbDate(invoiceData.fecha_emision),
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

      const { error: itemsError } = await supabaseAdmin
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

/**
 * 📌 Obtener historial filtrado por el userId del usuario
 */
export const getHistoricalInvoices = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('facturas')
      .select('*, items_factura(*)')
      .eq('user_id', userId) // 👈 CRÍTICO: Garantiza la independencia de lecturas
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
 * 📌 Resolver revisión validando propiedad con userId
 */
export const resolveReviewService = async (invoiceId, userMessage, chatHistory = [], userId) => {
  try {
    const cleanId = String(invoiceId).trim().replace(/['"]/g, '');

    // 1. Buscar la factura verificando user_id
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('facturas')
      .select('*, items_factura(*)')
      .eq('id', cleanId)
      .eq('user_id', userId) // 👈 Valida pertenencia
      .maybeSingle();

    if (fetchError || !invoice) {
      throw new Error(`Factura con ID ${cleanId} no encontrada o no pertenece al usuario.`);
    }

    // 2. Ejecutar Agente 3
    const resolution = await runReviewResolverAgent({
      invoiceData: invoice,
      auditObservations: invoice.observaciones_auditor,
      userMessage,
      chatHistory
    });

    const fa = resolution.factura_actualizada || resolution.datos_corregidos || {};
    const nuevoEstado = resolution.nuevo_estado_auditoria || 'APROBADA';

    const updatePayload = {
      estado_auditoria: nuevoEstado,
      accion_sugerida: resolution.respuesta_usuario || 'Ajuste posterior realizado correctamente.'
    };

    if (fa.proveedor) updatePayload.proveedor = String(fa.proveedor);
    if (fa.nit_rut || fa.nit) updatePayload.nit_rut = String(fa.nit_rut || fa.nit);
    if (fa.monto_total) updatePayload.monto_total = Number(fa.monto_total);
    if (fa.categoria) updatePayload.categoria = String(fa.categoria);

    if (fa.fecha_emision) {
      updatePayload.fecha_emision = parseDbDate(fa.fecha_emision);
    }

    if (fa.propina !== undefined && fa.propina !== null) {
      updatePayload.propina = Number(fa.propina);
    }

    if (nuevoEstado === 'APROBADA') {
      updatePayload.observaciones_auditor = [];
    }

    // 3. Guardar cambios en Supabase con filtro de user_id
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('facturas')
      .update(updatePayload)
      .eq('id', cleanId)
      .eq('user_id', userId) // 👈 Doble verificación de seguridad
      .select('*, items_factura(*)');

    if (updateError) throw updateError;

    return { resolution, updatedInvoice: updatedRows[0] };

  } catch (error) {
    console.error('❌ Error re-editando factura:', error);
    throw error;
  }
};

/**
 * 📌 Eliminar factura asegurando propiedad de usuario
 */
export const deleteInvoiceService = async (id, userId) => {
  console.log(`🔎 Verificando existencia de factura ${id} para el usuario ${userId}...`);

  // 1. Buscar factura con filtro de user_id
  const { data: existingInvoice, error: searchError } = await supabaseAdmin
    .from('facturas')
    .select('id, numero_factura, url_imagen, nombre_archivo_storage')
    .eq('id', id)
    .eq('user_id', userId) // 👈 Previene eliminaciones cruzadas entre usuarios
    .maybeSingle();

  if (searchError) {
    console.error('❌ Error al buscar la factura:', searchError.message);
    throw new Error(`Error en búsqueda: ${searchError.message}`);
  }

  if (!existingInvoice) {
    console.warn(`⚠️ La factura con ID ${id} no existe o no pertenece al usuario ${userId}.`);
    return null;
  }

  // 2. Eliminar imagen física del Storage
  if (existingInvoice.nombre_archivo_storage) {
    const { error: storageDeleteError } = await supabaseAdmin.storage
      .from('facturas')
      .remove([existingInvoice.nombre_archivo_storage]);

    if (storageDeleteError) {
      console.error('⚠️ No se pudo eliminar el archivo del Storage:', storageDeleteError.message);
    } else {
      console.log('🗑️ Imagen borrada de Supabase Storage exitosamente.');
    }
  }

  // 3. Eliminar de la base de datos
  const { data, error } = await supabaseAdmin
    .from('facturas')
    .delete()
    .eq('id', id)
    .eq('user_id', userId) // 👈 Eliminación segura
    .select();

  if (error) {
    throw new Error(`Error en Supabase al eliminar: ${error.message}`);
  }

  console.log('🗑️ Factura eliminada con éxito de la DB:', data);
  return data;
};