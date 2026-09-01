// Archivo: src/config/supabaseClient.js [FRONTEND]
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Error crítico: Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env del frontend.');
}

// Cliente público para autenticación y sesiones de usuario en React
export const supabase = createClient(supabaseUrl, supabaseAnonKey);