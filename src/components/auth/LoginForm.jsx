import React, { useState } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginForm({ onToggleMode }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isLoading, authError, clearError } = useUserStore();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!formData.email || !formData.password) {
      return;
    }
    
    const success = await login(formData.email, formData.password);
    if (!success) {
      // Error is handled by the store
      return;
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (authError) clearError();
  };
  
  // Demo user quick login buttons
  const demoUsers = [
    { email: 'admin@aluminum-store.com', role: 'Admin', password: 'admin123' },
    { email: 'ivan.horvat@aluminum-store.com', role: 'Project Manager', password: 'pm123' },
    { email: 'marko.radić@aluminum-store.com', role: 'Worker', password: 'worker123' },
    { email: 'client@example.com', role: 'Client', password: 'client123' }
  ];
  
  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Dobrodošli nazad</h2>
          <p className="text-gray-600 mt-2">Prijavite se u svoj račun</p>
        </div>
        
        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-red-700 text-sm">{authError}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email adresa
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 
                         focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="ime@tvrtka.com"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Lozinka
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 
                           focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Unesite lozinku"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                       text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Prijavljivanje...</span>
              </div>
            ) : (
              'Prijavi se'
            )}
          </button>
        </form>
        
        {/* Demo Users Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Demo korisnici za testiranje:</h3>
          <div className="grid grid-cols-1 gap-2">
            {demoUsers.map((user, index) => (
              <button
                key={index}
                onClick={() => handleDemoLogin(user.email, user.password)}
                className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border 
                           transition-colors flex justify-between items-center"
                disabled={isLoading}
              >
                <div>
                  <div className="font-medium text-gray-900">{user.role}</div>
                  <div className="text-gray-500">{user.email}</div>
                </div>
                <div className="text-gray-400 font-mono text-xs">{user.password}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            disabled={isLoading}
          >
            Nemate račun? Registrirajte se
          </button>
        </div>
      </div>
    </div>
  );
}