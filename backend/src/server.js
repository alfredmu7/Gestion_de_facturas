import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoiceRoutes from './routes/invoiceRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import { initWhatsApp } from './services/whatsappService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/invoices', invoiceRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Ruta de salud / prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor contable con IA activo' });
});

// Iniciar servidor y cliente de WhatsApp
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo exitosamente en el puerto ${PORT}`);
  console.log('🔄 Inicializando servicio de WhatsApp...');
  await initWhatsApp();
});
// Habilitar CORS para permitir peticiones desde Netlify
app.use(cors({
  origin: '*', // O coloca la URL exacta de Netlify: 'https://gestor-facturas.netlify.app'
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));