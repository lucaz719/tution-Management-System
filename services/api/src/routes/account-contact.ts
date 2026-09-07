import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from '../utils/db';
import { authMiddleware } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenant';
import { isTenantAdmin } from '../utils/access-control';
import { consumePersistentRateLimit } from '../utils/persistent-rate-limit';
import { generateOtpCode, hashCode } from '../utils/otp';
import { getSmsSender, normaliseAakashPhoneNumber } from '../utils/sms';

const router = Router();
const purpose = 'ACCOUNT_MOBILE_CHANGE';
const binding = (tenant: string, user: string, oldPhone: string, newPhone: string, passwordHash: string) =>
  JSON.stringify({ tenant, user, oldPhone, newPhone, credential: hashCode(passwordHash) });

router.post('/mobile/start', authMiddleware, async (req: TenantRequest, res) => {
  if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Tenant Admin access required.' });
  try {
    const limit = await consumePersistentRateLimit(`contact-change:${req.tenantId}:${req.user!.id}`, 15 * 60_000, 5);
    if (!limit.allowed) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    if (typeof req.body?.password !== 'string' || req.body.password.length > 128 || typeof req.body?.phone !== 'string') return res.status(400).json({ error: 'Enter your password and new mobile number.' });
    const user = await prisma.user.findFirst({ where: { id: req.user!.id, tenantId: req.tenantId! } });
    const credential = await prisma.account.findFirst({ where: { userId: req.user!.id, providerId: 'credential' } });
    if (!user || !credential?.password || !await bcrypt.compare(req.body.password, credential.password)) return res.status(403).json({ error: 'Your current password is incorrect.' });
    const phone = normaliseAakashPhoneNumber(req.body.phone);
    const oldPhone = normaliseAakashPhoneNumber(user.phone);
    if (!/^\d{10}$/.test(phone) || phone === oldPhone) return res.status(400).json({ error: 'Enter a different, valid Nepali mobile number.' });
    if (!/^\d{10}$/.test(oldPhone)) return res.status(409).json({ error: 'Your account needs assisted contact recovery before its security mobile can be changed.' });
    if (process.env.SMS_PROVIDER?.toUpperCase() !== 'AAKASH' || !process.env.AAKASH_SMS_AUTH_TOKEN) return res.status(503).json({ error: 'SMS verification is not configured. No account changes were made.' });
    const oldCode = generateOtpCode(); const newCode = generateOtpCode();
    const identifier = binding(req.tenantId!, user.id, user.phone, phone, credential.password);
    const challenge = await prisma.verificationCode.create({ data: { identifier, purpose, codeHash: hashCode(`${oldCode}:${newCode}`), expiresAt: new Date(Date.now() + 300_000) } });
    const sender = getSmsSender();
    const oldDelivery = await sender.sendSms(oldPhone, `TMS: ${oldCode} authorizes changing your security mobile to ******${phone.slice(-4)}. Expires in 5 minutes. Do not share.`);
    const newDelivery = oldDelivery.success ? await sender.sendSms(phone, `TMS: ${newCode} verifies your new security mobile. Expires in 5 minutes. Do not share.`) : { success: false };
    if (!oldDelivery.success || !newDelivery.success) {
      await prisma.verificationCode.updateMany({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      return res.status(503).json({ error: 'SMS could not be delivered. Your number is unchanged. Please try again.' });
    }
    return res.json({ challengeId: challenge.id, currentDestination: `******${oldPhone.slice(-4)}`, newDestination: `******${phone.slice(-4)}`, expiresIn: 300 });
  } catch { return res.status(500).json({ error: 'Unable to start verification. Please try again.' }); }
});

router.post('/mobile/confirm', authMiddleware, async (req: TenantRequest, res) => {
  if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Tenant Admin access required.' });
  const { challengeId, currentCode, newCode } = req.body ?? {};
  if (typeof challengeId !== 'string' || !/^\d{6}$/.test(currentCode) || !/^\d{6}$/.test(newCode)) return res.status(400).json({ error: 'Enter both six-digit codes.' });
  try {
    const result = await prisma.$transaction(async tx => {
      const record = await tx.verificationCode.findFirst({ where: { id: challengeId, purpose, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } } });
      if (!record) return false;
      const data = JSON.parse(record.identifier);
      if (data.tenant !== req.tenantId || data.user !== req.user!.id) return false;
      const credential = await tx.account.findFirst({ where: { userId: req.user!.id, providerId: 'credential' } });
      if (!credential?.password || hashCode(credential.password) !== data.credential) return false;
      const valid = crypto.timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(hashCode(`${currentCode}:${newCode}`)));
      const claim = await tx.verificationCode.updateMany({ where: { id: record.id, consumedAt: null, attempts: record.attempts, expiresAt: { gt: new Date() } }, data: valid ? { consumedAt: new Date() } : { attempts: { increment: 1 } } });
      if (!valid || claim.count !== 1) return false;
      const changed = await tx.user.updateMany({ where: { id: req.user!.id, tenantId: req.tenantId!, phone: data.oldPhone }, data: { phone: data.newPhone } });
      if (changed.count !== 1) return false;
      await tx.verificationCode.updateMany({ where: { purpose: 'PAYMENT_SETTINGS', identifier: { startsWith: `payment:${req.tenantId}:${req.user!.id}:` }, consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.session.deleteMany({ where: { userId: req.user!.id } });
      return true;
    });
    return result ? res.json({ success: true, signInRequired: true }) : res.status(400).json({ error: 'The codes are incorrect, expired, or already used. Request new codes after five failed attempts.' });
  } catch { return res.status(500).json({ error: 'Unable to confirm this change. Please try again.' }); }
});
export default router;
