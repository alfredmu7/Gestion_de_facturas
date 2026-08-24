export const resolveInvoiceReview = async (invoiceId, userMessage, chatHistory = []) => {
  const response = await fetch('http://localhost:3000/api/invoices/resolve-review', {
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

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al enviar aclaración');
  return data;
};