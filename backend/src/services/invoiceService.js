import { supabase } from '../config/supabase.js';

export const saveInvoiceToDatabase = async (invoiceData, auditResult, fileBuffer, mimeType) => {
  try {
    // 1. Genero un nombre de archivo único para Supabase Storage
    const fileName = `${invoiceData.categoria}_${Date.now()}_${(invoiceData.proveedor || 'Factura').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

    // 2. Subo la imagen al Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('facturas')
      .upload(fileName, fileBuffer, { contentType: mimeType });

    if (storageError) throw new Error(`Error en Storage: ${storageError.message}`);

    // 3. Obtengo la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from('facturas')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // 4. Guardo la factura junto con el dictamen del AGENTE AUDITOR
    const { data: insertedInvoice, error: dbError } = await supabase
      .from('facturas')
      .insert([
        {
          proveedor: invoiceData.proveedor,
          nit_rut: invoiceData.nit_rut,
          numero_factura: invoiceData.numero_factura,
          fecha_emision: invoiceData.fecha_emision,
          categoria: invoiceData.categoria,
          total_impuestos: invoiceData.total_impuestos,
          monto_total: invoiceData.monto_total,
          url_imagen: publicUrl,
          nombre_archivo_storage: fileName,
          estado_auditoria: auditResult.estado_auditoria,
          observaciones_auditor: auditResult.observaciones_auditor,
          accion_sugerida: auditResult.accion_sugerida
        }
      ])
      .select()
      .single();

    if (dbError) throw new Error(`Error en DB facturas: ${dbError.message}`);

    // 5. Guardo los ítems asociados si existen
    if (invoiceData.items && invoiceData.items.length > 0) {
      const itemsToInsert = invoiceData.items.map(item => ({
        factura_id: insertedInvoice.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_total: item.precio_total
      }));

      const { error: itemsError } = await supabase
        .from('items_factura')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error insertando ítems de factura:', itemsError);
      }
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
 * Obtiene el historial completo de facturas para el Frontend y el Agente Auditor
 */
export const getHistoricalInvoices = async () => {
  try {
    // ✅ CORRECCIÓN: Seleccionamos '*' para traer categoria, url_imagen, estado_auditoria, etc.
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener historial de facturas:', error);
    return [];
  }
};