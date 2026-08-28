import React, { useEffect, useRef, memo } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GoogleButton = memo(({ onSuccess, onError }) => {
  const googleButtonRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderBtn = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.disableAutoSelect();

      if (!isInitialized.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) onSuccess(response.credential);
            else if (onError) onError('Error con Google Auth');
          },
          auto_select: false,
          prompt_parent_id: undefined,
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

    // Retorno de limpieza para remover el listener al desmontar
    return () => {
      if (script) {
        script.removeEventListener('load', renderBtn);
      }
    };
  }, [onSuccess, onError]);

  return <div ref={googleButtonRef} style={{ minHeight: '40px' }} />;
});