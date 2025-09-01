import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../store/useUserStore';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { initAuth } = useUserStore();
  
  // Initialize auth on component mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  
  const toggleMode = () => {
    setIsLogin(!isLogin);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Aluminum Store
          </h1>
          <p className="text-lg text-gray-600">
            Sustav upravljanja aluminijskim projektima
          </p>
        </div>
        
        {/* Auth Form */}
        <div className="transition-all duration-300 ease-in-out">
          {isLogin ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <RegisterForm onToggleMode={toggleMode} />
          )}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 Aluminum Store. Sva prava pridržana.</p>
        </div>
      </div>
    </div>
  );
}