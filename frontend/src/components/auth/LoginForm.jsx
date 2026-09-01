import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GoogleButton } from './GoogleButton';
import '../../styles/AuthForm.css';

export const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (idToken) => {
    setError(null);
    setSubmitting(true);
    try {
      await googleLogin(idToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al autenticar con Google.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-icon-wrapper">
          <ShieldCheck size={24} />
        </div>
        <h2 className="auth-title">¡Bienvenido de nuevo!</h2>
        <p className="auth-subtitle">Ingresa tus credenciales para acceder a la plataforma</p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field-group">
          <label className="auth-label" htmlFor="email">
            Correo Electrónico
          </label>
          <div className="auth-input-wrapper">
            <Mail className="auth-input-icon" />
            <input
              id="email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              className="auth-input"
            />
          </div>
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="password">
            Contraseña
          </label>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" />
            <input
              id="password"
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="auth-input"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="auth-submit-btn">
          {submitting ? (
            <div className="auth-spinner" />
          ) : (
            <>
              <span>Iniciar Sesión</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="auth-divider">
        <span className="auth-divider-text">o continúa con</span>
      </div>

      <div>
        <GoogleButton
          onSuccess={handleGoogleSuccess}
          onError={(msg) => setError(msg)}
        />
      </div>

      <div className="auth-footer">
        ¿No tienes cuenta?
        <button type="button" onClick={onSwitchToRegister} className="auth-switch-btn">
          Regístrate aquí
        </button>
      </div>
    </div>
  );
};