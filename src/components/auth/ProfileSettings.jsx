import React, { useState } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Lock, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';

export default function ProfileSettings({ onClose }) {
  const { currentUser, updateProfile, changePassword, authError, clearError } = useUserStore();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    avatar: currentUser?.avatar || ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (successMessage) setSuccessMessage('');
    if (authError) clearError();
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (passwordErrors[name]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (authError) clearError();
  };
  
  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Trenutna lozinka je obavezna';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Nova lozinka je obavezna';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Nova lozinka mora imati najmanje 6 znakova';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Lozinke se ne poklapaju';
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'Nova lozinka mora biti različita od trenutne';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    setSuccessMessage('');
    
    try {
      const success = await updateProfile(profileData);
      if (success) {
        setSuccessMessage('Profil uspješno ažuriran');
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setIsLoading(true);
    clearError();
    setSuccessMessage('');
    
    try {
      const success = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (success) {
        setSuccessMessage('Lozinka uspješno promijenjena');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'password', label: 'Lozinka', icon: Lock }
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Postavke profila</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="px-6">
            <div className="flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-96">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-green-700 text-sm">{successMessage}</span>
            </div>
          )}
          
          {/* Error Message */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700 text-sm">{authError}</span>
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isLoading}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Promijeni sliku</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF do 2MB</p>
                </div>
              </div>
              
              {/* Profile Fields */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Ime i prezime
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Unesite ime i prezime"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email adresa
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={currentUser?.email || ''}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email adresa se ne može mijenjati</p>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+385 91 234 5678"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                    Odjel
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="department"
                      type="text"
                      value={currentUser?.department || ''}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Odjel može mijenjati samo administrator</p>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 transition-colors"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Spremam...' : 'Spremi promjene'}</span>
                </button>
              </div>
            </form>
          )}
          
          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Trenutna lozinka
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Unesite trenutnu lozinku"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Nova lozinka
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Unesite novu lozinku"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Potvrdi novu lozinku
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ponovite novu lozinku"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 transition-colors"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Mijenjam...' : 'Promijeni lozinku'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}