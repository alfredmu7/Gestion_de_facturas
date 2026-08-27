import { createContext, useState, useEffect } from 'react';
import { loginUser, registerUser, googleLoginUser, getMe } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Recupera token y usuario iniciales desde localStorage
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // Valida la sesión con el backend al montar el componente
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await getMe();
          // Asegúrate de mapear según como tu backend envíe los datos
          const userData = response.data.user || response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Sesión expirada o no válida:', error.message);
          logout();
        }
      } else {
        setLoading(false);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const login = async (email, password) => {
    const response = await loginUser(email, password);
    const { user: userData, token: userToken } = response.data;
    handleAuthSuccess(userData, userToken);
    return response;
  };

  const register = async (nombre, email, password) => {
    const response = await registerUser(nombre, email, password);
    const { user: userData, token: userToken } = response.data;
    handleAuthSuccess(userData, userToken);
    return response;
  };

  const googleLogin = async (idToken) => {
    const response = await googleLoginUser(idToken);
    // Tolera diferentes formatos de respuesta del backend ({ data: { user, token } } o { user, token })
    const data = response.data.data || response.data;
    handleAuthSuccess(data.user, data.token);
    return response;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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