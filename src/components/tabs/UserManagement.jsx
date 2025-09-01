import React, { useState } from 'react';
import { useUserStore, USER_ROLES } from '../../store/useUserStore';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Shield, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  MoreVertical,
  UserCheck,
  UserX,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const UserEditModal = ({ user, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || USER_ROLES.WORKER,
    department: user?.department || '',
    phone: user?.phone || '',
    isActive: user?.isActive ?? true
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const roleOptions = [
    { value: USER_ROLES.ADMIN, label: 'Administrator' },
    { value: USER_ROLES.PROJECT_MANAGER, label: 'Voditelj Projekta' },
    { value: USER_ROLES.WORKER, label: 'Radnik' },
    { value: USER_ROLES.CLIENT, label: 'Klijent' }
  ];
  
  const departmentOptions = [
    'Design', 'Procurement', 'Cutting', 'Fabrication',
    'Assembly', 'QA', 'Packing', 'Transport', 'Installation',
    'Administration', 'Sales', 'Other'
  ];
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Ime i prezime je obavezno';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email adresa je obavezna';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Neispravna email adresa';
    }
    
    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Neispravni format telefona';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onSave(user.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {user?.id ? 'Uredi korisnika' : 'Dodaj novog korisnika'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ime i prezime *
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ana Anić"
              disabled={isLoading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email adresa *
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="ana@tvrtka.com"
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uloga *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Odjel
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="+385 91 234 5678"
              disabled={isLoading}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>
          
          <div className="flex items-center">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label className="ml-2 block text-sm text-gray-700">
              Aktivan korisnik
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isLoading}
            >
              Odustani
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Spremam...' : 'Spremi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function UserManagement() {
  const { 
    currentUser, 
    users, 
    hasPermission, 
    updateUser, 
    deactivateUser 
  } = useUserStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  
  // Check if user has permission to manage users
  const canManageUsers = hasPermission('manage_users');
  
  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nemate dozvolu
          </h2>
          <p className="text-gray-600">
            Samo administratori mogu upravljati korisnicima.
          </p>
        </div>
      </div>
    );
  }
  
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
      'admin': 'bg-red-100 text-red-800',
      'project_manager': 'bg-blue-100 text-blue-800', 
      'worker': 'bg-green-100 text-green-800',
      'client': 'bg-purple-100 text-purple-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
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
  
  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };
  
  const handleSaveUser = async (userId, userData) => {
    try {
      const success = updateUser(userId, userData);
      if (success) {
        setActionMessage('Korisnik uspješno ažuriran');
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };
  
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const success = updateUser(userId, { isActive: !currentStatus });
      if (success) {
        setActionMessage(
          currentStatus ? 'Korisnik deaktiviran' : 'Korisnik aktiviran'
        );
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };
  
  const getActiveUsersCount = () => users.filter(u => u.isActive).length;
  const getTotalUsersCount = () => users.length;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upravljanje korisnicima</h1>
          <p className="text-gray-600 mt-1">
            Pregledajte i upravljajte svim korisnicima sustava
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right text-sm text-gray-500">
            <div>{getActiveUsersCount()} aktivnih od {getTotalUsersCount()} korisnika</div>
          </div>
          <button
            onClick={() => {
              setEditingUser({ id: null, name: '', email: '', role: USER_ROLES.WORKER, department: '', phone: '', isActive: true });
              setShowEditModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj korisnika</span>
          </button>
        </div>
      </div>
      
      {/* Action Message */}
      {actionMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{actionMessage}</span>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži po imenu, email-u ili odjelu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Sve uloge</option>
              <option value={USER_ROLES.ADMIN}>Administrator</option>
              <option value={USER_ROLES.PROJECT_MANAGER}>Voditelj Projekta</option>
              <option value={USER_ROLES.WORKER}>Radnik</option>
              <option value={USER_ROLES.CLIENT}>Klijent</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Svi statusi</option>
              <option value="active">Aktivni</option>
              <option value="inactive">Neaktivni</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Korisnik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uloga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Odjel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zadnja prijava
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department ? (
                      <div className="flex items-center space-x-1">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span>{user.department}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Nije definirano</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Aktivan
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 mr-1" />
                          Neaktivan
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(user.lastLogin)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                        title="Uredi korisnika"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        className={`p-1 rounded-md transition-colors ${
                          user.isActive
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                        title={user.isActive ? 'Deaktiviraj korisnika' : 'Aktiviraj korisnika'}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nema korisnika
            </h3>
            <p className="text-gray-500">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Nema korisnika koji odgovaraju vašim kriterijima pretrage.'
                : 'Još nema registriranih korisnika u sustavu.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Edit User Modal */}
      <UserEditModal
        user={editingUser}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
      />
    </div>
  );
}