import React, { useEffect, useRef, memo } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GoogleButton = memo(({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderBtn = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      // Garantiza que la inicialización solo ocurra una vez
      if (!isInitialized.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) onSuccess(response.credential);
            else if (onError) onError('Error de autenticación con Google');
          },
          auto_select: false,
        });
        isInitialized.current = true;
      }

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
      return () => script.removeEventListener('load', renderBtn);
    }
  }, []);

  return <div ref={googleButtonRef} style={{ minHeight: '40px' }} />;
});