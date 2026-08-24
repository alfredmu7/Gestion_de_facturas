import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const runReviewResolverAgent = async ({ invoiceData, auditObservations, userMessage, chatHistory = [] }) => {
  console.log(`🤖 AGENTE 3: Evaluando respuesta para factura ${invoiceData.id}...`);

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' }); // O el modelo que estés usando

  const prompt = `
  Eres el Agente Mediador de Facturas y Ajustes.
  
  DATOS DE LA FACTURA ACTUAL EN BASE DE DATOS:
  ${JSON.stringify(invoiceData, null, 2)}

  OBSERVACIONES DE AUDITORÍA:
  ${JSON.stringify(auditObservations)}

  HISTORIAL PREVIO DEL CHAT:
  ${JSON.stringify(chatHistory)}

  NUEVA RESPUESTA DEL USUARIO:
  "${userMessage}"

  INSTRUCCIONES DE PROCESAMIENTO:
  1. Revisa si el usuario aclara lo solicitado (ej. si entrega el NIT, corrige el nombre del local o aclara montos).
  2. PROPINA O CARGOS ADICIONALES: Si el usuario menciona que hay una propina, valor voluntario o servicio adicional (ejemplo: "agrega 15000 de propina", "incluye 10.000 de propina"):
     - Extrae ÚNICAMENTE el valor numérico en el campo "propina".
     - NO sumes la propina al "monto_total". Mantén el "monto_total" exactamente igual al valor fiscal original de la factura.
  3. Si la aclaración o el ajuste es válido, aprueba la factura ("nuevo_estado_auditoria": "APROBADA"). Si ya estaba aprobada y es un ajuste menor, mantén el estado "APROBADA".
  4. Si falta información o el mensaje no es claro, mantén "nuevo_estado_auditoria": "REQUIERE_REVISION" y pide lo que falta.

  RESPONDE ÚNICAMENTE EN ESTE FORMATO JSON (Sin formato Markdown \`\`\`json):
  {
    "se_resolvio": true,
    "nuevo_estado_auditoria": "APROBADA",
    "explicacion_resolucion": "Se registró la propina de $15.000 y se mantuvo el monto total fiscal de la factura.",
    "respuesta_usuario": "Entendido. He registrado $15.000 de propina en la casilla correspondiente.",
    "factura_actualizada": {
      "proveedor": "${invoiceData.proveedor || ''}",
      "nit_rut": "${invoiceData.nit_rut || ''}",
      "monto_total": ${invoiceData.monto_total || 0},
      "propina": 15000
    }
  }
  `;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  // Limpiar envoltorios en caso de que el modelo devuelva bloques de código
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  return JSON.parse(text);
};