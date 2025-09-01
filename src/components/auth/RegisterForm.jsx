import React, { useState } from 'react';
import { useUserStore, USER_ROLES } from '../../store/useUserStore';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterForm({ onToggleMode }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLES.WORKER,
    department: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  const { register, isLoading, authError, clearError } = useUserStore();
  
  const roleOptions = [
    { value: USER_ROLES.WORKER, label: 'Radnik', description: 'Pristup zadacima i ažuriranje statusa' },
    { value: USER_ROLES.PROJECT_MANAGER, label: 'Voditelj Projekta', description: 'Upravljanje projektima i timovima' },
    { value: USER_ROLES.CLIENT, label: 'Klijent', description: 'Pregled vlastitih projekata' }
  ];
  
  const departmentOptions = [
    'Design',
    'Procurement', 
    'Cutting',
    'Fabrication',
    'Assembly',
    'QA',
    'Packing',
    'Transport',
    'Installation',
    'Administration',
    'Sales',
    'Other'
  ];
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Ime i prezime je obavezno';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email adresa je obavezna';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Neispravna email adresa';
    }
    
    if (!formData.password) {
      errors.password = 'Lozinka je obavezna';
    } else if (formData.password.length < 6) {
      errors.password = 'Lozinka mora imati najmanje 6 znakova';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Lozinke se ne poklapaju';
    }
    
    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      errors.phone = 'Neispravna format telefona';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) {
      return;
    }
    
    const success = await register(formData);
    if (!success) {
      // Error is handled by the store
      return;
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (authError) clearError();
  };
  
  const getInputClassName = (fieldName) => {
    const baseClasses = "w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors";
    const errorClasses = "border-red-300 focus:ring-red-500 focus:border-red-500";
    const normalClasses = "border-gray-300";
    
    return `${baseClasses} ${validationErrors[fieldName] ? errorClasses : normalClasses}`;
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Registracija</h2>
          <p className="text-gray-600 mt-2">Stvorite novi račun</p>
        </div>
        
        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-red-700 text-sm">{authError}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Ime i prezime *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              className={getInputClassName('name')}
              placeholder="Ana Anić"
              disabled={isLoading}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email adresa *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className={getInputClassName('email')}
              placeholder="ana@tvrtka.com"
              disabled={isLoading}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Lozinka *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleInputChange}
                className={getInputClassName('password')}
                placeholder="Najmanje 6 znakova"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Potvrdi lozinku *
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={getInputClassName('confirmPassword')}
                placeholder="Ponovi lozinku"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Uloga *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={getInputClassName('role')}
              disabled={isLoading}
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formData.role && (
              <p className="mt-1 text-sm text-gray-500">
                {roleOptions.find(opt => opt.value === formData.role)?.description}
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Odjel
            </label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className={getInputClassName('department')}
              disabled={isLoading}
            >
              <option value="">Odaberite odjel</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              className={getInputClassName('phone')}
              placeholder="+385 91 234 5678"
              disabled={isLoading}
            />
            {validationErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                       text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                       disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registriranje...</span>
              </div>
            ) : (
              'Registriraj se'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            disabled={isLoading}
          >
            Već imate račun? Prijavite se
          </button>
        </div>
      </div>
    </div>
  );
}