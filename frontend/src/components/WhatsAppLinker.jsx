import React, { useState, useEffect } from 'react';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp } from '../services/api';

export default function WhatsAppLinker() {
  const [status, setStatus] = useState({ connected: false, qr: null, number: null });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const json = await getWhatsAppStatus();
      if (json && json.success) {
        setStatus(json.data);
      }
    } catch (err) {
      console.error('Error al obtener estado de WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConnection = async () => {
    setInitializing(true);
    try {
      const json = await connectWhatsApp();
      if (json && json.success) {
        await fetchStatus();
      } else {
        alert('Error al iniciar el servicio.');
      }
    } catch (err) {
      console.error('Error conectando WhatsApp:', err);
      alert('Error de conexión con el servidor.');
    } finally {
      setInitializing(false);
    }
  };

  // Función para detener la generación y ocultar el QR
  const handleStopConnection = async () => {
    setDisconnecting(true);
    try {
      await disconnectWhatsApp();
      setStatus({ connected: false, qr: null, number: null });
    } catch (err) {
      console.error('Error al ocultar QR:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Estás seguro de que deseas desvincular este número de WhatsApp?')) {
      return;
    }

    setDisconnecting(true);
    try {
      const json = await disconnectWhatsApp();
      if (json && json.success) {
        setStatus({ connected: false, qr: null, number: null });
        fetchStatus();
      } else {
        alert('Error al desvincular: ' + (json?.message || json?.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Error al desvincular WhatsApp:', err);
      alert('Error de conexión con el servidor.');
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Solo realiza polling si existe un QR activo esperando escaneo
    const interval = setInterval(() => {
      if (status.qr && !status.connected) {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status.qr, status.connected]);

  return (
    <div style={{
      maxWidth: '420px',
      margin: '20px auto',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid #E2E8F0',
      backgroundColor: '#FFFFFF',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h2 style={{ fontSize: '1.25rem', color: '#1E293B', marginBottom: '8px' }}>
        Conexión WhatsApp
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '20px' }}>
        Toma fotos de tus facturas y envíalas directamente por WhatsApp.
      </p>

      {loading ? (
        <p style={{ color: '#94A3B8' }}>Cargando estado...</p>
      ) : status.connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            fontWeight: 'bold'
          }}>
            ✅ WhatsApp Vinculado y Activo
            {status.number && (
              <p style={{ fontSize: '0.85rem', color: '#15803D', margin: '4px 0 0 0' }}>
                📱 <strong>Número:</strong> {status.number}
              </p>
            )}
            <p style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#15803D', marginTop: '4px' }}>
              Ya puedes enviar fotos de facturas al chat.
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #FECDD3',
              backgroundColor: '#FFF1F2',
              color: '#E11D48',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: disconnecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {disconnecting ? 'Desvinculando...' : '🚪 Desvincular número actual'}
          </button>
        </div>
      ) : status.qr ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <img src={status.qr} alt="Código QR WhatsApp" style={{ width: '220px', height: '220px' }} />
          </div>
          
          <ol style={{ textAlign: 'left', fontSize: '0.85rem', color: '#475569', paddingLeft: '20px', margin: 0 }}>
            <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
            <li>Ve a <strong>Ajustes</strong> &gt; <strong>Dispositivos vinculados</strong>.</li>
            <li>Escanea este código QR para conectar.</li>
          </ol>

          {/* Botón para detener y ocultar el QR */}
          <button
            onClick={handleStopConnection}
            disabled={disconnecting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: disconnecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {disconnecting ? 'Deteniendo...' : '🚫 Ocultar QR'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            El servicio de WhatsApp está actualmente inactivo.
          </p>
          <button
            onClick={handleStartConnection}
            disabled={initializing}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: initializing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {initializing ? 'Iniciando servicio...' : '📲 Generar Código QR'}
          </button>
        </div>
      )}
    </div>
  );
}