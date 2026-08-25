import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoiceRoutes from './routes/invoiceRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import { initWhatsApp } from './services/whatsappService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de CORS única y al inicio
app.use(cors({
  origin: '*', // Permite peticiones desde Netlify u otros orígenes
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rutas principales
app.use('/api/invoices', invoiceRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Ruta de salud / prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor contable con IA activo' });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo exitosamente en el puerto ${PORT}`);
  
  // Inicializar WhatsApp de forma segura
  try {
    console.log('🔄 Inicializando servicio de WhatsApp...');
    await initWhatsApp();
  } catch (error) {
    console.error('⚠️ Error iniciando servicio de WhatsApp:', error.message);
  }
});