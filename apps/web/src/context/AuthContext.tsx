import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { removeAuthToken } from '../services/api';
import {
  AuthFlowError,
  ROLE_DEFAULT_PATHS,
  authenticateUser,
  requestTwoFactorCode,
} from '../features/auth/service';
import type { AuthUser } from '../features/auth/types';
import { authClient } from '../features/auth/auth-client';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTwoFactorPending: boolean;
  attemptCount: number;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  roleRedirectPath: () => string;
  verify2FA: () => void;
  resetAttemptCount: () => void;
}

const STORAGE_KEYS = {
  token: 'tms_token',
  user: 'tms_user',
  tenantId: 'tms_tenant_id',
  sessionScope: 'tms_session_scope',
} as const;

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredScope(): 'persistent' | 'session' | null {
  const scope = localStorage.getItem(STORAGE_KEYS.sessionScope);
  if (scope === 'persistent' || scope === 'session') {
    return scope;
  }

  return null;
}

function clearSessionStorageArtifacts(): void {
  sessionStorage.removeItem(STORAGE_KEYS.token);
  sessionStorage.removeItem(STORAGE_KEYS.user);
  sessionStorage.removeItem(STORAGE_KEYS.tenantId);
}

function clearLocalStorageArtifacts(): void {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.tenantId);
  localStorage.removeItem(STORAGE_KEYS.sessionScope);
}

function writeStoredSession(token: string, user: AuthUser, tenantId: string | null | undefined, rememberMe: boolean): void {
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    if (tenantId) {
      localStorage.setItem(STORAGE_KEYS.tenantId, tenantId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.tenantId);
    }
    localStorage.setItem(STORAGE_KEYS.sessionScope, 'persistent');
    clearSessionStorageArtifacts();
    return;
  }

  sessionStorage.setItem(STORAGE_KEYS.token, token);
  sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  if (tenantId) {
    sessionStorage.setItem(STORAGE_KEYS.tenantId, tenantId);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.tenantId);
  }

  localStorage.setItem(STORAGE_KEYS.sessionScope, 'session');
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.tenantId);
}

function updateStoredUser(user: AuthUser): void {
  const serializedUser = JSON.stringify(user);
  const scope = getStoredScope();

  if (scope === 'persistent') {
    localStorage.setItem(STORAGE_KEYS.user, serializedUser);
    return;
  }

  sessionStorage.setItem(STORAGE_KEYS.user, serializedUser);
}

function readStoredSession(): { token: string | null; user: AuthUser | null } {
  const scope = getStoredScope();

  if (scope === 'session' && !sessionStorage.getItem(STORAGE_KEYS.token)) {
    clearLocalStorageArtifacts();
    return { token: null, user: null };
  }

  const token =
    (scope === 'session' ? sessionStorage.getItem(STORAGE_KEYS.token) : null) ??
    sessionStorage.getItem(STORAGE_KEYS.token) ??
    localStorage.getItem(STORAGE_KEYS.token);

  const rawUser =
    (scope === 'session' ? sessionStorage.getItem(STORAGE_KEYS.user) : null) ??
    sessionStorage.getItem(STORAGE_KEYS.user) ??
    localStorage.getItem(STORAGE_KEYS.user);

  if (!token || !rawUser) {
    return { token: null, user: null };
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser) as AuthUser,
    };
  } catch {
    clearLocalStorageArtifacts();
    clearSessionStorageArtifacts();
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    const storedSession = readStoredSession();
    setUser(storedSession.user);
    setToken(storedSession.token);
    setIsLoading(false);
  }, []);

  const resetAttemptCount = useCallback(() => {
    setAttemptCount(0);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    if (attemptCount >= 5) {
      throw new AuthFlowError('ACCOUNT_LOCKED', 'Your account has been locked after 5 failed attempts.');
    }

    setIsLoading(true);

    try {
      let session: any;
      try {
        const res = await authClient.signIn.email({
          email,
          password,
          dontNavigate: true,
        } as any);
        if (res?.data) {
          const { data: sessionData } = await authClient.getSession();
          if (sessionData && sessionData.user) {
            const sessionRoles = Array.isArray((sessionData.user as any).roles)
              ? (sessionData.user as any).roles
              : [];
            const rolePriority = ['Tenant Admin', 'Branch Admin', 'Teacher', 'Accountant', 'Receptionist', 'Janitor', 'Student', 'Parent'];
            const roleName = rolePriority.find((candidate) =>
              sessionRoles.some((entry: any) => entry?.roleName === candidate)
            ) ?? sessionRoles[0]?.roleName ?? 'Teacher';
            session = {
              token: sessionData.session.token,
              user: {
                id: sessionData.user.id,
                email: sessionData.user.email,
                firstName: sessionData.user.name?.split(' ')[0] || '',
                lastName: sessionData.user.name?.split(' ')[1] || '',
                role: roleName.toUpperCase().replace(/\s+/g, '_'),
                requiresTwoFactor: false,
                firstLogin: false,
              },
              tenantId: (sessionData.user as any).tenantId || null,
            };
          }
        }
      } catch (err) {
        console.warn('Better Auth login failed, falling back to legacy login:', err);
      }

      if (!session) {
        session = await authenticateUser(email, password);
      }

      writeStoredSession(session.token, session.user, session.tenantId, rememberMe);

      if (session.user.requiresTwoFactor) {
        try {
          await requestTwoFactorCode(session.user.email);
        } catch {
          // The 2FA page offers a resend option if the initial send fails.
        }
      }

      setToken(session.token);
      setUser(session.user);
      setAttemptCount(0);
    } catch (error) {
      const nextAttemptCount = attemptCount + 1;
      setAttemptCount(nextAttemptCount);

      if (nextAttemptCount >= 5) {
        throw new AuthFlowError('ACCOUNT_LOCKED', 'Your account has been locked after 5 failed attempts.');
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [attemptCount]);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (err) {
      console.warn('Better Auth signOut failed:', err);
    }
    removeAuthToken();
    clearLocalStorageArtifacts();
    clearSessionStorageArtifacts();
    setUser(null);
    setToken(null);
    setAttemptCount(0);
  }, []);

  const roleRedirectPath = useCallback((): string => {
    if (!user) {
      return '/login';
    }

    if (user.requiresTwoFactor) {
      return '/2fa';
    }

    if (user.firstLogin) {
      if (user.role === 'TENANT_ADMIN') {
        return '/setup/tenant';
      }

      if (user.role === 'BRANCH_ADMIN') {
        return '/setup/branch';
      }
    }

    return ROLE_DEFAULT_PATHS[user.role] ?? '/login';
  }, [user]);

  const verify2FA = useCallback(() => {
    if (!user) {
      return;
    }

    const updatedUser: AuthUser = { ...user, requiresTwoFactor: false };
    updateStoredUser(updatedUser);
    setUser(updatedUser);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user && !user.requiresTwoFactor),
    isTwoFactorPending: Boolean(token && user?.requiresTwoFactor),
    attemptCount,
    login,
    logout,
    roleRedirectPath,
    verify2FA,
    resetAttemptCount,
  }), [attemptCount, isLoading, login, logout, roleRedirectPath, token, user, verify2FA, resetAttemptCount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return context;
}
