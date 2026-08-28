import React, { useEffect, useRef, memo } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GoogleButton = memo(({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderBtn = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      // 1. Inicializar una sola vez a nivel de cliente
      if (!isInitialized.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              onSuccess(response.credential);
            } else if (onError) {
              onError('No se obtuvo credencial de Google.');
            }
          },
          auto_select: false, // Previene la selección automática forzada
        });
        isInitialized.current = true;
      }

      // 2. Limpiar e inyectar el botón en el DOM
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

    if (window.google?.accounts?.id) {
      renderBtn();
    } else {
      let script = document.getElementById('google-jssdk');
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
  }, []); // [] asegura que el ciclo solo se ejecute al montar el componente

  return <div ref={googleButtonRef} style={{ minHeight: '40px' }} />;
});