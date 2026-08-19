import React, { useState, useEffect } from 'react';

export default function WhatsAppLinker() {
  const [status, setStatus] = useState({ connected: false, qr: null });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/whatsapp/status');
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      }
    } catch (err) {
      console.error('Error al conectar con el backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Consulta el estado del QR cada 3 segundos automáticamente
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

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
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#166534',
          fontWeight: 'bold'
        }}>
          ✅ WhatsApp Vinculado y Activo
          <p style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#15803D', marginTop: '4px' }}>
            Ya puedes enviar fotos de facturas al chat.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          {status.qr ? (
            <>
              <div style={{ padding: '12px', background: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <img src={status.qr} alt="Código QR WhatsApp" style={{ width: '220px', height: '220px' }} />
              </div>
              <ol style={{ textAlign: 'left', fontSize: '0.85rem', color: '#475569', paddingLeft: '20px', margin: 0 }}>
                <li>Abre **WhatsApp** en tu teléfono.</li>
                <li>Ve a **Ajustes** o **Menú** &gt; **Dispositivos vinculados**.</li>
                <li>Toca en **Vincular un dispositivo** y escanea este código.</li>
              </ol>
            </>
          ) : (
            <p style={{ color: '#64748B' }}>Generando código QR...</p>
          )}
        </div>
      )}
    </div>
  );
}