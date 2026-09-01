// Archivo: src/server.js [BACKEND]
import 'dotenv/config'; // 👈 OBLIGATORIO: Primera línea absoluta

import express from 'express';
import cors from 'cors';
import invoiceRoutes from './routes/invoiceRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de CORS
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Ruta de salud / prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor contable con IA activo' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo exitosamente en el puerto ${PORT}`);
  console.log('ℹ️ El servicio de WhatsApp se iniciará bajo demanda desde el frontend.');
});