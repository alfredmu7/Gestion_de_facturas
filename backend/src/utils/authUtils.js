import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Encripta una contraseña en texto plano
 * @param {string} password - Contraseña ingresada por el usuario
 * @returns {Promise<string>} Contraseña encriptada (hash)
 */
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compara una contraseña en texto plano con un hash almacenado
 * @param {string} password - Contraseña enviada en el login
 * @param {string} hashedPassword - Hash guardado en la base de datos
 * @returns {Promise<boolean>} True si coinciden, False si no
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Genera un Token JWT de autenticación para el usuario
 * @param {object} payload - Datos públicos del usuario a incluir en el token (id, email, rol)
 * @returns {string} Token JWT firmado
 */
export const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno.');
  }

  // El token expira en 7 días
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

/**
 * Verifica y decodifica un Token JWT
 * @param {string} token - Token enviado en los headers HTTP
 * @returns {object} Payload decodificado si es válido
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};