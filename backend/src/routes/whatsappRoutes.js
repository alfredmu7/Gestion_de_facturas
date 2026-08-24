import { Router } from 'express';
import { getWhatsAppStatus, initWhatsApp, logoutWhatsApp } from '../services/whatsappService.js';

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
 * POST /api/whatsapp/restart
 * Permite reiniciar el socket de WhatsApp.
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

/**
 * POST /api/whatsapp/disconnect
 * Desvincula el número actual, elimina las credenciales en sesión y solicita un nuevo QR.
 */
router.post('/disconnect', async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({
      success: true,
      message: 'Sesión de WhatsApp desvinculada exitosamente.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desvincular el dispositivo de WhatsApp',
      error: error.message
    });
  }
});

export default router;