import { verifyToken } from '../utils/authUtils.js';

/**
 * Middleware para validar el Token JWT en peticiones protegidas
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // El header suele venir en formato: "Bearer <TOKEN>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. No se proporcionó un token de autenticación.'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Adjuntamos los datos decodificados (id, email, rol) a la petición
    next(); // Continuamos hacia el siguiente controlador/ruta
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido o expirado.'
    });
  }
};