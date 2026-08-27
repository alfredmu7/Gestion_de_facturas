import { Router } from 'express';
import { register, login, getMe, googleLogin } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

// Ruta protegida (requiere token válido)
router.get('/me', authenticateToken, getMe);

export default router;