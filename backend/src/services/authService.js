import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../config/supabase.js';
import { hashPassword, comparePassword, generateToken } from '../utils/authUtils.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Registra un nuevo usuario en la base de datos
 */
export const registerService = async ({ nombre, email, password }) => {
  // 1. Verificar si el usuario ya existe
  const { data: existingUser } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new Error('El correo electrónico ya está registrado.');
  }

  // 2. Encriptar contraseña
  const hashedPassword = await hashPassword(password);

  // 3. Guardar usuario en Supabase
  const { data: newUser, error } = await supabase
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

  // 4. Generar token de acceso inmediato
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    rol: newUser.rol
  });

  return { user: newUser, token };
};

/**
 * Autentica un usuario existente y entrega un Token JWT
 */
export const loginService = async ({ email, password }) => {
  // 1. Buscar usuario por email
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !user) {
    throw new Error('Credenciales inválidas.');
  }

  // 2. Comparar la contraseña enviada con el hash guardado
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas.');
  }

  // 3. Generar token JWT
  const token = generateToken({
    id: user.id,
    email: user.email,
    rol: user.rol
  });

  // Retornar información pública del usuario (excluyendo el hash)
  const userData = {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    created_at: user.created_at
  };

  return { user: userData, token };
};
export const googleLoginService = async (idToken) => {
  // 1. Verificar la validez del token directo con Google
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, sub: googleId } = payload;

  if (!email) {
    throw new Error('No se pudo obtener el correo electrónico desde Google.');
  }

  // 2. Buscar si el usuario ya existe en Supabase
  let { data: user } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, created_at')
    .eq('email', email)
    .maybeSingle();

  // 3. Si no existe, lo creamos automáticamente
  if (!user) {
    const { data: newUser, error } = await supabase
      .from('usuarios')
      .insert([
        {
          nombre: name || 'Usuario de Google',
          email: email,
          // Guardamos una marca para diferenciar usuarios creados con Google
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

  // 4. Generar TU PROPIO Token JWT para el ecosistema de la app
  const token = generateToken({
    id: user.id,
    email: user.email,
    rol: user.rol
  });

  return { user, token };
};