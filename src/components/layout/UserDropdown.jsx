import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Shield,
  Phone,
  Mail,
  Calendar,
  Building
} from 'lucide-react';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const { currentUser, logout } = useUserStore();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  if (!currentUser) return null;
  
  const getRoleLabel = (role) => {
    const roleMap = {
      'admin': 'Administrator',
      'project_manager': 'Voditelj Projekta',
      'worker': 'Radnik',
      'client': 'Klijent'
    };
    return roleMap[role] || role;
  };
  
  const getRoleColor = (role) => {
    const colorMap = {
      'admin': 'text-red-600 bg-red-100',
      'project_manager': 'text-blue-600 bg-blue-100', 
      'worker': 'text-green-600 bg-green-100',
      'client': 'text-purple-600 bg-purple-100'
    };
    return colorMap[role] || 'text-gray-600 bg-gray-100';
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Nikad';
    return new Date(dateString).toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {currentUser.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {getRoleLabel(currentUser.role)}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
          isOpen ? 'transform rotate-180' : ''
        }`} />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* User Info Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-gray-900 truncate">
                  {currentUser.name}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(currentUser.role)}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* User Details */}
          <div className="p-4 space-y-3 text-sm">
            <div className="flex items-center space-x-3 text-gray-600">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{currentUser.email}</span>
            </div>
            
            {currentUser.phone && (
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{currentUser.phone}</span>
              </div>
            )}
            
            {currentUser.department && (
              <div className="flex items-center space-x-3 text-gray-600">
                <Building className="w-4 h-4 flex-shrink-0" />
                <span>{currentUser.department}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-3 text-gray-500">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Zadnja prijava: {formatDate(currentUser.lastLogin)}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                // Open profile settings modal
                const event = new CustomEvent('openProfileSettings');
                window.dispatchEvent(event);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Postavke profila</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Odjavi se</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}