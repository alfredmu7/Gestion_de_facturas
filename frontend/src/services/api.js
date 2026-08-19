// URL base de nuestro backend en Node.js
const BASE_URL = 'http://localhost:4000/api';

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
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }

    // Retornamos la respuesta parseada a JSON
    return await response.json();
  } catch (error) {
    console.error(`Error en la petición a ${endpoint}:`, error);
    throw error;
  }
};