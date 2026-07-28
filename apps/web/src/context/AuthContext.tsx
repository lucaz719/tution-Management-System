import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { removeAuthToken } from '../services/api';
import { AuthFlowError, ROLE_DEFAULT_PATHS, requestTwoFactorCode } from '../features/auth/service';
import type { AuthUser } from '../features/auth/types';
import { authClient } from '../features/auth/auth-client';

interface AuthContextValue {
  user: AuthUser | null;
  // Kept as a compatibility field for consumers; Better Auth uses an httpOnly cookie.
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

const USER_CACHE_KEY = 'tms_user';
const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_PRIORITY = ['Tenant Admin', 'Branch Admin', 'Teacher', 'Accountant', 'Receptionist', 'Janitor', 'Student', 'Parent'];

function mapSessionUser(sessionUser: any): AuthUser {
  const roles = Array.isArray(sessionUser.roles) ? sessionUser.roles : [];
  const roleName = ROLE_PRIORITY.find((candidate) => roles.some((entry: any) => entry?.roleName === candidate))
    ?? roles[0]?.roleName
    ?? 'Teacher';

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name || sessionUser.email,
    role: roleName.toUpperCase().replace(/\s+/g, '_') as AuthUser['role'],
    requiresTwoFactor: false,
    firstLogin: false,
  };
}

function cacheUser(user: AuthUser | null): void {
  if (user) {
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(USER_CACHE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void authClient.getSession()
      .then(({ data }) => {
        if (!cancelled) {
          const nextUser = data?.user ? mapSessionUser(data.user) : null;
          setUser(nextUser);
          cacheUser(nextUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          cacheUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const resetAttemptCount = useCallback(() => setAttemptCount(0), []);

  const login = useCallback(async (email: string, password: string) => {
    if (attemptCount >= 5) {
      throw new AuthFlowError('ACCOUNT_LOCKED', 'Your account has been locked after 5 failed attempts.');
    }

    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password, dontNavigate: true } as any);
      const sessionData = result?.data ? (await authClient.getSession()).data : null;
      if (!sessionData?.user) {
        throw new AuthFlowError('INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      const nextUser = mapSessionUser(sessionData.user);
      cacheUser(nextUser);
      setUser(nextUser);
      setAttemptCount(0);

      if (nextUser.requiresTwoFactor) {
        await requestTwoFactorCode(nextUser.email);
      }
    } catch (error) {
      const nextAttemptCount = attemptCount + 1;
      setAttemptCount(nextAttemptCount);
      if (nextAttemptCount >= 5) {
        throw new AuthFlowError('ACCOUNT_LOCKED', 'Your account has been locked after 5 failed attempts.');
      }
      if (error instanceof AuthFlowError) throw error;
      throw new AuthFlowError('INVALID_CREDENTIALS', 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  }, [attemptCount]);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      removeAuthToken();
      cacheUser(null);
      setUser(null);
      setAttemptCount(0);
    }
  }, []);

  const roleRedirectPath = useCallback((): string => {
    if (!user) return '/login';
    if (user.requiresTwoFactor) return '/2fa';
    if (user.firstLogin && user.role === 'TENANT_ADMIN') return '/setup/tenant';
    if (user.firstLogin && user.role === 'BRANCH_ADMIN') return '/setup/branch';
    return ROLE_DEFAULT_PATHS[user.role] ?? '/login';
  }, [user]);

  const verify2FA = useCallback(() => {
    if (!user) return;
    const updatedUser = { ...user, requiresTwoFactor: false };
    cacheUser(updatedUser);
    setUser(updatedUser);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token: null,
    isLoading,
    isAuthenticated: Boolean(user && !user.requiresTwoFactor),
    isTwoFactorPending: Boolean(user?.requiresTwoFactor),
    attemptCount,
    login,
    logout,
    roleRedirectPath,
    verify2FA,
    resetAttemptCount,
  }), [attemptCount, isLoading, login, logout, roleRedirectPath, user, verify2FA, resetAttemptCount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
