import crypto from 'crypto';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

export type VerificationPurpose = 'PASSWORD_RESET' | 'RESET_TOKEN' | 'TWO_FACTOR';

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
