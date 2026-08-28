import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GoogleButton } from './GoogleButton';

export const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Login tradicional con Correo y Contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard'); // <-- Agregado para redireccionar al usuario tradicional
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  // Login con Google
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
        <div className="auth-brand">
          <ShieldCheck size={28} />
          <span>Gestor de Facturas</span>
        </div>
        <h2 className="auth-title">¡Bienvenido de nuevo!</h2>
        <p className="auth-subtitle">Ingresa tus credenciales para acceder a la plataforma</p>
      </div>

      {error && <div className="auth-error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label className="input-label" htmlFor="email">Correo Electrónico</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            className="input-field"
            value={formData.email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            name="password"
            required
            className="input-field"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={submitting} className="auth-submit-btn">
          {submitting ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="auth-divider">
        <span>ó</span>
      </div>

      <GoogleButton
        onSuccess={handleGoogleSuccess}
        onError={(msg) => setError(msg)}
      />

      <div className="auth-footer">
        ¿No tienes cuenta?{' '}
        <button type="button" onClick={onSwitchToRegister} className="auth-switch-btn">
          Regístrate aquí
        </button>
      </div>
    </div>
  );
};