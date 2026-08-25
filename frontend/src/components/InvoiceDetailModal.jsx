import React, { useState } from 'react';
import { resolveInvoiceReview } from '../services/api'; 
import '../styles/InvoiceDetailModal.css'; 

export const InvoiceDetailModal = ({ invoice, onClose, onInvoiceUpdated }) => {
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(invoice.estado_auditoria);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim() || loading) return;

    const messageText = userMessage;
    setUserMessage('');
    setLoading(true);

    const newHistory = [...chatHistory, { sender: 'user', text: messageText }];
    setChatHistory(newHistory);

    try {
      // 1. Enviar aclaración o solicitud de ajuste al servidor (Agente 3) mediante api.js
      const response = await resolveInvoiceReview(currentInvoice.id, messageText, newHistory);
      
      // Adaptado para el retorno de fetchAPI (JSON directo sin Axios wrapper)
      const resolution = response.resolution || response.data?.resolution || {};
      const updatedData = response.updatedInvoice || response.data?.updatedInvoice || response.data;

      const newStatus = resolution.nuevo_estado_auditoria || response.nuevo_estado_auditoria || currentStatus || 'APROBADA';

      // 2. Añadir respuesta del Agente 3 al chat del modal
      setChatHistory([
        ...newHistory,
        { 
          sender: 'agent', 
          text: resolution.respuesta_usuario || resolution.explicacion_resolucion || response.message || 'Solicitud procesada correctamente.' 
        }
      ]);

      // 3. Actualizar el estado local si el backend devolvió el objeto guardado en Supabase
      if (updatedData) {
        setCurrentInvoice(updatedData);
        setCurrentStatus(updatedData.estado_auditoria || newStatus);

        // 4. Notificar a la tabla/lista principal ("Mis Facturas") para que se actualice la fila
        if (onInvoiceUpdated) {
          onInvoiceUpdated(updatedData);
        }
      } else {
        const fallbackInvoice = { ...currentInvoice, estado_auditoria: newStatus };
        setCurrentInvoice(fallbackInvoice);
        setCurrentStatus(newStatus);
        
        if (onInvoiceUpdated) {
          onInvoiceUpdated(fallbackInvoice);
        }
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setChatHistory([
        ...newHistory,
        { sender: 'agent', text: '⚠️ Hubo un error procesando tu respuesta. Por favor intenta de nuevo.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isRevision = currentStatus === 'REQUIERE_REVISION' || currentStatus === 'REVISION';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Detalles de la Factura</h3>

        <div className="invoice-info">
          <p><strong>Proveedor:</strong> {currentInvoice.proveedor || currentInvoice.nombre_proveedor || 'No detectado'}</p>
          <p><strong>NIT / RUT:</strong> {currentInvoice.nit_rut || 'No registrado'}</p>
          <p><strong>Número:</strong> {currentInvoice.numero_factura || currentInvoice.invoiceNumber || 'N/A'}</p>
          
          {/* Monto fiscal original de la factura */}
          <p><strong>Monto Total:</strong> ${Number(currentInvoice.monto_total ?? currentInvoice.totalAmount ?? 0).toLocaleString('es-CO')}</p>
          
          {/* Casilla independiente para Propina / Servicio */}
          {(Number(currentInvoice.propina) > 0 || currentInvoice.propina !== undefined) && (
            <p style={{ color: '#059669', fontWeight: '500' }}>
              <strong>Propina (Aparte):</strong> ${Number(currentInvoice.propina || 0).toLocaleString('es-CO')}
            </p>
          )}

          <p>
            <strong>Estado:</strong>{' '}
            <span className={`badge ${currentStatus}`}>{currentStatus || 'PENDIENTE'}</span>
          </p>
        </div>

        {/* Observaciones iniciales generadas por el Agente Auditor */}
        {currentInvoice.observaciones_auditor && (
          <div className="observations-box">
            <strong>Observaciones del Auditor:</strong>
            <p>
              {Array.isArray(currentInvoice.observaciones_auditor) 
                ? currentInvoice.observaciones_auditor.join(', ') 
                : currentInvoice.observaciones_auditor}
            </p>
          </div>
        )}

        {/* 💬 SECCIÓN CONVERSACIONAL CON EL AGENTE 3 (Disponible en todos los estados) */}
        <div className="review-chat-container">
          <h4>💬 {isRevision ? 'Aclarar o Corregir Factura' : 'Asistente de Consulta y Ajustes'}</h4>

          <div className="chat-box">
            {chatHistory.length === 0 && (
              <p className="chat-placeholder">
                {isRevision 
                  ? 'Escribe tu aclaración para resolver esta factura. (Ejemplo: "El NIT del negocio es 900123456-7")'
                  : 'Esta factura ya fue auditada. Puedes solicitar reajustes o consultar dudas. (Ejemplo: "Registra $15.000 de propina")'
                }
              </p>
            )}

            {chatHistory.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.sender}`}>
                <strong>{msg.sender === 'user' ? 'Tú' : '🤖 Agente'}:</strong> {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              placeholder={isRevision ? "Escribe la corrección aquí..." : "Solicita un ajuste o consulta..."}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !userMessage.trim()}>
              {loading ? 'Procesando...' : 'Enviar'}
            </button>
          </form>
        </div>

        <button className="close-btn" onClick={onClose} style={{ marginTop: '15px' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};