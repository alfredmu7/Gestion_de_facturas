// Detecta si la aplicación está compilada para producción
const isProduction = import.meta.env.PROD;

// URL directa apuntando a Render (elimina cualquier ambigüedad de Vite en Netlify)
const BASE_URL = 'https://gestion-de-facturas.onrender.com/api';
/**
 * Función helper genérica para realizar peticiones HTTP con Fetch API
 * @param {string} endpoint - La ruta a la que llamaremos (ej: '/health' o '/invoices')
 * @param {object} options - Opciones de la petición (method, headers, body, etc.)
 */
export const fetchAPI = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // Configuración por defecto
  const config = {
    method: options.method || 'GET',
    headers: options.headers || {},
    ...options,
  };

  try {
    const response = await fetch(url, config);

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

/**
 * Obtiene el historial completo de facturas desde PostgreSQL/Supabase
 */
export const getInvoiceHistory = async () => {
  return await fetchAPI('/invoices/history');
};

/**
 * Obtiene el estado actual del bot de WhatsApp
 */
export const getWhatsAppStatus = async () => {
  return await fetchAPI('/invoices/whatsapp-status');
};

/**
 * Sube una nueva factura (Imagen o PDF) para procesamiento (Agentes 1 y 2)
 * @param {File} file - Archivo seleccionado en el input de React
 */
export const uploadInvoice = async (file) => {
  const formData = new FormData();
  formData.append('factura', file);

  return await fetchAPI('/invoices/upload', {
    method: 'POST',
    body: formData,
    // Nota: No pasamos 'Content-Type' en headers para que el navegador configure automáticamente el boundary de FormData
  });
};

/**
 * Envia una aclaración/conversación para ajustar una factura en revisión (Agente 3 - Mediador)
 * @param {string} invoiceId - ID de la factura a ajustar
 * @param {string} userMessage - Mensaje o aclaración del usuario
 * @param {Array} chatHistory - Historial previo de la conversación en la sesión
 */
export const resolveInvoiceReview = async (invoiceId, userMessage, chatHistory = []) => {
  return await fetchAPI('/invoices/resolve-review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      invoiceId,
      userMessage,
      chatHistory,
    }),
  });
};