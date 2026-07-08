import type { PasswordRule } from './types';

const EMAIL_PATTERN = new RegExp(
  "^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\u0001-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u0021\\u0023-\\u005B\\u005D-\\u007F]|\\\\[\\u0001-\\u0009\\u000B\\u000C\\u000E-\\u007F])*\")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}|(?:\\d{1,3}\\.){3}\\d{1,3})$"
);

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'min-length', label: 'Minimum 8 characters', test: (password) => password.length >= 8 },
  { id: 'uppercase', label: 'At least one uppercase letter (A–Z)', test: (password) => /[A-Z]/.test(password) },
  { id: 'lowercase', label: 'At least one lowercase letter (a–z)', test: (password) => /[a-z]/.test(password) },
  { id: 'number', label: 'At least one number (0–9)', test: (password) => /\d/.test(password) },
  { id: 'special', label: 'At least one special character (!@#$%^&*)', test: (password) => /[!@#$%^&*]/.test(password) },
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export function maskEmail(email: string): string {
  const [localPart, domainPart = ''] = normalizeEmail(email).split('@');
  if (!localPart || !domainPart) {
    return email;
  }

  const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
  const maskedLocal = `${visibleLocal}${'*'.repeat(Math.max(1, localPart.length - visibleLocal.length))}`;
  return `${maskedLocal}@${domainPart}`;
}

export function getPasswordRuleResults(password: string): boolean[] {
  return PASSWORD_RULES.map((rule) => rule.test(password));
}

export function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: '' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
} {
  const passedRules = getPasswordRuleResults(password).filter(Boolean).length;

  if (passedRules === 0) {
    return { score: 0, label: '', color: 'rgba(15, 76, 138, 0.12)' };
  }

  if (passedRules <= 2) {
    return { score: 1, label: 'Weak', color: 'var(--color-error)' };
  }

  if (passedRules === 3) {
    return { score: 2, label: 'Fair', color: 'var(--color-warning)' };
  }

  if (passedRules === 4) {
    return { score: 3, label: 'Good', color: '#1F8A87' };
  }

  return { score: 4, label: 'Strong', color: 'var(--color-success)' };
}
