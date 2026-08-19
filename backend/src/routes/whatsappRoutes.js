import { Router } from 'express';
import { getWhatsAppStatus, initWhatsApp } from '../services/whatsappService.js';

const router = Router();

/**
 * GET /api/whatsapp/status
 * Retorna si la sesión está conectada y la imagen del código QR (Base64) si requiere vinculación.
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
 * POST /api/whatsapp/restart
 * Permite reiniciar el socket de WhatsApp para volver a generar un QR.
 */
router.post('/restart', async (req, res) => {
  try {
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

export default router;