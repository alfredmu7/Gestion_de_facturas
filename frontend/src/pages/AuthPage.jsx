// Archivo: src/pages/AuthPage.jsx [FRONTEND]
import React from 'react';
import { AuthCard } from '../components/auth/AuthCard';

export const AuthPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <AuthCard />
    </div>
  );
};

export default AuthPage;