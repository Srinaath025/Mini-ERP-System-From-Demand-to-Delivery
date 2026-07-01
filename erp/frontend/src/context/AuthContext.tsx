import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  is_approved: boolean;
  created_at: string;
  phone?: string;
  address?: string;
  position?: string;
  photo_url?: string;
}

interface Permission {
  role: string;
  admin_panel: boolean;
  sales_order: boolean;
  purchase_order: boolean;
  manufacturing_order: boolean;
  products: boolean;
  accounts: boolean;
  settings: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: Permission[] | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permissionField: keyof Permission) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('erp_token'));
  const [permissions, setPermissions] = useState<Permission[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Set default axios header
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const fetchPermissions = async () => {
    try {
      const response = await axios.get('/api/users/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
      await fetchPermissions();
    } catch (error) {
      console.error('Failed to restore session:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('erp_token', newToken);
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    setToken(null);
    setUser(null);
    setPermissions(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const hasPermission = (permissionField: keyof Permission): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true; // Admin bypasses checks
    if (!permissions) return false;
    
    const userPerm = permissions.find(p => p.role === user.role);
    if (!userPerm) return false;
    return !!userPerm[permissionField];
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
