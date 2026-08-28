import { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, googleLoginUser, getMe } from '../services/api';

// 1. Crear y exportar el Contexto (solo UNA vez aquí)
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }

  setUser(null);
  setToken(null);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await getMe();
          const userData = response.data?.user || response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Sesión expirada o no válida:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [logout]);

  const handleAuthSuccess = (userData, userToken) => {
    if (!userData || !userToken) {
      throw new Error('Respuesta de autenticación incompleta (falta token o usuario).');
    }
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const login = async (email, password) => {
    const response = await loginUser(email, password);
    const data = response.data?.data || response.data;
    handleAuthSuccess(data.user || data.usuario, data.token);
    return response;
  };

  const register = async (nombre, email, password) => {
    const response = await registerUser(nombre, email, password);
    const data = response.data?.data || response.data;
    if (data.token) {
      handleAuthSuccess(data.user || data.usuario, data.token);
    }
    return response;
  };

  const googleLogin = async (idToken) => {
    const response = await googleLoginUser(idToken);
    const data = response.data?.data || response.data;
    handleAuthSuccess(data.user || data.usuario, data.token);
    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};