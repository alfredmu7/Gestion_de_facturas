import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/AuthForm.css';

export const RegisterForm = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmitting(true);

    try {
      await register(formData.nombre, formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error en el registro.');
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
        <h2 className="auth-title">Crear Cuenta</h2>
        <p className="auth-subtitle">Regístrate para automatizar tus facturas con IA</p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field-group">
          <label className="auth-label" htmlFor="nombre">
            Nombre Completo
          </label>
          <div className="auth-input-wrapper">
            <User className="auth-input-icon" />
            <input
              id="nombre"
              type="text"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Juan Pérez"
              className="auth-input"
            />
          </div>
        </div>

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
              placeholder="Mínimo 6 caracteres"
              className="auth-input"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="auth-submit-btn">
          {submitting ? (
            <div className="auth-spinner" />
          ) : (
            <>
              <span>Registrarse</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        ¿Ya tienes cuenta?
        <button type="button" onClick={onSwitchToLogin} className="auth-switch-btn">
          Inicia sesión aquí
        </button>
      </div>
    </div>
  );
};