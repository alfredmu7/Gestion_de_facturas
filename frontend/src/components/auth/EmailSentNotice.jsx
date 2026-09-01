import React from 'react';
import { MailCheck, ArrowLeft, RefreshCw } from 'lucide-react';

export const EmailSentNotice = ({ email, onCancel }) => {
  return (
    <div className="auth-card" style={{ textAlign: 'center' }}>
      <div className="auth-header" style={{ marginBottom: '1.5rem' }}>
        <div 
          className="auth-icon-wrapper" 
          style={{ 
            background: 'rgba(37, 99, 235, 0.1)', 
            color: '#2563eb',
            margin: '0 auto 1rem' 
          }}
        >
          <MailCheck size={28} />
        </div>
        
        <h1 className="auth-title">¡Revisa tu bandeja de entrada!</h1>
        <p className="auth-subtitle">
          Hemos enviado un enlace de confirmación a:
        </p>
        <p style={{ fontWeight: '600', color: '#0f172a', marginTop: '0.25rem', fontSize: '1rem' }}>
          {email}
        </p>
      </div>

      <div 
        style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '1rem', 
          fontSize: '0.875rem', 
          color: '#475569', 
          lineHeight: '1.5',
          marginBottom: '1.5rem',
          textAlign: 'left'
        }}
      >
        Haz clic en el botón <strong>"Confirmar mi cuenta"</strong> dentro del correo para activar tu acceso automáticamente y redirigirte a la plataforma.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onCancel}
          className="auth-switch-btn"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.875rem',
            padding: '0.5rem 1rem'
          }}
        >
          <ArrowLeft size={16} /> Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
};