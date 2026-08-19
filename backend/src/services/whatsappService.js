import makeWASocket, { 
  useMultiFileAuthState, 
  downloadMediaMessage, 
  DisconnectReason,
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino'; // 👈 IMPORTANTE: Añadir pino
import { processAndClassifyInvoice } from '../agents/classifierAgent.js';
import { runAuditAgent } from '../agents/auditAgent.js';
import { saveInvoiceToDatabase, getHistoricalInvoices } from './invoiceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../../baileys_auth_info');

let sock = null;
let currentQR = null;
let isConnected = false;
let connectedNumber = null;

export async function initWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }), // 👈 Silenciar logs internos de libsignal para evitar congelamiento
      printQRInTerminal: false,
      syncFullHistory: false, // 👈 Evitar la sincronización masiva de historial que rompe las llaves
      generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = await QRCode.toDataURL(qr);
        isConnected = false;
        connectedNumber = null;
        console.log('📲 Nuevo código QR generado.');
      }

      if (connection === 'open') {
        isConnected = true;
        currentQR = null;
        const rawJid = sock.user?.id || '';
        const phoneNumber = rawJid.split(':')[0].split('@')[0];
        connectedNumber = phoneNumber ? `+${phoneNumber}` : null;
        console.log(`✅ WhatsApp vinculado al número ${connectedNumber} y listo para recibir facturas.`);
      }

      if (connection === 'close') {
        isConnected = false;
        connectedNumber = null;
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          setTimeout(() => initWhatsApp(), 3000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        // PERMITIR MENSAJES DE MÍ MISMO
        // Ignorar únicamente si el mensaje fue enviado por el propio bot como respuesta automática
        const messageType = Object.keys(msg.message || {})[0];

        if (messageType === 'imageMessage') {
          const senderJid = msg.key.remoteJid;
          console.log(`📩 Foto de factura recibida de: ${senderJid}`);

          try {
            await sock.sendMessage(senderJid, { 
              text: '⏳ *Factura recibida.* Procesando e interpretando datos con el Agente de IA...' 
            });

            const imageBuffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { reuploadRequest: sock.updateMediaMessage }
            );

            const mimeType = msg.message.imageMessage.mimetype || 'image/jpeg';

            console.log('🤖 AGENTE 1 (VISOR): Clasificando imagen...');
            const extractedData = await processAndClassifyInvoice(imageBuffer, mimeType);

            console.log('🤖 AGENTE 2 (AUDITOR): Verificando duplicados e integridad...');
            const historicalInvoices = await getHistoricalInvoices();
            const auditResult = await runAuditAgent(extractedData, historicalInvoices);

            if (auditResult.estado_auditoria === 'RECHAZADA') {
              const observaciones = Array.isArray(auditResult.observaciones_auditor) 
                ? auditResult.observaciones_auditor.join('\n- ') 
                : auditResult.observaciones_auditor;

              await sock.sendMessage(senderJid, {
                text: `⛔ *FACTURA RECHAZADA*\n\n` +
                      `*Proveedor:* ${extractedData.proveedor || 'No identificado'}\n` +
                      `*Motivo:* ${observaciones}\n` +
                      `*Acción:* ${auditResult.accion_sugerida}`
              });
              continue;
            }

            await saveInvoiceToDatabase(
              extractedData,
              auditResult,
              imageBuffer,
              mimeType
            );

            await sock.sendMessage(senderJid, {
              text: `✅ *FACTURA REGISTRADA EXITOSAMENTE*\n\n` +
                    `🏢 *Proveedor:* ${extractedData.proveedor}\n` +
                    `📅 *Fecha:* ${extractedData.fecha_emision}\n` +
                    `🏷️ *Categoría:* ${extractedData.categoria}\n` +
                    `💵 *Total:* $${extractedData.monto_total?.toLocaleString('es-CO')}\n` +
                    `📌 *Estado Auditoría:* ${auditResult.estado_auditoria}`
            });

          } catch (err) {
            console.error('Error procesando factura desde WhatsApp:', err);
            await sock.sendMessage(senderJid, { 
              text: `❌ *Error al procesar la factura:* ${err.message || 'No se pudo leer la imagen.'}` 
            });
          }
        }
      }
    });

  } catch (error) {
    console.error('Error inicializando el servicio de WhatsApp:', error);
  }
}

export const getWhatsAppStatus = () => {
  return {
    connected: isConnected,
    number: connectedNumber,
    qr: currentQR
  };
};