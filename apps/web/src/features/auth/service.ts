import { api } from '../../services/api';
import type { AuthErrorCode, AuthSession, AuthUser, UserRole } from './types';
import { normalizeEmail } from './utils';

interface MockAccount extends AuthUser {
  password: string;
  tenantId?: string | null;
  phoneHint?: string;
}

interface PasswordResetRequest {
  email: string;
  expiresAt: number;
  otp: string;
  token?: string;
}

interface TwoFactorChallenge {
  email: string;
  expiresAt: number;
  code: string;
}

interface ApiLoginPayload {
  token?: string;
  tenantId?: string | null;
  user?: unknown;
}

const RESET_DURATION_MS = 5 * 60 * 1000;
const TWO_FACTOR_DURATION_MS = 5 * 60 * 1000;
const FIXED_DEMO_CODE = '123456';

const STORAGE_KEYS = {
  mockAccounts: 'tms_mock_accounts',
  passwordReset: 'tms_password_reset_request',
  twoFactor: 'tms_two_factor_challenge',
  trustedDevices: 'tms_trusted_devices',
} as const;

export const ROLE_DEFAULT_PATHS: Record<UserRole, string> = {
  SUPER_ADMIN: '/super-admin/dashboard',
  TENANT_ADMIN: '/tenant/dashboard',
  BRANCH_ADMIN: '/branch/dashboard',
  TEACHER: '/teacher/dashboard',
  ACCOUNTANT: '/staff/finance',
  RECEPTIONIST: '/staff/reception',
  JANITOR: '/staff/tasks',
  STUDENT: '/student/home',
  PARENT: '/parent/home',
};

const DEFAULT_ACCOUNTS: readonly MockAccount[] = [
  {
    id: 'user-super-admin',
    name: 'System Director',
    email: 'superadmin@tms.edu.np',
    password: 'SystemAdmin999!',
    role: 'SUPER_ADMIN',
    requiresTwoFactor: true,
    phoneHint: '••••45',
  },
  {
    id: 'user-tenant-admin',
    name: 'Pinnacle Tenant Admin',
    email: 'admin@pinnacle.edu.np',
    password: 'PinnacleAdmin777!',
    role: 'TENANT_ADMIN',
    requiresTwoFactor: true,
    phoneHint: '••••27',
  },
  {
    id: 'user-branch-admin',
    name: 'Baneshwor Branch Admin',
    email: 'branch-admin@pinnacle.edu.np',
    password: 'BaneshworAdmin888!',
    role: 'BRANCH_ADMIN',
    phoneHint: '••••14',
  },
  {
    id: 'user-teacher',
    name: 'Shyam Adhikari',
    email: 'shyam@pinnacle.edu.np',
    password: 'PhysicsPass999!',
    role: 'TEACHER',
    phoneHint: '••••63',
  },
  {
    id: 'user-accountant',
    name: 'Finance Officer',
    email: 'accounts@pinnacle.edu.np',
    password: 'FinanceDesk555!',
    role: 'ACCOUNTANT',
    phoneHint: '••••38',
  },
  {
    id: 'user-reception',
    name: 'Reception Desk',
    email: 'reception@pinnacle.edu.np',
    password: 'FrontDesk444!',
    role: 'RECEPTIONIST',
    phoneHint: '••••80',
  },
  {
    id: 'user-janitor',
    name: 'Facilities Staff',
    email: 'janitor@pinnacle.edu.np',
    password: 'TaskBoard333!',
    role: 'JANITOR',
    phoneHint: '••••09',
  },
  {
    id: 'user-student',
    name: 'Anisha Student',
    email: 'student.anisha@pinnacle.edu.np',
    password: 'StudentPortal222!',
    role: 'STUDENT',
    phoneHint: '••••19',
  },
  {
    id: 'user-parent',
    name: 'Parent Account',
    email: 'parent.shyam@gmail.com',
    password: 'ShyamParent123!',
    role: 'PARENT',
    phoneHint: '••••52',
  },
] as const;

export class AuthFlowError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthFlowError';
    this.code = code;
  }
}

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function createToken(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function readStorageItem(storageKey: string): string | null {
  if (!hasWindow()) {
    return null;
  }

  return localStorage.getItem(storageKey);
}

function writeStorageItem(storageKey: string, value: string): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(storageKey, value);
}

function removeSessionItem(storageKey: string): void {
  if (!hasWindow()) {
    return;
  }

  sessionStorage.removeItem(storageKey);
}

function writeSessionItem(storageKey: string, value: string): void {
  if (!hasWindow()) {
    return;
  }

  sessionStorage.setItem(storageKey, value);
}

function readSessionItem(storageKey: string): string | null {
  if (!hasWindow()) {
    return null;
  }

  return sessionStorage.getItem(storageKey);
}

function toMockUser(account: MockAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    firstLogin: account.firstLogin ?? false,
    requiresTwoFactor: account.requiresTwoFactor ?? false,
  };
}

function isMockAccount(value: unknown): value is MockAccount {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.password === 'string' &&
    typeof candidate.role === 'string'
  );
}

function getStoredAccounts(): MockAccount[] {
  const stored = readStorageItem(STORAGE_KEYS.mockAccounts);
  if (!stored) {
    writeStorageItem(STORAGE_KEYS.mockAccounts, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (Array.isArray(parsed)) {
      const validAccounts = parsed.filter(isMockAccount);
      if (validAccounts.length > 0) {
        return validAccounts.map((account) => ({
          ...account,
          email: normalizeEmail(account.email),
        }));
      }
    }
  } catch {
    // Fall through to reseed accounts.
  }

  writeStorageItem(STORAGE_KEYS.mockAccounts, JSON.stringify(DEFAULT_ACCOUNTS));
  return DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
}

function saveAccounts(accounts: MockAccount[]): void {
  writeStorageItem(STORAGE_KEYS.mockAccounts, JSON.stringify(accounts));
}

function findAccountByEmail(email: string): MockAccount | undefined {
  const normalizedEmail = normalizeEmail(email);
  return getStoredAccounts().find((account) => normalizeEmail(account.email) === normalizedEmail);
}

function normalizeApiRole(role: unknown, fallbackRole: UserRole): UserRole {
  const candidate = typeof role === 'string' ? role.toUpperCase().replace(/\s+/g, '_') : '';

  if (candidate in ROLE_DEFAULT_PATHS) {
    return candidate as UserRole;
  }

  return fallbackRole;
}

function normalizeApiUser(email: string, user: unknown): AuthUser | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const payload = user as Record<string, unknown>;
  const fallbackAccount = findAccountByEmail(email);
  const fallbackRole = fallbackAccount?.role ?? 'PARENT';
  const normalizedEmail = typeof payload.email === 'string' ? normalizeEmail(payload.email) : normalizeEmail(email);

  return {
    id: typeof payload.id === 'string' ? payload.id : createToken('user'),
    email: normalizedEmail,
    name:
      typeof payload.name === 'string' && payload.name.trim().length > 0
        ? payload.name
        : normalizedEmail.split('@')[0],
    role: normalizeApiRole(payload.role, fallbackRole),
    firstLogin: payload.firstLogin === true,
    requiresTwoFactor:
      payload.requiresTwoFactor === true ||
      ((fallbackAccount?.requiresTwoFactor ?? false) && !isTrustedDevice(normalizedEmail)),
  };
}

function parsePasswordResetRequest(rawValue: string | null): PasswordResetRequest | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.email !== 'string' ||
      typeof candidate.otp !== 'string' ||
      typeof candidate.expiresAt !== 'number'
    ) {
      return null;
    }

    return {
      email: normalizeEmail(candidate.email),
      otp: candidate.otp,
      expiresAt: candidate.expiresAt,
      token: typeof candidate.token === 'string' ? candidate.token : undefined,
    };
  } catch {
    return null;
  }
}

function parseTwoFactorChallenge(rawValue: string | null): TwoFactorChallenge | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.email !== 'string' ||
      typeof candidate.code !== 'string' ||
      typeof candidate.expiresAt !== 'number'
    ) {
      return null;
    }

    return {
      email: normalizeEmail(candidate.email),
      code: candidate.code,
      expiresAt: candidate.expiresAt,
    };
  } catch {
    return null;
  }
}

function getTrustedDevices(): Record<string, number> {
  const stored = readStorageItem(STORAGE_KEYS.trustedDevices);
  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, number>>((accumulator, [key, value]) => {
      if (typeof value === 'number') {
        accumulator[normalizeEmail(key)] = value;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function persistTrustedDevices(devices: Record<string, number>): void {
  writeStorageItem(STORAGE_KEYS.trustedDevices, JSON.stringify(devices));
}

export function isRegisteredAccount(email: string): boolean {
  return Boolean(findAccountByEmail(email));
}

export function isTrustedDevice(email: string): boolean {
  const trustedDevices = getTrustedDevices();
  const expiration = trustedDevices[normalizeEmail(email)];

  if (!expiration) {
    return false;
  }

  if (Date.now() > expiration) {
    delete trustedDevices[normalizeEmail(email)];
    persistTrustedDevices(trustedDevices);
    return false;
  }

  return true;
}

export function trustDeviceForThirtyDays(email: string): void {
  const trustedDevices = getTrustedDevices();
  trustedDevices[normalizeEmail(email)] = Date.now() + 30 * 24 * 60 * 60 * 1000;
  persistTrustedDevices(trustedDevices);
}

export function getTwoFactorDestinationHint(email: string): string {
  const account = findAccountByEmail(email);
  return account?.phoneHint ?? 'phone/email';
}

export function createTwoFactorChallenge(email: string): void {
  const challenge: TwoFactorChallenge = {
    email: normalizeEmail(email),
    code: FIXED_DEMO_CODE,
    expiresAt: Date.now() + TWO_FACTOR_DURATION_MS,
  };

  writeSessionItem(STORAGE_KEYS.twoFactor, JSON.stringify(challenge));
}

export function clearTwoFactorChallenge(): void {
  removeSessionItem(STORAGE_KEYS.twoFactor);
}

export async function resendTwoFactorChallenge(email: string): Promise<void> {
  await delay(450);
  createTwoFactorChallenge(email);
}

export async function verifyTwoFactorChallenge(code: string): Promise<void> {
  await delay(450);
  const challenge = parseTwoFactorChallenge(readSessionItem(STORAGE_KEYS.twoFactor));

  if (!challenge) {
    throw new AuthFlowError('TWO_FACTOR_EXPIRED', 'Your verification code has expired. Please request a new one.');
  }

  if (Date.now() > challenge.expiresAt) {
    clearTwoFactorChallenge();
    throw new AuthFlowError('TWO_FACTOR_EXPIRED', 'Your verification code has expired. Please request a new one.');
  }

  if (code !== challenge.code) {
    throw new AuthFlowError('TWO_FACTOR_INVALID', 'The verification code you entered is incorrect.');
  }
}

export async function requestPasswordResetOtp(email: string): Promise<void> {
  await delay(450);
  const account = findAccountByEmail(email);

  if (!account) {
    throw new AuthFlowError('EMAIL_NOT_FOUND', 'We could not find a registered account with that email address.');
  }

  const request: PasswordResetRequest = {
    email: account.email,
    otp: FIXED_DEMO_CODE,
    expiresAt: Date.now() + RESET_DURATION_MS,
  };

  writeSessionItem(STORAGE_KEYS.passwordReset, JSON.stringify(request));
}

export async function resendPasswordResetOtp(email: string): Promise<void> {
  await requestPasswordResetOtp(email);
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<string> {
  await delay(450);
  const request = parsePasswordResetRequest(readSessionItem(STORAGE_KEYS.passwordReset));

  if (!request || request.email !== normalizeEmail(email)) {
    throw new AuthFlowError('OTP_INVALID', 'The OTP you entered is not valid for this email address.');
  }

  if (Date.now() > request.expiresAt) {
    removeSessionItem(STORAGE_KEYS.passwordReset);
    throw new AuthFlowError('OTP_EXPIRED', 'This OTP has expired. Please request a new code.');
  }

  if (request.otp !== otp) {
    throw new AuthFlowError('OTP_INVALID', 'The OTP you entered is incorrect.');
  }

  const token = createToken('reset');
  writeSessionItem(
    STORAGE_KEYS.passwordReset,
    JSON.stringify({
      ...request,
      token,
    } satisfies PasswordResetRequest)
  );

  return token;
}

export function getResetRequestByToken(token: string): PasswordResetRequest | null {
  const request = parsePasswordResetRequest(readSessionItem(STORAGE_KEYS.passwordReset));
  if (!request || request.token !== token || Date.now() > request.expiresAt) {
    return null;
  }

  return request;
}

export async function resetPassword(token: string, nextPassword: string): Promise<void> {
  await delay(550);
  const request = getResetRequestByToken(token);
  if (!request) {
    throw new AuthFlowError('RESET_TOKEN_INVALID', 'This reset link is invalid or has expired.');
  }

  const accounts = getStoredAccounts();
  const targetAccountIndex = accounts.findIndex((account) => normalizeEmail(account.email) === request.email);

  if (targetAccountIndex < 0) {
    throw new AuthFlowError('EMAIL_NOT_FOUND', 'We could not find a registered account with that email address.');
  }

  accounts[targetAccountIndex] = {
    ...accounts[targetAccountIndex],
    password: nextPassword,
  };
  saveAccounts(accounts);
  removeSessionItem(STORAGE_KEYS.passwordReset);
}

export function getFriendlyErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof AuthFlowError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export async function authenticateUser(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);

  try {
    const apiResponse = (await api.auth.login(normalizedEmail, password)) as ApiLoginPayload;
    const fallbackAccount = findAccountByEmail(normalizedEmail);
    const normalizedUser = normalizeApiUser(normalizedEmail, apiResponse.user);

    if (apiResponse.token && normalizedUser) {
      return {
        token: apiResponse.token,
        tenantId: apiResponse.tenantId ?? fallbackAccount?.tenantId ?? null,
        user: normalizedUser,
      };
    }
  } catch {
    // Fall back to the local mock directory when the API is unavailable or incomplete.
  }

  await delay(500);
  const account = findAccountByEmail(normalizedEmail);

  if (!account || account.password !== password) {
    throw new AuthFlowError('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  return {
    token: createToken('mock-jwt'),
    tenantId: account.tenantId ?? null,
    user: {
      ...toMockUser(account),
      requiresTwoFactor: (account.requiresTwoFactor ?? false) && !isTrustedDevice(account.email),
    },
  };
}
