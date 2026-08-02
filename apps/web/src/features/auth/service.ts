import { api } from '../../services/api';
import { authClient } from './auth-client';
import type { AuthErrorCode, UserRole } from './types';
import { normalizeEmail } from './utils';

interface PendingPasswordReset {
  email: string;
  token: string;
  expiresAt: number;
}

const RESET_DURATION_MS = 5 * 60 * 1000;

const STORAGE_KEYS = {
  passwordReset: 'tms_password_reset_request',
} as const;

// Keys written by earlier builds that shipped a local mock account directory.
const LEGACY_STORAGE_KEYS = ['tms_mock_accounts', 'tms_two_factor_challenge'] as const;

export const ROLE_DEFAULT_PATHS: Record<UserRole, string> = {
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

export async function requestTwoFactorCode(_email: string): Promise<void> {
  try {
    const result = await authClient.twoFactor.sendOtp();
    if (result.error) throw result.error;
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

export async function verifyTwoFactorChallenge(_email: string, code: string, trustDevice = false): Promise<void> {
  try {
    const result = await authClient.twoFactor.verifyOtp({ code, trustDevice });
    if (result.error) throw result.error;
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
