import { Router, Response } from 'express';
import prisma from '../utils/db';
import bcrypt from 'bcryptjs';
import { TenantRequest } from '../middleware/tenant';
import { sendVerificationCode } from '../utils/delivery';
import {
  MAX_CODE_ATTEMPTS,
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS,
  generateOtpCode,
  generateResetToken,
  hashCode,
  type VerificationPurpose,
} from '../utils/otp';
import { consumePersistentRateLimit } from '../utils/persistent-rate-limit';
import { authInputSchemas, parseStrictObject } from '../utils/request-validation';

const router = Router();

function rateKey(req: TenantRequest, scope: string, email: string): string {
  return `${scope}:${email}:${req.ip ?? 'unknown'}`;
}

// Password policy mirrored from the web client (apps/web/src/features/auth/utils.ts).
function isPasswordStrongEnough(password: string): boolean {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

async function issueCode(
  identifier: string,
  purpose: VerificationPurpose,
  code: string,
  ttlMs: number
): Promise<void> {
  // A new code invalidates any outstanding one for the same identifier+purpose.
  await prisma.$transaction([
    prisma.verificationCode.updateMany({
      where: { identifier, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.verificationCode.create({
      data: {
        identifier,
        purpose,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ]);
}

type ConsumeResult = 'ok' | 'invalid' | 'expired' | 'locked';

async function consumeCode(
  identifier: string,
  purpose: VerificationPurpose,
  code: string
): Promise<ConsumeResult> {
  const record = await prisma.verificationCode.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return 'invalid';
  }

  if (record.expiresAt < new Date()) {
    return 'expired';
  }

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    return 'locked';
  }

  if (record.codeHash !== hashCode(code)) {
    const attempt = await prisma.verificationCode.updateMany({
      where: {
        id: record.id,
        consumedAt: null,
        attempts: record.attempts,
        expiresAt: { gt: new Date() },
      },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count === 1) return 'invalid';
    const current = await prisma.verificationCode.findUnique({ where: { id: record.id } });
    return current && current.consumedAt === null && current.attempts >= MAX_CODE_ATTEMPTS
      ? 'locked'
      : 'invalid';
  }

  const consumed = await prisma.verificationCode.updateMany({
    where: {
      id: record.id,
      consumedAt: null,
      attempts: record.attempts,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  return consumed.count === 1 ? 'ok' : 'invalid';
}

router.post('/forgot-password', async (req: TenantRequest, res: Response) => {
  const input = parseStrictObject(req.body, authInputSchemas.forgotPassword);
  if (!input.success) return res.status(400).json({ error: input.error });
  const { email } = input.data;

  const limit = await consumePersistentRateLimit(rateKey(req, 'forgot', email), 15 * 60 * 1000, 5);
  if (!limit.allowed) {
    return res
      .set('X-Retry-After', String(limit.retryAfterSeconds))
      .status(429)
      .json({ error: 'Too many OTP requests. Please wait a few minutes and try again.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Only issue a code for real, active accounts — but always answer success
    // so the endpoint cannot be used to enumerate registered emails.
    if (user && user.status === 'ACTIVE') {
      const code = generateOtpCode();
      await issueCode(email, 'PASSWORD_RESET', code, OTP_TTL_MS);
      await sendVerificationCode(email, code, 'PASSWORD_RESET');
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Forgot-password error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/verify-reset-otp', async (req: TenantRequest, res: Response) => {
  const input = parseStrictObject(req.body, authInputSchemas.verifyResetOtp);
  if (!input.success) return res.status(400).json({ error: input.error });
  const { email, otp } = input.data;

  const limit = await consumePersistentRateLimit(rateKey(req, 'verify-reset', email), 15 * 60 * 1000, 5);
  if (!limit.allowed) {
    return res
      .set('X-Retry-After', String(limit.retryAfterSeconds))
      .status(429)
      .json({ error: 'Too many verification attempts. Please wait a few minutes and try again.' });
  }

  try {
    const result = await consumeCode(email, 'PASSWORD_RESET', otp);

    if (result === 'expired') {
      return res.status(410).json({ error: 'This OTP has expired. Please request a new code.' });
    }
    if (result === 'locked') {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    if (result === 'invalid') {
      return res.status(401).json({ error: 'The OTP you entered is incorrect.' });
    }

    const resetToken = generateResetToken();
    await issueCode(email, 'RESET_TOKEN', resetToken, RESET_TOKEN_TTL_MS);

    return res.json({ resetToken });
  } catch (error: any) {
    console.error('Verify-reset-otp error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/reset-password', async (req: TenantRequest, res: Response) => {
  const input = parseStrictObject(req.body, authInputSchemas.resetPassword);
  if (!input.success) return res.status(400).json({ error: input.error });
  const { resetToken, newPassword } = input.data;

  if (!isPasswordStrongEnough(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.',
    });
  }

  try {
    // The token is 256-bit random, so a global hash lookup is safe and lets the
    // client avoid resending the email address.
    const record = await prisma.verificationCode.findFirst({
      where: { purpose: 'RESET_TOKEN', codeHash: hashCode(resetToken), consumedAt: null },
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This reset link is invalid or has expired.' });
    }

    const user = await prisma.user.findUnique({ where: { email: record.identifier } });
    if (!user || user.status !== 'ACTIVE') {
      return res.status(410).json({ error: 'This reset link is invalid or has expired.' });
    }

    const nextPasswordHash = await bcrypt.hash(newPassword, 10);
    const changed = await prisma.$transaction(async (tx) => {
      const consumed = await tx.verificationCode.updateMany({
        where: {
          id: record.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return false;
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: nextPasswordHash },
      });
      await tx.account.upsert({
        where: { providerId_accountId: { providerId: 'credential', accountId: user.id } },
        update: { password: nextPasswordHash },
        create: { accountId: user.id, providerId: 'credential', userId: user.id, password: nextPasswordHash },
      });
      // Invalidate anything else outstanding for this account.
      await tx.verificationCode.updateMany({
        where: { identifier: record.identifier, id: { not: record.id }, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      return true;
    });
    if (!changed) {
      return res.status(410).json({ error: 'This reset link is invalid or has expired.' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Reset-password error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
