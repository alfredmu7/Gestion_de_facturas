import { useContext } from 'react';
// Asegúrate de que la ruta apunte al archivo correcto
import { AuthContext } from '../context/AuthContext'; 

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }

  return context;
};