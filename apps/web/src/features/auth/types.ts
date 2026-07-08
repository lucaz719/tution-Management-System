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

export interface AuthSession {
  token: string;
  tenantId?: string | null;
  user: AuthUser;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_FOUND'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'RESET_TOKEN_INVALID'
  | 'TWO_FACTOR_INVALID'
  | 'TWO_FACTOR_EXPIRED';

export interface PasswordRule {
  id: 'min-length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  test: (password: string) => boolean;
}
