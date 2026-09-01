// Archivo: src/middlewares/authMiddleware.js [BACKEND]
import { supabaseAdmin } from '../config/supabaseAdmin.js';

/**
 * Middleware para validar el Token JWT de Supabase en peticiones protegidas
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // El header viene en formato: "Bearer <TOKEN>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. No se proporcionó un token de autenticación.'
    });
  }

  try {
    // Validar el token JWT directamente con el cliente Administrador de Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado.'
      });
    }

    // Adjuntamos los datos del usuario autenticado de Supabase (id, email, user_metadata, etc.) a la petición
    req.user = user; 
    next(); // Continuamos hacia el siguiente controlador/ruta
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno al verificar la autenticación del usuario.'
    });
  }
};