import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middlewares/authMiddleware.js'; // 👈 Nombre correcto
import { 
  getHistoryHandler, 
  uploadInvoiceHandler, 
  resolveReviewHandler,
  deleteInvoiceHandler
} from '../controllers/invoiceController.js';

const router = Router();

// Configuración de Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
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

// Proteger todas las rutas del router
router.use(authenticateToken); // 👈 Usar el nombre exportado

router.get('/history', getHistoryHandler);
router.post('/upload', upload.single('factura'), uploadInvoiceHandler);
router.post('/resolve-review', resolveReviewHandler);
router.delete('/:id', deleteInvoiceHandler);

router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;