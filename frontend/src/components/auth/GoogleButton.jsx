import React, { useEffect, useRef, memo } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Bandera global fuera del componente para persistir entre rerenders
let isGoogleInitialized = false;

export const GoogleButton = memo(({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderBtn = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      // 1. Inicializar solo UNA VEZ globalmente
      if (!isGoogleInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) onSuccess(response.credential);
            else if (onError) onError('Error con Google Auth');
          },
          auto_select: false,
        });
        isGoogleInitialized = true;
      }

      // 2. Limpiar e inicializar la interfaz visual del botón
      googleButtonRef.current.innerHTML = '';
      
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 350,
        text: 'continue_with',
        locale: 'es',
        shape: 'rectangular',
        type: 'standard',
      });
    };

    let script = document.getElementById('google-jssdk');

    if (window.google?.accounts?.id) {
      renderBtn();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.id = 'google-jssdk';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', renderBtn);
    }

    return () => {
      if (script) {
        script.removeEventListener('load', renderBtn);
      }
    };
  }, [onSuccess, onError]);

  return <div ref={googleButtonRef} style={{ minHeight: '40px' }} />;
});