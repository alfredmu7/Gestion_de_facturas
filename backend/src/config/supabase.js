import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// 📌 Prioriza SUPABASE_SERVICE_ROLE_KEY para ignorar RLS en el backend, con fallback a ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// Validar credenciales
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Error crítico: Falta SUPABASE_URL o las llaves de acceso en el archivo .env del backend.');
}

// Cliente de Supabase optimizado para Node.js / Backend
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});