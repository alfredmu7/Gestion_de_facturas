import makeWASocket, { 
  useMultiFileAuthState, 
  downloadMediaMessage, 
  DisconnectReason,
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pino from 'pino';
import { processAndClassifyInvoice } from '../agents/classifierAgent.js';
import { runAuditAgent } from '../agents/auditAgent.js';
import { 
  saveInvoiceToDatabase, 
  getHistoricalInvoices, 
  resolveReviewService 
} from './invoiceService.js';
import { supabase } from '../config/supabase.js';

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
      logger: pino({ level: 'silent' }),
      syncFullHistory: false,
      generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // 📲 Solo generamos la Data URL para que la interfaz web / frontend renderice la imagen
      if (qr) {
        currentQR = await QRCode.toDataURL(qr);
        isConnected = false;
        connectedNumber = null;
        console.log('📲 [WhatsApp] Código QR generado y listo para la interfaz web.');
      }

      if (connection === 'open') {
        isConnected = true;
        currentQR = null; // Limpiar QR
        const rawJid = sock.user?.id || '';
        const phoneNumber = rawJid.split(':')[0].split('@')[0];
        connectedNumber = phoneNumber ? `+${phoneNumber}` : null;
        console.log(`✅ [WhatsApp] Vinculado exitosamente al número ${connectedNumber}`);
      }

      if (connection === 'close') {
        isConnected = false;
        connectedNumber = null;
        currentQR = null;
        
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        
        console.log(`⚠️ [WhatsApp] Conexión cerrada. Motivo status: ${statusCode}`);

        if (isLoggedOut) {
          console.log('🛑 [WhatsApp] Credenciales caducadas o sesión cerrada. Limpiando carpeta de autenticación...');
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
          console.log('🔄 Reintentando inicialización para generar un nuevo QR...');
          setTimeout(() => initWhatsApp(), 2000);
        } else {
          setTimeout(() => initWhatsApp(), 3000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        const senderJid = msg.key.remoteJid;

        // 1. FILTRO DE MENSAJES PROPIOS Y GRUPOS
        if (!senderJid || msg.key.fromMe || senderJid.endsWith('@g.us') || senderJid.endsWith('@broadcast')) {
          continue;
        }

        const messageType = Object.keys(msg.message || {})[0];

        // 2. CASO A: INGESTIÓN DE IMAGEN DE FACTURA
        if (messageType === 'imageMessage') {
          console.log(`📩 Foto de factura recibida en chat privado de: ${senderJid}`);

          try {
            await sock.sendMessage(senderJid, { 
              text: '⏳ *Factura recibida.* Procesando e interpretando datos con el Agente de IA...' 
            }, { quoted: msg });

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
              }, { quoted: msg });
              
              continue;
            }

            await saveInvoiceToDatabase(
              extractedData,
              auditResult,
              imageBuffer,
              mimeType
            );

            let responseMsg = `✅ *FACTURA REGISTRADA EXITOSAMENTE*\n\n` +
                              `🏢 *Proveedor:* ${extractedData.proveedor}\n` +
                              `📅 *Fecha:* ${extractedData.fecha_emision}\n` +
                              `🏷️ *Categoría:* ${extractedData.categoria}\n` +
                              `💵 *Total:* $${extractedData.monto_total?.toLocaleString('es-CO')}\n` +
                              `📌 *Estado Auditoría:* ${auditResult.estado_auditoria}`;

            if (auditResult.estado_auditoria === 'REQUIERE_REVISION') {
              responseMsg += `\n\n⚠️ *ACLARACIÓN REQUERIDA:* Por favor responde a este mensaje indicando los datos faltantes (ej: NIT o nombre del local) para actualizar el registro.`;
            }

            await sock.sendMessage(senderJid, { text: responseMsg }, { quoted: msg });

          } catch (err) {
            console.error('Error procesando factura desde WhatsApp:', err);
            await sock.sendMessage(senderJid, { 
              text: `❌ *Error al procesar la factura:* ${err.message || 'No se pudo leer la imagen.'}` 
            }, { quoted: msg });
          }
        }

        // 3. CASO B: RESPUESTA DE TEXTO / ACLARACIÓN (AGENTE 3)
        else if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
          const userText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

          if (!userText || userText.trim().length === 0) continue;

          try {
            const { data: pendingInvoice } = await supabase
              .from('facturas')
              .select('id')
              .eq('estado_auditoria', 'REQUIERE_REVISION')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pendingInvoice) {
              console.log(`🤖 AGENTE 3 (WHATSAPP): Procesando aclaración para factura ${pendingInvoice.id}`);
              
              await sock.sendMessage(senderJid, { text: '⏳ Procesando tu aclaración con la IA...' }, { quoted: msg });

              const { resolution, updatedInvoice } = await resolveReviewService(
                pendingInvoice.id,
                userText,
                []
              );

              const replyText = resolution.respuesta_usuario || resolution.explicacion_resolucion;

              await sock.sendMessage(senderJid, {
                text: `💬 *RESPUESTA DE MEDIACIÓN*\n\n${replyText}\n\n📌 *Estado:* ${updatedInvoice.estado_auditoria}`
              }, { quoted: msg });
            }
          } catch (err) {
            console.error('Error procesando aclaración en WhatsApp:', err);
          }
        }
      }
    });

  } catch (error) {
    console.error('Error inicializando el servicio de WhatsApp:', error);
  }
}

export async function logoutWhatsApp() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock.ev.removeAllListeners();
      sock.end();
      sock = null;
    }

    isConnected = false;
    connectedNumber = null;
    currentQR = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log('🗑️ Credenciales de WhatsApp eliminadas correctamente.');
    }

    setTimeout(() => {
      initWhatsApp();
    }, 1000);

    return true;
  } catch (error) {
    console.error('Error al desvincular WhatsApp:', error);
    throw error;
  }
}

export const getWhatsAppStatus = () => {
  return {
    connected: isConnected,
    number: connectedNumber,
    qr: currentQR
  };
};