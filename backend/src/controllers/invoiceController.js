import { processAndClassifyInvoice } from '../agents/classifierAgent.js';
import { runAuditAgent } from '../agents/auditAgent.js';
import { 
  saveInvoiceToDatabase, 
  getHistoricalInvoices, 
  resolveReviewService,
  deleteInvoiceService
} from '../services/invoiceService.js';

export const getHistoryHandler = async (req, res) => {
  try {
    const invoices = await getHistoricalInvoices(req.user.id);
    return res.status(200).json(invoices);
  } catch (error) {
    console.error('Error al obtener el historial de facturas:', error);
    return res.status(500).json({ 
      error: 'Error interno al consultar el historial de facturas.' 
    });
  }
};

export const uploadInvoiceHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo de factura.' });
    }

    const userId = req.user.id;

    console.log(`🤖 AGENTE 1 (VISOR): Extrayendo datos de ${req.file.originalname}...`);
    const extractedData = await processAndClassifyInvoice(req.file.buffer, req.file.mimetype);

    console.log('🤖 AGENTE 2 (AUDITOR): Consultando historial del usuario...');
    const historicalInvoices = await getHistoricalInvoices(userId);

    const auditResult = await runAuditAgent(extractedData, historicalInvoices);

    if (auditResult.estado_auditoria === 'RECHAZADA') {
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

    // ✅ Corregido: Quitado "fileMime:"
    const savedData = await saveInvoiceToDatabase(
      userId,
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

export const resolveReviewHandler = async (req, res) => {
  try {
    const { invoiceId, userMessage, chatHistory } = req.body;

    if (!invoiceId || !userMessage) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: invoiceId o userMessage.' });
    }

    const cleanInvoiceId = String(invoiceId).replace(/['"]/g, '').trim();

    const { resolution, updatedInvoice } = await resolveReviewService(
      cleanInvoiceId, 
      userMessage, 
      chatHistory || [], 
      req.user.id
    );

    return res.status(200).json({
      success: true,
      resolution,
      updatedInvoice,
      data: updatedInvoice 
    });

  } catch (error) {
    console.error('Error en la mediación de revisión:', error);
    return res.status(500).json({ 
      error: error.message || 'Error al procesar la revisión con el Agente Mediador.' 
    });
  }
};

export const deleteInvoiceHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'El ID de la factura es obligatorio.' });
    }

    const cleanInvoiceId = String(id).replace(/['"]/g, '').trim();

    const deletedData = await deleteInvoiceService(cleanInvoiceId, req.user.id);

    if (!deletedData) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada o no tienes permisos para eliminarla.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Factura eliminada correctamente.',
      data: deletedData
    });

  } catch (error) {
    console.error('Error al eliminar factura:', error);
    return res.status(500).json({ 
      error: error.message || 'Fallo interno al eliminar la factura.' 
    });
  }
};