import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Hook para navegación
import { ShieldCheck, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmailSentNotice } from './EmailSentNotice';
import '/src/styles/AuthForm.css';

export const AuthCard = () => {
  const navigate = useNavigate(); // 2. Instancia del router
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'notice'

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, loginWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(fullName, email, password);
        setStep('notice'); // Cambia a la pantalla de "Correo enviado"
      } else {
        await login(email, password);
        navigate('/dashboard'); // 3. Redirección explícita tras login exitoso
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await loginWithGoogle();
      // Supabase OAuth redirige automáticamente según la URL configurada en la consola
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.');
    }
  };

  // Renderizado del aviso de confirmación pendiente
  if (step === 'notice') {
    return (
      <div className="auth-container">
        <EmailSentNotice
          email={email}
          onCancel={() => setStep('form')}
        />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <ShieldCheck size={24} />
          </div>
          <h1 className="auth-title">
            {isRegister ? 'Crear Cuenta' : '¡Bienvenido de nuevo!'}
          </h1>
          <p className="auth-subtitle">
            {isRegister
              ? 'Ingresa tus datos para registrarte en la plataforma'
              : 'Ingresa tus credenciales para acceder a la plataforma'}
          </p>
        </div>

        <button onClick={handleGoogleSignIn} type="button" className="auth-google-btn">
          <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div className="auth-divider">
          <span className="auth-divider-text">o con tu correo</span>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="auth-field-group">
              <label className="auth-label">Nombre Completo</label>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="auth-input"
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field-group">
            <label className="auth-label">Correo Electrónico</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="auth-input"
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label">Contraseña</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-btn"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <div className="auth-spinner" />
            ) : (
              <>
                <span>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="auth-switch-btn"
          >
            {isRegister ? 'Inicia Sesión' : 'Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};