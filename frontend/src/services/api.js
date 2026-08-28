const isProduction = import.meta.env.PROD;

const BASE_URL = isProduction 
  ? 'https://gestion-de-facturas.onrender.com/api' 
  : 'http://localhost:4000/api';

/**
 * Helper genérico para peticiones HTTP
 */
export const fetchAPI = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');

  // Separar customHeaders y restOptions para evitar sobreescrituras no deseadas
  const { headers: customHeaders, ...restOptions } = options;

  const headers = {
    ...customHeaders,
  };

  // Asignar Content-Type solo si no es FormData y no fue definido previamente
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Adjuntar token si existe
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

    // Manejo de token expirado / no autorizado
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Forzar recarga o redirección si la aplicación está en producción/navegador
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Error HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error en la petición a ${endpoint}:`, error);
    throw error;
  }
};

/* ==========================================
   MÉTODOS DE AUTENTICACIÓN
   ========================================== */

export const loginUser = (email, password) => 
  fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const registerUser = (nombre, email, password) => 
  fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  });

export const googleLoginUser = (idToken) => 
  fetchAPI('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

export const getMe = () => fetchAPI('/auth/me');

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