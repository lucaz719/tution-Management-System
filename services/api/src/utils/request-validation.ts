export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type FieldRule = {
  required?: boolean;
  minLength?: number;
  maxLength: number;
  pattern?: RegExp;
  normalize?: (value: string) => string;
  message: string;
};

type ObjectSchema<T extends Record<string, string>> = {
  fields: { [K in keyof T]: FieldRule };
  allowUnknown?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStrictKeys(
  body: unknown,
  allowedKeys: readonly string[],
): ValidationResult<Record<string, unknown>> {
  if (!isPlainObject(body)) return { success: false, error: 'Request body must be a JSON object.' };
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(body).find((key) => !allowed.has(key));
  if (unexpected) return { success: false, error: `Unexpected field: ${unexpected}.` };
  return { success: true, data: body };
}

export function parsePlainRecord(body: unknown): ValidationResult<Record<string, unknown>> {
  if (!isPlainObject(body)) return { success: false, error: 'Value must be a JSON object.' };
  return { success: true, data: body };
}

export function readBoolean(
  body: Record<string, unknown>,
  key: string,
  message: string,
): ValidationResult<boolean> {
  return typeof body[key] === 'boolean'
    ? { success: true, data: body[key] as boolean }
    : { success: false, error: message };
}

export function readTrimmedString(
  body: Record<string, unknown>,
  key: string,
  options: { required?: boolean; minLength?: number; maxLength: number; pattern?: RegExp; message: string },
): ValidationResult<string> {
  const raw = body[key];
  if (raw === undefined && !options.required) return { success: true, data: '' };
  if (typeof raw !== 'string') return { success: false, error: options.message };
  const value = raw.trim();
  if (
    (options.required && !value) ||
    (options.minLength !== undefined && value.length < options.minLength) ||
    value.length > options.maxLength ||
    (options.pattern && !options.pattern.test(value))
  ) return { success: false, error: options.message };
  return { success: true, data: value };
}

export function readFiniteNumber(
  body: Record<string, unknown>,
  key: string,
  options: { min: number; max: number; message: string },
): ValidationResult<number> {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < options.min || value > options.max) {
    return { success: false, error: options.message };
  }
  return { success: true, data: value };
}

/**
 * Small dependency-free schema boundary for sensitive JSON endpoints. It rejects
 * non-object payloads, unexpected fields, non-string values, and oversized input
 * before route business logic sees the request.
 */
export function parseStrictObject<T extends Record<string, string>>(
  body: unknown,
  schema: ObjectSchema<T>,
): ValidationResult<T> {
  if (!isPlainObject(body)) return { success: false, error: 'Request body must be a JSON object.' };

  const allowed = new Set(Object.keys(schema.fields));
  if (!schema.allowUnknown) {
    const unexpected = Object.keys(body).find((key) => !allowed.has(key));
    if (unexpected) return { success: false, error: `Unexpected field: ${unexpected}.` };
  }

  const data: Record<string, string> = {};
  for (const [key, rule] of Object.entries(schema.fields)) {
    const raw = body[key];
    if (raw === undefined && !rule.required) continue;
    if (typeof raw !== 'string') return { success: false, error: rule.message };
    const value = rule.normalize ? rule.normalize(raw) : raw;
    if (
      (rule.required && !value) ||
      (rule.minLength !== undefined && value.length < rule.minLength) ||
      value.length > rule.maxLength ||
      (rule.pattern && !rule.pattern.test(value))
    ) {
      return { success: false, error: rule.message };
    }
    data[key] = value;
  }

  return { success: true, data: data as T };
}

const emailRule: FieldRule = {
  required: true,
  maxLength: 254,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  normalize: (value) => value.trim().toLowerCase(),
  message: 'A valid email address is required.',
};

export const authInputSchemas = {
  forgotPassword: {
    fields: { email: emailRule },
  } satisfies ObjectSchema<{ email: string }>,
  verifyResetOtp: {
    fields: {
      email: emailRule,
      otp: {
        required: true,
        maxLength: 10,
        pattern: /^\d{6}$/,
        normalize: (value) => value.trim(),
        message: 'A valid six-digit OTP is required.',
      },
    },
  } satisfies ObjectSchema<{ email: string; otp: string }>,
  resetPassword: {
    fields: {
      resetToken: {
        required: true,
        minLength: 32,
        maxLength: 256,
        pattern: /^[A-Za-z0-9_-]+$/,
        message: 'A valid reset token is required.',
      },
      newPassword: {
        required: true,
        minLength: 8,
        maxLength: 128,
        message: 'A valid new password is required.',
      },
    },
  } satisfies ObjectSchema<{ resetToken: string; newPassword: string }>,
};
