import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User roles with permissions
export const USER_ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager', 
  WORKER: 'worker',
  CLIENT: 'client'
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'view_all_projects',
    'edit_all_projects',
    'manage_users',
    'manage_system_settings',
    'view_financials',
    'export_data'
  ],
  [USER_ROLES.PROJECT_MANAGER]: [
    'view_assigned_projects',
    'edit_assigned_projects',
    'manage_project_tasks',
    'view_project_financials',
    'manage_project_team',
    'export_project_data'
  ],
  [USER_ROLES.WORKER]: [
    'view_assigned_tasks',
    'update_task_status',
    'add_task_comments',
    'upload_task_documents',
    'view_project_details'
  ],
  [USER_ROLES.CLIENT]: [
    'view_own_projects',
    'view_project_progress',
    'add_project_comments',
    'view_invoices'
  ]
};

// Demo users for development
const DEMO_USERS = [
  {
    id: 'admin-001',
    email: 'admin@aluminum-store.com',
    password: 'admin123', // In production, this would be hashed
    name: 'Ana Adminović',
    role: USER_ROLES.ADMIN,
    department: 'Administration',
    avatar: null,
    phone: '+385 91 234 5678',
    created: '2024-01-15T08:00:00.000Z',
    lastLogin: null,
    isActive: true
  },
  {
    id: 'pm-001', 
    email: 'ivan.horvat@aluminum-store.com',
    password: 'pm123',
    name: 'Ivan Horvat',
    role: USER_ROLES.PROJECT_MANAGER,
    department: 'Project Management',
    avatar: null,
    phone: '+385 91 234 5679',
    created: '2024-01-15T08:00:00.000Z',
    lastLogin: null,
    isActive: true,
    assignedProjects: ['demo-project-001']
  },
  {
    id: 'worker-001',
    email: 'marko.radić@aluminum-store.com', 
    password: 'worker123',
    name: 'Marko Radić',
    role: USER_ROLES.WORKER,
    department: 'Fabrication',
    avatar: null,
    phone: '+385 91 234 5680',
    created: '2024-01-15T08:00:00.000Z',
    lastLogin: null,
    isActive: true,
    assignedTasks: []
  },
  {
    id: 'client-001',
    email: 'client@example.com',
    password: 'client123', 
    name: 'Petra Klient',
    role: USER_ROLES.CLIENT,
    department: null,
    avatar: null,
    phone: '+385 91 234 5681',
    created: '2024-01-15T08:00:00.000Z',
    lastLogin: null,
    isActive: true,
    ownedProjects: ['demo-project-001']
  }
];

// Simulate JWT token generation
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return btoa(JSON.stringify(payload));
};

// Validate token
const validateToken = (token) => {
  try {
    const payload = JSON.parse(atob(token));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
};

// Create the user store with persistence
export const useUserStore = create(
  persist(
    (set, get) => ({
      // Auth state
      currentUser: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Users management (for admin)
      users: DEMO_USERS,
      
      // Error handling
      authError: null,
      
      // === AUTH ACTIONS ===
      login: async (email, password) => {
        set({ isLoading: true, authError: null });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const user = get().users.find(u => u.email === email && u.password === password && u.isActive);
          
          if (!user) {
            set({ 
              authError: 'Neispravni podaci za prijavu', 
              isLoading: false 
            });
            return false;
          }
          
          const token = generateToken(user);
          const updatedUser = {
            ...user,
            lastLogin: new Date().toISOString()
          };
          
          // Update user's last login
          set(state => ({
            users: state.users.map(u => u.id === user.id ? updatedUser : u),
            currentUser: updatedUser,
            token,
            isAuthenticated: true,
            isLoading: false,
            authError: null
          }));
          
          return true;
        } catch (error) {
          set({ 
            authError: 'Greška prilikom prijave', 
            isLoading: false 
          });
          return false;
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, authError: null });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const { email, password, name, role = USER_ROLES.WORKER, department = '', phone = '' } = userData;
          
          // Check if user already exists
          const existingUser = get().users.find(u => u.email === email);
          if (existingUser) {
            set({ 
              authError: 'Korisnik s ovom email adresom već postoji', 
              isLoading: false 
            });
            return false;
          }
          
          const newUser = {
            id: `user-${Date.now()}`,
            email,
            password, // In production, hash the password
            name,
            role,
            department,
            avatar: null,
            phone,
            created: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            assignedProjects: role === USER_ROLES.PROJECT_MANAGER ? [] : undefined,
            assignedTasks: role === USER_ROLES.WORKER ? [] : undefined,
            ownedProjects: role === USER_ROLES.CLIENT ? [] : undefined
          };
          
          const token = generateToken(newUser);
          
          set(state => ({
            users: [...state.users, newUser],
            currentUser: newUser,
            token,
            isAuthenticated: true,
            isLoading: false,
            authError: null
          }));
          
          return true;
        } catch (error) {
          set({ 
            authError: 'Greška prilikom registracije', 
            isLoading: false 
          });
          return false;
        }
      },
      
      logout: () => {
        set({
          currentUser: null,
          token: null,
          isAuthenticated: false,
          authError: null
        });
      },
      
      // Initialize auth from stored token
      initAuth: () => {
        const { token, users } = get();
        if (token) {
          const payload = validateToken(token);
          if (payload) {
            const user = users.find(u => u.id === payload.userId);
            if (user && user.isActive) {
              set({
                currentUser: user,
                isAuthenticated: true
              });
              return;
            }
          }
        }
        // Invalid or expired token
        set({
          currentUser: null,
          token: null,
          isAuthenticated: false
        });
      },
      
      // === PERMISSION HELPERS ===
      hasPermission: (permission) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        return ROLE_PERMISSIONS[currentUser.role]?.includes(permission) ?? false;
      },
      
      canAccessProject: (projectId) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        // Admin can access all projects
        if (currentUser.role === USER_ROLES.ADMIN) return true;
        
        // Project managers can access assigned projects
        if (currentUser.role === USER_ROLES.PROJECT_MANAGER) {
          return currentUser.assignedProjects?.includes(projectId) ?? false;
        }
        
        // Clients can access their own projects
        if (currentUser.role === USER_ROLES.CLIENT) {
          return currentUser.ownedProjects?.includes(projectId) ?? false;
        }
        
        // Workers can access projects with assigned tasks (would need task-project mapping)
        return false;
      },
      
      // === USER MANAGEMENT (Admin only) ===
      updateUser: (userId, updates) => {
        const { hasPermission } = get();
        if (!hasPermission('manage_users')) return false;
        
        set(state => ({
          users: state.users.map(user => 
            user.id === userId 
              ? { ...user, ...updates, updated: new Date().toISOString() }
              : user
          )
        }));
        return true;
      },
      
      deactivateUser: (userId) => {
        const { hasPermission } = get();
        if (!hasPermission('manage_users')) return false;
        
        set(state => ({
          users: state.users.map(user => 
            user.id === userId 
              ? { ...user, isActive: false, updated: new Date().toISOString() }
              : user
          )
        }));
        return true;
      },
      
      // === PROFILE MANAGEMENT ===
      updateProfile: (updates) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        const allowedFields = ['name', 'phone', 'avatar'];
        const filteredUpdates = Object.keys(updates)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
          }, {});
        
        const updatedUser = {
          ...currentUser,
          ...filteredUpdates,
          updated: new Date().toISOString()
        };
        
        set(state => ({
          currentUser: updatedUser,
          users: state.users.map(user => 
            user.id === currentUser.id ? updatedUser : user
          )
        }));
        return true;
      },
      
      changePassword: async (currentPassword, newPassword) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify current password
        if (currentUser.password !== currentPassword) {
          set({ authError: 'Trenutna lozinka nije ispravna' });
          return false;
        }
        
        // Update password
        const updatedUser = {
          ...currentUser,
          password: newPassword, // In production, hash the password
          updated: new Date().toISOString()
        };
        
        set(state => ({
          currentUser: updatedUser,
          users: state.users.map(user => 
            user.id === currentUser.id ? updatedUser : user
          ),
          authError: null
        }));
        return true;
      },
      
      // === UTILITY ACTIONS ===
      clearError: () => set({ authError: null }),
      
      getActiveUsers: () => {
        return get().users.filter(user => user.isActive);
      },
      
      getUsersByRole: (role) => {
        return get().users.filter(user => user.role === role && user.isActive);
      }
    }),
    {
      name: 'aluminum-store-auth',
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);