import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Inicializamos el cliente de Gemini usando la API Key de las variables de entorno
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });