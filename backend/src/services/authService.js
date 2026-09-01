import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { hashPassword, comparePassword, generateToken } from '../utils/authUtils.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Obtener perfil de usuario por ID (Utilizado por getMe)
 */
export const getUserByIdService = async (userId) => {
  const { data: user, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, email, rol, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    throw new Error('Usuario no encontrado.');
  }

  return user;
};

/**
 * Registra un nuevo usuario
 */
export const registerService = async ({ nombre, email, password }) => {
  const { data: existingUser } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new Error('El correo electrónico ya está registrado.');
  }

  const hashedPassword = await hashPassword(password);

  const { data: newUser, error } = await supabaseAdmin
    .from('usuarios')
    .insert([
      {
        nombre,
        email,
        password_hash: hashedPassword,
        rol: 'usuario'
      }
    ])
    .select('id, nombre, email, rol, created_at')
    .single();

  if (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    rol: newUser.rol
  });

  return { user: newUser, token };
};

/**
 * Autenticación tradicional
 */
export const loginService = async ({ email, password }) => {
  const { data: user, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !user) {
    throw new Error('Credenciales inválidas.');
  }

  // Prevenir login con contraseña en cuentas asociadas solo a Google
  if (user.password_hash && user.password_hash.startsWith('GOOGLE_AUTH_')) {
    throw new Error('Esta cuenta utiliza inicio de sesión con Google.');
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas.');
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    rol: user.rol
  });

  const userData = {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    created_at: user.created_at
  };

  return { user: userData, token };
};

/**
 * Autenticación vía Google
 */
export const googleLoginService = async (idToken) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, sub: googleId } = payload;

  if (!email) {
    throw new Error('No se pudo obtener el correo electrónico desde Google.');
  }

  let { data: user } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, email, rol, created_at')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    const { data: newUser, error } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          nombre: name || 'Usuario de Google',
          email: email,
          password_hash: `GOOGLE_AUTH_${googleId}`,
          rol: 'usuario'
        }
      ])
      .select('id, nombre, email, rol, created_at')
      .single();

    if (error) {
      throw new Error(`Error al registrar usuario de Google: ${error.message}`);
    }

    user = newUser;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    rol: user.rol
  });

  return { user, token };
};