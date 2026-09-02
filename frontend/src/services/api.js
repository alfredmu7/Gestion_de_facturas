// Archivo: src/services/api.js [FRONTEND]
import { supabase } from '../config/supabaseClient.js';

const isProduction = import.meta.env.PROD;

const BASE_URL = isProduction 
  ? 'https://gestion-de-facturas.onrender.com/api' 
  : 'http://localhost:4000/api';

/**
 * Helper genérico para peticiones HTTP a la API protegida con Supabase JWT
 */
export const fetchAPI = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // 1. Obtener la sesión (Supabase auto-refresca si el refresh_token es válido)
  let { data: { session } } = await supabase.auth.getSession();
  
  // Si la sesión expiró o está por expirar, refrescar explícitamente
  if (!session) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    session = refreshData?.session || null;
  }

  const token = session?.access_token;

  // 2. Construir Headers
  const { headers: customHeaders, ...restOptions } = options;

  const headers = {
    ...customHeaders,
  };

  // Asignar Content-Type solo si no es FormData y no fue definido previamente
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Adjuntar el token de la sesión de Supabase si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: 'GET',
    ...restOptions,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // 3. Manejo de token invalidad formalmente por el servidor backend
    if (response.status === 401 || response.status === 403) {
      console.warn('⚠️ Sesión expirada o no autorizada. Cerrando sesión...');
      await supabase.auth.signOut();
      
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
      throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Error HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error en la petición a ${endpoint}:`, error);
    throw error;
  }
};

/* ==========================================
   MÉTODOS DE FACTURAS
   ========================================== */

export const getInvoiceHistory = () => fetchAPI('/invoices/history');

export const deleteInvoice = (invoiceId) => 
  fetchAPI(`/invoices/${invoiceId}`, {
    method: 'DELETE',
  });

export const uploadInvoice = (file) => {
  const formData = new FormData();
  formData.append('factura', file);

  return fetchAPI('/invoices/upload', {
    method: 'POST',
    body: formData,
  });
};

export const resolveInvoiceReview = (invoiceId, userMessage, chatHistory = []) => 
  fetchAPI('/invoices/resolve-review', {
    method: 'POST',
    body: JSON.stringify({
      invoiceId,
      userMessage,
      chatHistory,
    }),
  });

/* ==========================================
   MÉTODOS DE WHATSAPP
   ========================================== */

export const getWhatsAppStatus = () => fetchAPI('/whatsapp/status');

export const connectWhatsApp = () => 
  fetchAPI('/whatsapp/connect', {
    method: 'POST',
  });

export const disconnectWhatsApp = () => 
  fetchAPI('/whatsapp/disconnect', {
    method: 'POST',
  });