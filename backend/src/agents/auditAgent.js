import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Inicializamos el cliente oficial de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agente Autónomo Auditor de Facturas.
 * Revisa que la foto y los valores de la factura coincidan para un usuario común.
 */
export const runAuditAgent = async (extractedInvoiceData, historicalInvoices = []) => {
  try {
    const systemPrompt = `
      Eres un asistente experto en revisar facturas para personas comunes que usan una app móvil o WhatsApp.

      REGLAS DE REVISIÓN:
      1. Revisa si los precios de los ítems suman el monto total.
      2. Revisa si falta el nombre del negocio (proveedor) o el NIT/RUT.
      3. Revisa si la factura ya existe en el historial (duplicada).

      REGLAS STRICTAS PARA REDACTAR 'observaciones_auditor':
      1. PROHIBIDO USAR JERGA TÉCNICA O CONTABLE. Queda estrictamente prohibido usar términos como:
         - "Integridad matemática", "Desfase", "Validación fiscal/legal", "Imputación contable", "Criterio de auditoría", "Monto reportado".
      2. MENCIONA ÚNICAMENTE LO QUE ESTÁ MAL O LO QUE FALTA.
         - JAMÁS digas "la suma es correcta", "los totales coinciden" o "la integridad es válida". Si algo está bien, NO SE MENCIONA.
      3. HABLA EN ESPAÑOL SIMPLE Y COTIDIANO.
         Ejemplos de cómo redactar:
         - BIEN: "No se ve el nombre del local ni el NIT en la foto."
         - BIEN: "La suma de los productos da $300.000, pero el total dice $350.000."
         - BIEN: "Hay un cobro de 'Servicio Sugerido' de $32.750 que requiere confirmación."
         - MAL: "La integridad matemática es correcta: la suma coincide..."
         - MAL: "El proveedor y el NIT no han sido identificados para validación fiscal..."

      REGLAS DE DECISIÓN (estado_auditoria):
      - "APROBADA": Si todo está completo y los valores suman perfecto.
      - "REQUIERE_REVISION": Si falta algún dato (como NIT/Proveedor) o hay cobros dudosos.
      - "RECHAZADA": Si la factura está repetida o los números están completamente mal.

      REGLAS DE SALIDA: Responde ÚNICAMENTE en JSON con el esquema solicitado.
    `;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        estado_auditoria: { 
          type: SchemaType.STRING, 
          enum: ["APROBADA", "REQUIERE_REVISION", "RECHAZADA"] 
        },
        puntuacion_confianza: { type: SchemaType.NUMBER, description: "De 0.0 a 1.0" },
        cuadre_matematico: { type: SchemaType.BOOLEAN },
        es_duplicada: { type: SchemaType.BOOLEAN },
        observaciones_auditor: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING },
          description: "Lista de errores o datos faltantes redactados en lenguaje extremadamente simple y cotidiano. PROHIBIDO poner aspectos positivos." 
        },
        accion_sugerida: { type: SchemaType.STRING }
      },
      required: ["estado_auditoria", "cuadre_matematico", "es_duplicada", "observaciones_auditor", "accion_sugerida"]
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const promptText = `
      Datos extraídos de la factura actual:
      ${JSON.stringify(extractedInvoiceData, null, 2)}

      Historial de facturas previas para detectar duplicados:
      ${JSON.stringify(historicalInvoices, null, 2)}
    `;

    const result = await model.generateContent([promptText]);
    const responseText = result.response.text();

    return JSON.parse(responseText);

  } catch (error) {
    console.error('Error dentro del Agente Auditor:', error);
    throw new Error('El Agente Auditor no pudo completar la evaluación autónoma.');
  }
};