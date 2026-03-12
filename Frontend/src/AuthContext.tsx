import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type Role = 'Dam Controller' | 'NDRF' | 'District Collector' | 'Highway Department' | 'Public' | null;

interface AuthContextType {
  role: Role;
  login: (role?: Role) => Role;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    return localStorage.getItem('cascade_role') as Role || null;
  });
  const navigate = useNavigate();

  const login = (r?: Role): Role => {
    // Determine the role to login with
    const registeredRole = localStorage.getItem('registered_role') as Role;
    
    // If no role is provided at login, use the registered one
    const loginRole = r || registeredRole || 'Public';

    // If a specific role was provided but doesn't match registration
    if (r && registeredRole && registeredRole !== r) {
      alert(`Access denied. You are registered as ${registeredRole}.`);
      return null;
    }
    
    setRole(loginRole);
    localStorage.setItem('cascade_role', loginRole || '');
    if (!registeredRole && loginRole) {
      localStorage.setItem('registered_role', loginRole);
    }
    return loginRole;
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('cascade_role');
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
