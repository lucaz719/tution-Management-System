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

// Fixed-window in-memory rate limiter. Sufficient for a single-process dev/small
// deployment; swap for a shared store (Redis) when the API runs multi-instance.
interface WindowEntry {
  count: number;
  windowStart: number;
}

const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const windows = new Map<string, WindowEntry>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    windows.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now - entry.windowStart > RATE_WINDOW_MS) {
      windows.delete(key);
    }
  }
}, RATE_WINDOW_MS).unref();
