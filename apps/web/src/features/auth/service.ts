import { api } from '../../services/api';
import type { AuthErrorCode, AuthSession, AuthUser, UserRole } from './types';
import { normalizeEmail } from './utils';

interface PendingPasswordReset {
  email: string;
  token: string;
  expiresAt: number;
}

interface ApiLoginPayload {
  token?: string;
  tenantId?: string | null;
  user?: unknown;
}

const RESET_DURATION_MS = 5 * 60 * 1000;

const STORAGE_KEYS = {
  passwordReset: 'tms_password_reset_request',
  trustedDevices: 'tms_trusted_devices',
} as const;

// Keys written by earlier builds that shipped a local mock account directory.
const LEGACY_STORAGE_KEYS = ['tms_mock_accounts', 'tms_two_factor_challenge'] as const;

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

if (hasWindow()) {
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(legacyKey);
    sessionStorage.removeItem(legacyKey);
  }
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

function toAuthFlowError(error: unknown, code: AuthErrorCode, fallbackMessage: string): AuthFlowError {
  if (error instanceof AuthFlowError) {
    return error;
  }

  const message =
    error instanceof Error && error.message.trim().length > 0 && !/failed to fetch/i.test(error.message)
      ? error.message
      : fallbackMessage;

  return new AuthFlowError(code, message);
}

function normalizeApiRole(role: unknown): UserRole | null {
  const candidate = typeof role === 'string' ? role.toUpperCase().replace(/\s+/g, '_') : '';

  if (candidate in ROLE_DEFAULT_PATHS) {
    return candidate as UserRole;
  }

  return null;
}

function resolveApiRole(payload: Record<string, unknown>): UserRole | null {
  const directRole = normalizeApiRole(payload.role);
  if (directRole) {
    return directRole;
  }

  if (Array.isArray(payload.roles)) {
    for (const entry of payload.roles) {
      const roleName =
        entry && typeof entry === 'object' ? (entry as Record<string, unknown>).roleName : entry;
      const normalized = normalizeApiRole(roleName);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function normalizeApiUser(email: string, user: unknown): AuthUser | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const payload = user as Record<string, unknown>;
  const normalizedEmail = typeof payload.email === 'string' ? normalizeEmail(payload.email) : normalizeEmail(email);

  const role = resolveApiRole(payload);
  if (!role) {
    return null;
  }

  const fullName = [payload.firstName, payload.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ');

  return {
    id: typeof payload.id === 'string' ? payload.id : normalizedEmail,
    email: normalizedEmail,
    name:
      typeof payload.name === 'string' && payload.name.trim().length > 0
        ? payload.name
        : fullName || normalizedEmail.split('@')[0],
    role,
    firstLogin: payload.firstLogin === true,
    requiresTwoFactor: payload.requiresTwoFactor === true && !isTrustedDevice(normalizedEmail),
  };
}

function parsePendingPasswordReset(rawValue: string | null): PendingPasswordReset | null {
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
      typeof candidate.token !== 'string' ||
      typeof candidate.expiresAt !== 'number'
    ) {
      return null;
    }

    return {
      email: normalizeEmail(candidate.email),
      token: candidate.token,
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

export async function requestTwoFactorCode(email: string): Promise<void> {
  try {
    await api.auth.requestTwoFactorCode(normalizeEmail(email));
  } catch (error) {
    throw toAuthFlowError(
      error,
      'TWO_FACTOR_EXPIRED',
      'Unable to send a verification code right now. Please try again.'
    );
  }
}

export async function resendTwoFactorChallenge(email: string): Promise<void> {
  await requestTwoFactorCode(email);
}

export async function verifyTwoFactorChallenge(email: string, code: string): Promise<void> {
  try {
    await api.auth.verifyTwoFactorCode(normalizeEmail(email), code);
  } catch (error) {
    throw toAuthFlowError(error, 'TWO_FACTOR_INVALID', 'The verification code you entered is incorrect.');
  }
}

export async function requestPasswordResetOtp(email: string): Promise<void> {
  try {
    await api.auth.requestPasswordReset(normalizeEmail(email));
  } catch (error) {
    throw toAuthFlowError(error, 'EMAIL_NOT_FOUND', 'Unable to send the OTP right now. Please try again.');
  }
}

export async function resendPasswordResetOtp(email: string): Promise<void> {
  await requestPasswordResetOtp(email);
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<string> {
  let resetToken: unknown;

  try {
    const response = await api.auth.verifyPasswordResetOtp(normalizeEmail(email), otp);
    resetToken = response.resetToken;
  } catch (error) {
    throw toAuthFlowError(error, 'OTP_INVALID', 'The OTP could not be verified. Please try again.');
  }

  if (typeof resetToken !== 'string' || resetToken.length === 0) {
    throw new AuthFlowError('OTP_INVALID', 'The server did not return a reset token. Please try again.');
  }

  const pendingReset: PendingPasswordReset = {
    email: normalizeEmail(email),
    token: resetToken,
    expiresAt: Date.now() + RESET_DURATION_MS,
  };
  writeSessionItem(STORAGE_KEYS.passwordReset, JSON.stringify(pendingReset));

  return resetToken;
}

// Client-side record of a server-verified OTP, used only to gate the reset form UI.
// The reset token itself is validated again by the server on submission.
export function getResetRequestByToken(token: string): PendingPasswordReset | null {
  const request = parsePendingPasswordReset(readSessionItem(STORAGE_KEYS.passwordReset));
  if (!request || request.token !== token || Date.now() > request.expiresAt) {
    return null;
  }

  return request;
}

export async function resetPassword(token: string, nextPassword: string): Promise<void> {
  try {
    await api.auth.resetPassword(token, nextPassword);
  } catch (error) {
    throw toAuthFlowError(
      error,
      'RESET_TOKEN_INVALID',
      'Unable to reset the password right now. Please try again.'
    );
  }

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

  let apiResponse: ApiLoginPayload;
  try {
    apiResponse = (await api.auth.login(normalizedEmail, password)) as ApiLoginPayload;
  } catch (error) {
    throw toAuthFlowError(error, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const user = normalizeApiUser(normalizedEmail, apiResponse.user);

  if (!apiResponse.token || !user) {
    throw new AuthFlowError(
      'INVALID_CREDENTIALS',
      'Sign-in could not be completed because the server response was incomplete. Contact your administrator.'
    );
  }

  const rawUser = apiResponse.user as Record<string, unknown>;
  const payloadTenantId = typeof rawUser.tenantId === 'string' ? rawUser.tenantId : null;

  return {
    token: apiResponse.token,
    tenantId: apiResponse.tenantId ?? payloadTenantId,
    user,
  };
}
