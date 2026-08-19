import { Router } from 'express';
import multer from 'multer';
import { processAndClassifyInvoice } from '../agents/classifierAgent.js';
import { runAuditAgent } from '../agents/auditAgent.js';
import { saveInvoiceToDatabase, getHistoricalInvoices } from '../services/invoiceService.js';
import { getWhatsAppStatus } from '../services/whatsappService.js';

const router = Router();

// Configuración de Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // Límite de 15MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Solo se permiten PDFs e imágenes (JPG, PNG, WEBP).'), false);
    }
  }
});

// 📌 1. NUEVA RUTA: Obtener historial de facturas (Soluciona el 404 del Frontend)
router.get('/history', async (req, res) => {
  try {
    const invoices = await getHistoricalInvoices();
    return res.status(200).json(invoices);
  } catch (error) {
    console.error('Error al obtener el historial de facturas:', error);
    return res.status(500).json({ 
      error: 'Error interno al consultar el historial de facturas.' 
    });
  }
});

// 📌 2. NUEVA RUTA OPCIONAL: Estado del bot de WhatsApp para React
router.get('/whatsapp-status', (req, res) => {
  return res.status(200).json(getWhatsAppStatus());
});

// 📌 3. RUTA EXISTENTE: Carga de facturas por formulario web
router.post('/upload', upload.single('factura'), async (req, res) => {
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

    if (auditResult.estado_auditoria === 'RECHAZADA') {
      console.warn('⛔ Factura rechazada por el Agente Auditor. No se guardará en BD.');
      
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
    const savedData = await saveInvoiceToDatabase(
      extractedData,
      auditResult,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    return res.status(200).json({
      success: true,
      message: 'Factura procesada y auditada exitosamente',
      data: savedData
    });

  } catch (error) {
    console.error('Error en la ruta /upload:', error);
    return res.status(500).json({ 
      error: error.message || 'Fallo interno al procesar y auditar la factura.' 
    });
  }
});

// Middleware de manejo de errores de Multer
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;