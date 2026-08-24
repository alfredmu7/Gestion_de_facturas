import { processAndClassifyInvoice } from '../agents/classifierAgent.js';
import { runAuditAgent } from '../agents/auditAgent.js';
import { 
  saveInvoiceToDatabase, 
  getHistoricalInvoices, 
  resolveReviewService,
  deleteInvoiceService
} from '../services/invoiceService.js';
import { getWhatsAppStatus } from '../services/whatsappService.js';

// 📌 Obtener historial de facturas
export const getHistoryHandler = async (req, res) => {
  try {
    const invoices = await getHistoricalInvoices();
    return res.status(200).json(invoices);
  } catch (error) {
    console.error('Error al obtener el historial de facturas:', error);
    return res.status(500).json({ 
      error: 'Error interno al consultar el historial de facturas.' 
    });
  }
};

// 📌 Estado del bot de WhatsApp
export const getWhatsAppStatusHandler = (req, res) => {
  return res.status(200).json(getWhatsAppStatus());
};

// 📌 Procesamiento e ingesta de facturas (Agentes 1 y 2)
export const uploadInvoiceHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo de factura.' });
    }

    console.log(`🤖 AGENTE 1 (VISOR): Extrayendo datos de ${req.file.originalname} (${req.file.mimetype})...`);
    const extractedData = await processAndClassifyInvoice(req.file.buffer, req.file.mimetype);

   console.log('🤖 AGENTE 2 (AUDITOR): Consultando historial y ejecutando auditoría...');
    const historicalInvoices = await getHistoricalInvoices();

    const auditResult = await runAuditAgent(extractedData, historicalInvoices);
    console.log(`📌 Resultado Auditoría: ${auditResult.estado_auditoria}`);
    // 💡 LOG ADICIONAL: Imprime el detalle completo y las observaciones del auditor
    console.log('🧐 Detalle completo del Auditor:', JSON.stringify(auditResult, null, 2));

    if (auditResult.estado_auditoria === 'RECHAZADA') {
      console.warn(`⛔ Factura rechazada. Motivo: ${auditResult.observaciones_auditor || auditResult.motivo}`);
      
      return res.status(200).json({
        success: false,
        message: 'Factura rechazada por el Agente Auditor',
        data: {
          ...extractedData,
          auditResult,
          estado_auditoria: 'RECHAZADA',
          motivo: auditResult.observaciones_auditor,
          accion_sugerida: auditResult.accion_sugerida
        }
      });
    }

    console.log('💾 Guardando resultados en Supabase Storage & PostgreSQL...');
    // Ajustado a los 4 parámetros que requiere saveInvoiceToDatabase
    const savedData = await saveInvoiceToDatabase(
      extractedData,
      auditResult,
      req.file.buffer,
      req.file.mimetype
    );

    return res.status(200).json({
      success: true,
      message: 'Factura procesada y auditada exitosamente',
      data: savedData
    });

  } catch (error) {
    console.error('Error en la carga de factura:', error);
    return res.status(500).json({ 
      error: error.message || 'Fallo interno al procesar y auditar la factura.' 
    });
  }
};

// 📌 Resolución de revisiones conversacionales (Agente 3)
// 📌 Resolución de revisiones conversacionales (Agente 3)
export const resolveReviewHandler = async (req, res) => {
  try {
    const { invoiceId, userMessage, chatHistory } = req.body;

    if (!invoiceId || !userMessage) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: invoiceId o userMessage.' });
    }

    const cleanInvoiceId = String(invoiceId).replace(/['"]/g, '').trim();

    console.log(`🤖 AGENTE 3 (MEDIADOR WEB): Procesando aclaración para factura ${cleanInvoiceId}...`);
    
    const { resolution, updatedInvoice } = await resolveReviewService(cleanInvoiceId, userMessage, chatHistory || []);

    // Retornamos directamente el objeto actualizado para que React o la UI reemplace el estado inmediatamente
    return res.status(200).json({
      success: true,
      resolution,
      updatedInvoice,
      data: updatedInvoice // Para compatibilidad si tu frontend lee res.data.data
    });

  } catch (error) {
    console.error('Error en la mediación de revisión:', error);
    return res.status(500).json({ 
      error: error.message || 'Error al procesar la revisión con el Agente Mediador.' 
    });
  }
};
// 📌 Eliminar factura de la base de datos
export const deleteInvoiceHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'El ID de la factura es obligatorio.' });
    }

    const cleanInvoiceId = String(id).replace(/['"]/g, '').trim();

    console.log(`🗑️ Eliminando factura ${cleanInvoiceId} de la base de datos...`);
    await deleteInvoiceService(cleanInvoiceId);

    return res.status(200).json({
      success: true,
      message: 'Factura eliminada correctamente.'
    });

  } catch (error) {
    console.error('Error al eliminar factura:', error);
    return res.status(500).json({ 
      error: error.message || 'Fallo interno al eliminar la factura.' 
    });
  }
};