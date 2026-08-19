import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Inicializamos el cliente oficial de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agente Autónomo Auditor de Facturas.
 * Analiza la coherencia contable, integridad matemática y riesgos de fraude.
 */
export const runAuditAgent = async (extractedInvoiceData, historicalInvoices = []) => {
  try {
    const systemPrompt = `
      Eres el AGENTE AUDITOR CONTABLE AUTÓNOMO de la plataforma.
      Tu misión es actuar como un auditor senior con amplio criterio para evaluar la validez contable de una factura extraída.

      EVALÚA Y RAZONA LO SIGUIENTE:
      1. INTEGRIDAD MATEMÁTICA: Recalcula: (Suma de precios_totales de los ítems) + total_impuestos. ¿Coincide con monto_total?
         - Si difiere por centavos (redondeo), acéptalo.
         - Si difiere significativamente, identifícalo como error.
      2. DUPLICIDAD Y RIESGO: Revisa si el numero_factura y proveedor coinciden con registros previos.
      3. EVALUACIÓN DE ESTADO: Decide de forma autónoma uno de estos estados:
         - "APROBADA": Toda la información cuadra y es coherente.
         - "REQUIERE_REVISION": Hay inconsistencias menores o discrepancia en impuestos.
         - "RECHAZADA": Factura duplicada, datos incoherentes o posible fraude.

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
          description: "Lista de razonamientos del auditor justificando la decisión." 
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