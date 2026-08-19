import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargo mis variables de entorno para obtener las llaves de acceso
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Valido que las credenciales existan en mi archivo .env
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Me falta configurar SUPABASE_URL o SUPABASE_KEY en mi archivo .env');
}

// Inicializo y exporto mi cliente de Supabase para consultar mi DB y Storage
export const supabase = createClient(supabaseUrl, supabaseKey);