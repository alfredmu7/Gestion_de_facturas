/**
 * Envía una aclaración/conversación para ajustar una factura en revisión (Agente 3 - Mediador)
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