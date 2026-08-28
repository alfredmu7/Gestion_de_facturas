import { registerService, loginService, googleLoginService, getUserByIdService } from '../services/authService.js';

/**
 * Registrar un nuevo usuario
 */
export const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporciona nombre, email y contraseña.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    const data = await registerService({ nombre, email, password });

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error en el registro de usuario.'
    });
  }
};

/**
 * Inicio de sesión tradicional
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporciona email y contraseña.'
      });
    }

    const data = await loginService({ email, password });

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Credenciales inválidas.'
    });
  }
};

/**
 * Obtener perfil del usuario autenticado (corregido para obtener datos reales desde DB)
 */
export const getMe = async (req, res) => {
  try {
    // req.user viene del middleware de autenticación con la propiedad id
    const user = await getUserByIdService(req.user.id);

    return res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Sesión no válida o usuario inexistente.'
    });
  }
};

/**
 * Login / Registro con Google
 */
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó el token de Google.'
      });
    }

    const data = await googleLoginService(idToken);

    return res.json({
      success: true,
      message: 'Inicio de sesión con Google exitoso.',
      data
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Error al autenticar con Google.'
    });
  }
};