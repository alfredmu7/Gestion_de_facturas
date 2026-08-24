import { Router } from 'express';
import multer from 'multer';
import { 
  getHistoryHandler, 
  getWhatsAppStatusHandler, 
  uploadInvoiceHandler, 
  resolveReviewHandler,
  deleteInvoiceHandler // 👈 1. Importas el manejador de borrado
} from '../controllers/invoiceController.js';

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

// 📌 Rutas HTTP delegadas a Controladores
router.get('/history', getHistoryHandler);
router.get('/whatsapp-status', getWhatsAppStatusHandler);
router.post('/upload', upload.single('factura'), uploadInvoiceHandler);
router.post('/resolve-review', resolveReviewHandler);
router.delete('/:id', deleteInvoiceHandler); // 👈 2. Endpoint DELETE registrado

// Middleware de manejo de errores de Multer
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;