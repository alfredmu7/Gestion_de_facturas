import { Router } from 'express';
import { getWhatsAppStatus, initWhatsApp, stopWhatsApp } from '../services/whatsappService.js';

const router = Router();

/**
 * GET /api/whatsapp/status
 * Retorna si la sesión está conectada, el número y la imagen del código QR (Base64).
 */
router.get('/status', (req, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el estado de WhatsApp',
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/connect
 * Inicia la conexión y generación de QR bajo demanda del usuario.
 */
router.post('/connect', async (req, res) => {
  try {
    await initWhatsApp();
    res.json({
      success: true,
      message: 'Iniciando generación de QR...'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al iniciar el servicio de WhatsApp',
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/restart
 * Permite reiniciar el socket de WhatsApp.
 */
router.post('/restart', async (req, res) => {
  try {
    await stopWhatsApp();
    await initWhatsApp();
    res.json({
      success: true,
      message: 'Servicio de WhatsApp reiniciado.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al reiniciar WhatsApp',
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/disconnect
 * Detiene el servicio de WhatsApp, elimina las credenciales y detiene reintentos.
 */
router.post('/disconnect', async (req, res) => {
  try {
    await stopWhatsApp();
    res.json({
      success: true,
      message: 'Servicio de WhatsApp detenido exitosamente.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al detener el servicio de WhatsApp',
      error: error.message
    });
  }
});

export default router;