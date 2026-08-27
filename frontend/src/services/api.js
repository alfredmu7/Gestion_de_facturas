// Detecta si la aplicación está compilada para producción
const isProduction = import.meta.env.PROD;

// URL directa apuntando a Render (elimina cualquier ambigüedad de Vite en Netlify)
const BASE_URL = isProduction 
  ? 'https://gestion-de-facturas.onrender.com/api' 
  : 'http://localhost:4000/api';

/**
 * Función helper genérica para realizar peticiones HTTP con Fetch API
 * @param {string} endpoint - La ruta a la que llamaremos (ej: '/health' o '/invoices')
 * @param {object} options - Opciones de la petición (method, headers, body, etc.)
 */
export const fetchAPI = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // 1. Obtener token del localStorage si existe
  const token = localStorage.getItem('token');

  // 2. Preparar encabezados
  const headers = {
    ...options.headers,
  };

  // Si enviamos JSON y no es FormData, aseguramos Content-Type
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Adjuntamos el Token JWT automáticamente en peticiones autenticadas
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Configuración de la petición
  const config = {
    method: options.method || 'GET',
    headers,
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // Si el servidor retorna 401 (No autorizado) o 403 (Prohibido/Token expirado)
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    // Verificamos si la respuesta fue exitosa (status 200-299)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Error HTTP: ${response.status}`);
    }

    // Retornamos la respuesta parseada a JSON
    return await response.json();
  } catch (error) {
    console.error(`Error en la petición a ${endpoint}:`, error);
    throw error;
  }
};

/* ==========================================
   METODOS DE AUTENTICACION
   ========================================== */

export const loginUser = async (email, password) => {
  return await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (nombre, email, password) => {
  return await fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  });
};

export const googleLoginUser = async (idToken) => {
  return await fetchAPI('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
};

export const getMe = async () => {
  return await fetchAPI('/auth/me');
};

/* ==========================================
   METODOS DE FACTURAS
   ========================================== */

export const getInvoiceHistory = async () => {
  return await fetchAPI('/invoices/history');
};

export const deleteInvoice = async (invoiceId) => {
  return await fetchAPI(`/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
};

export const uploadInvoice = async (file) => {
  const formData = new FormData();
  formData.append('factura', file);

  return await fetchAPI('/invoices/upload', {
    method: 'POST',
    body: formData,
  });
};

export const resolveInvoiceReview = async (invoiceId, userMessage, chatHistory = []) => {
  return await fetchAPI('/invoices/resolve-review', {
    method: 'POST',
    body: JSON.stringify({
      invoiceId,
      userMessage,
      chatHistory,
    }),
  });
};

/* ==========================================
   METODOS DE WHATSAPP
   ========================================== */

export const getWhatsAppStatus = async () => {
  return await fetchAPI('/whatsapp/status');
};

export const connectWhatsApp = async () => {
  return await fetchAPI('/whatsapp/connect', {
    method: 'POST',
  });
};

export const disconnectWhatsApp = async () => {
  return await fetchAPI('/whatsapp/disconnect', {
    method: 'POST',
  });
};