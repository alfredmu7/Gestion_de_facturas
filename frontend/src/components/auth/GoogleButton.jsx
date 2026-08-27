import React, { useEffect, useRef, useCallback } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GoogleButton = ({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);
  const isInitialized = useRef(false);

  const handleCallbackResponse = useCallback(
    (response) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        onError('No se obtuvo respuesta de autenticación de Google.');
      }
    },
    [onSuccess, onError]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID no configurado');
      return;
    }

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      // Se inicializa UNA sola vez globalmente para evitar logs duplicados
      if (!isInitialized.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCallbackResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        isInitialized.current = true;
      }

      // Limpia contenedor y renderiza el botón nativo
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 350,
        text: 'continue_with',
        locale: 'es',
        shape: 'rectangular',
      });
    };

    // Si la librería de Google ya existe en window
    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      // Inyección única del script
      let script = document.getElementById('google-jssdk');
      if (!script) {
        script = document.createElement('script');
        script.id = 'google-jssdk';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      const handleScriptLoad = () => renderGoogleButton();
      script.addEventListener('load', handleScriptLoad);

      return () => {
        script.removeEventListener('load', handleScriptLoad);
      };
    }
  }, [handleCallbackResponse]);

  return <div ref={googleButtonRef} className="google-btn-wrapper" />;
};