import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Inicializamos el cliente oficial de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agente especializado en analizar imágenes/PDFs de facturas.
 * Recibe el buffer del archivo y su tipo MIME (image/jpeg, application/pdf, etc.)
 */
export const processAndClassifyInvoice = async (imageBuffer, mimeType) => {
  try {
    // 1. Convertir el buffer a base64
    const imageBase64 = imageBuffer.toString('base64');

    // 2. Definir la instrucción del sistema
    const systemPrompt = `
      Eres un agente experto en extracción contable y lectura OCR de facturas.
      Tu única tarea es analizar el documento o foto de la factura recibida y devolver un objeto JSON estricto.

      Reglas de Clasificación (categoria):
      - "INVENTARIO": Productos comprados para reventa directa (bebidas, comida, etc).
      - "GASTO_OPERATIVO": Servicios públicos, arriendo, mantenimiento, internet.
      - "INSUMOS": Empaques, bolsas, servilletas, desechables.
      - "ACTIVO_FIJO": Maquinaria, vitrinas, congeladores, muebles.
      - "OTROS": Gastos menores no categorizados.
    `;

    // 3. Especificar el esquema JSON exacto
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        proveedor: { type: SchemaType.STRING },
        nit_rut: { type: SchemaType.STRING },
        numero_factura: { type: SchemaType.STRING },
        fecha_emision: { type: SchemaType.STRING, description: "Formato YYYY-MM-DD" },
        categoria: { 
          type: SchemaType.STRING, 
          enum: ["INVENTARIO", "GASTO_OPERATIVO", "INSUMOS", "ACTIVO_FIJO", "OTROS"] 
        },
        total_impuestos: { type: SchemaType.NUMBER },
        monto_total: { type: SchemaType.NUMBER },
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              descripcion: { type: SchemaType.STRING },
              cantidad: { type: SchemaType.NUMBER },
              precio_unitario: { type: SchemaType.NUMBER },
              precio_total: { type: SchemaType.NUMBER }
            },
            required: ["descripcion", "cantidad", "precio_unitario", "precio_total"]
          }
        }
      },
      required: ["proveedor", "fecha_emision", "categoria", "monto_total", "items"]
    };

    // 4. Obtener el modelo Gemini Flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    // 5. Estructurar el contenido con el archivo en base64
    const filePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    };


const result = await model.generateContent([
  filePart,
  "Lee los datos de la factura. Si una descripción no es clara, pon un texto simple y legible, evita términos crudos de OCR."
]);

    const responseText = result.response.text();

    // 6. Parsear el resultado
    const parsedResult = JSON.parse(responseText);
    return parsedResult;

  } catch (error) {
    console.error('Error dentro de classifierAgent:', error);
    throw new Error(`Error en el agente de clasificación: ${error.message}`);
  }
};