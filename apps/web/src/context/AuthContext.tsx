import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, removeAuthToken, setAuthToken } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'BRANCH_ADMIN'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'RECEPTIONIST'
  | 'JANITOR'
  | 'STUDENT'
  | 'PARENT';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  firstLogin?: boolean;
  requiresTwoFactor?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  roleRedirectPath: () => string;
  verify2FA: () => void;
}

// ─── Role → Route mapping (PRD §2.6) ─────────────────────────────────────────

const ROLE_DEFAULT_PATHS: Record<UserRole, string> = {
  SUPER_ADMIN:   '/super-admin/dashboard',
  TENANT_ADMIN:  '/tenant/dashboard',
  BRANCH_ADMIN:  '/branch/dashboard',
  TEACHER:       '/teacher/dashboard',
  ACCOUNTANT:    '/staff/finance',
  RECEPTIONIST:  '/staff/reception',
  JANITOR:       '/staff/tasks',
  STUDENT:       '/student/home',
  PARENT:        '/parent/home',
};

// Heuristic email → role mapping (until real API provides role in token)
const emailToRole = (email: string): UserRole => {
  if (email.includes('superadmin'))  return 'SUPER_ADMIN';
  if (email.includes('admin@'))      return 'TENANT_ADMIN';
  if (email.includes('branch-admin') || email.includes('branch.admin')) return 'BRANCH_ADMIN';
  if (email.includes('teacher') || email.includes('shyam@')) return 'TEACHER';
  if (email.includes('accountant'))  return 'ACCOUNTANT';
  if (email.includes('student'))     return 'STUDENT';
  if (email.includes('parent'))      return 'PARENT';
  return 'PARENT';
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('tms_token');
    const storedUser  = localStorage.getItem('tms_user');
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setUser(parsed);
        setAuthToken(storedToken);
      } catch {
        localStorage.removeItem('tms_token');
        localStorage.removeItem('tms_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    let authUser: AuthUser;
    let authToken: string;

    try {
      const res = await api.auth.login(email, password);
      authToken = res.token ?? `mock-jwt-${Date.now()}`;
      authUser = {
        id:    res.user?.id    ?? crypto.randomUUID(),
        email: res.user?.email ?? email,
        name:  res.user?.name  ?? email.split('@')[0],
        role:  (res.user?.role as UserRole) ?? emailToRole(email),
        firstLogin:         res.user?.firstLogin ?? false,
        requiresTwoFactor:  res.user?.requiresTwoFactor ?? false,
      };
    } catch {
      // Fallback mock session so demo works without backend
      authToken = `mock-jwt-${Date.now()}`;
      authUser = {
        id:    crypto.randomUUID(),
        email,
        name:  email.split('@')[0],
        role:  emailToRole(email),
        firstLogin:        false,
        requiresTwoFactor: ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(emailToRole(email)),
      };
    }

    setAuthToken(authToken);
    setToken(authToken);
    setUser(authUser);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('tms_token', authToken);
    storage.setItem('tms_user',  JSON.stringify(authUser));
    // Always write to localStorage for session restore (overridden by sessionStorage behavior)
    localStorage.setItem('tms_token', authToken);
    localStorage.setItem('tms_user',  JSON.stringify(authUser));
    if (!rememberMe) {
      // Will be cleared on tab close via beforeunload
      window.addEventListener('beforeunload', () => {
        localStorage.removeItem('tms_token');
        localStorage.removeItem('tms_user');
      }, { once: true });
    }

    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    removeAuthToken();
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');
    sessionStorage.removeItem('tms_token');
    sessionStorage.removeItem('tms_user');
    setToken(null);
    setUser(null);
  }, []);

  const roleRedirectPath = useCallback((): string => {
    if (!user) return '/login';
    if (user.firstLogin) {
      if (user.role === 'TENANT_ADMIN') return '/setup/tenant';
      if (user.role === 'BRANCH_ADMIN') return '/setup/branch';
    }
    if (user.requiresTwoFactor) return '/two-factor';
    return ROLE_DEFAULT_PATHS[user.role] ?? '/login';
  }, [user]);

  const verify2FA = useCallback(() => {
    if (user) {
      const updated = { ...user, requiresTwoFactor: false };
      setUser(updated);
      localStorage.setItem('tms_user', JSON.stringify(updated));
    }
  }, [user]);

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    roleRedirectPath,
    verify2FA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
