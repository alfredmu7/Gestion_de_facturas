import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const RegisterForm = ({ onSwitchToLogin }) => {
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
    } catch (err) {
      setError(err.message || 'Error en el registro.');
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
        <h2 className="auth-title">Crear Cuenta</h2>
        <p className="auth-subtitle">Regístrate para automatizar tus facturas con IA</p>
      </div>

      {error && <div className="auth-error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label className="input-label" htmlFor="nombre">Nombre Completo</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            required
            className="input-field"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Juan Pérez"
          />
        </div>

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
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button type="submit" disabled={submitting} className="auth-submit-btn">
          {submitting ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>

      <div className="auth-footer">
        ¿Ya tienes cuenta?{' '}
        <button type="button" onClick={onSwitchToLogin} className="auth-switch-btn">
          Inicia sesión aquí
        </button>
      </div>
    </div>
  );
};