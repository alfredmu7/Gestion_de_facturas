import React, { useState } from 'react';
import { Mail, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/AuthForm.css';

export const OtpVerification = ({ email, onVerified, onCancel }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyOtpCode } = useAuth();

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length < 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpCode(email, otp.trim());
      onVerified();
    } catch (err) {
      setError(err.message || 'Código de verificación inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-icon-wrapper">
          <Mail size={24} />
        </div>
        <h1 className="auth-title">Verifica tu correo</h1>
        <p className="auth-subtitle">
          Ingresa el código enviado a <strong style={{ color: '#0f172a' }}>{email}</strong>
        </p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="auth-form">
        <div className="auth-field-group">
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="auth-input-otp"
            required
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? (
            <div className="auth-spinner" />
          ) : (
            <>
              <span>Confirmar Código</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <button
          type="button"
          onClick={onCancel}
          className="auth-switch-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          Volver al formulario
        </button>
      </div>
    </div>
  );
};