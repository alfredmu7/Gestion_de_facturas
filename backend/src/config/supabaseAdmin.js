// Archivo: src/config/supabaseAdmin.js [BACKEND]
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRÍTICO: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env');
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseServiceKey || 'placeholder-key', 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// ✅ Alias exportado para mantener compatibilidad con imports viejos:
export const supabase = supabaseAdmin;