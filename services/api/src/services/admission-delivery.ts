import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from '../utils/db';
import smsSender from '../utils/sms';
import { oneYearEnrollmentWindow } from '../utils/billing-rules';
import { reconcileBranchBillingAccess } from './billing-access';
import { encryptDeliveryPayload, decryptDeliveryPayload } from '../utils/delivery-payload';

const LEASE_MS = 120_000;

/** Persist credential hashes and encrypted messages in one transaction. */
export async function prepareAdmissionDeliveries(tenantId: string, studentId: string) {
  if (!tenantId || !studentId) throw new Error('Institution and admission are required.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT s."id" FROM "Student" s JOIN "User" u ON u."id" = s."userId" WHERE s."id" = ${studentId} AND u."tenantId" = ${tenantId} FOR UPDATE OF s`;
    const student = await tx.student.findFirst({
      where: { id: studentId, user: { tenantId } },
      include: { user: true, studentParents: { include: { parent: { include: { user: true } } } },
        invoices: { where: { tenantId, invoiceType: 'ADMISSION' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!student) throw new Error('Admission not found.');
    const invoice = student.invoices[0];
    if (invoice?.status !== 'PAID' || !invoice.paymentDate) throw new Error('Admission payment must be recorded before logins can be issued.');
    const parent = student.studentParents[0]?.parent.user;
    if (!parent) throw new Error('A linked parent account is required before issuing logins.');
    const jobs = await tx.admissionLoginDelivery.findMany({ where: { tenantId, studentId } });
    const recipients = [{ recipient: 'STUDENT' as const, user: student.user }, { recipient: 'PARENT' as const, user: parent }];
    let pending = false;
    for (const { recipient, user } of recipients) {
      const existing = jobs.find(job => job.recipient === recipient);
      if (existing?.status === 'SENT') continue;
      pending = true;
      // Preserve messages and credentials across every retry/crash window.
      if (existing?.encryptedPayload) continue;
      const id = existing?.id ?? crypto.randomUUID();
      const password = `Tms@${crypto.randomBytes(18).toString('base64url')}7`;
      const hash = await bcrypt.hash(password, 10);
      const encryptedPayload = encryptDeliveryPayload(id, {
        phone: user.phone,
        message: `TMS admission approved. ${recipient === 'STUDENT' ? 'Student' : 'Parent'} login ID: ${user.email}. Temporary password: ${password}`,
      });
      await tx.user.update({ where: { id: user.id }, data: { status: 'INACTIVE', passwordHash: hash } });
      const account = await tx.account.updateMany({ where: { userId: user.id, providerId: 'credential' }, data: { password: hash } });
      if (account.count !== 1) throw new Error('Admission credential account is missing or ambiguous.');
      await tx.admissionLoginDelivery.upsert({
        where: { studentId_recipient: { studentId, recipient } },
        create: { id, tenantId, studentId, recipientUserId: user.id, recipient, encryptedPayload },
        update: { recipientUserId: user.id, encryptedPayload, status: 'PENDING', failureReason: null, leaseToken: null, leaseUntil: null, nextAttemptAt: new Date() },
      });
    }
    if (pending) {
      // Recover legacy ACTIVE admissions interrupted before delivery logs.
      await tx.student.update({ where: { id: studentId }, data: { admissionStatus: 'READY_FOR_LOGIN' } });
      await tx.enrollment.updateMany({ where: { studentId, status: 'ACTIVE' }, data: { status: 'BLOCKED' } });
    }
    await tx.enrollment.updateMany({ where: { studentId, status: { in: ['BLOCKED', 'ACTIVE'] }, validUntil: null }, data: oneYearEnrollmentWindow(invoice.paymentDate) });
    return { studentPhone: student.user.phone, parentPhone: parent.phone };
  }, { timeout: 15_000 });
}

/** Atomic claim, expiring lease, and fenced completion for competing workers. */
export async function sendAdmissionDelivery(id: string, tenantId: string, now = new Date()) {
  const token = crypto.randomUUID();
  const claim = await prisma.admissionLoginDelivery.updateMany({
    where: { id, tenantId, status: { in: ['PENDING', 'FAILED'] }, encryptedPayload: { not: null },
      nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
    data: { leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS), lastAttemptAt: now, attemptCount: { increment: 1 } },
  });
  if (claim.count !== 1) return;
  const job = await prisma.admissionLoginDelivery.findFirstOrThrow({ where: { id, tenantId, leaseToken: token } });
  let result: { success: boolean; messageId?: string };
  try {
    const payload = decryptDeliveryPayload(id, job.encryptedPayload!);
    result = await smsSender.sendSms(payload.phone, payload.message);
  } catch { result = { success: false }; }
  const completedAt = new Date();
  // Acceptance before a crash may cause a resend of the SAME message.
  await prisma.$transaction(async tx => {
    const updated = await tx.admissionLoginDelivery.updateMany({
      where: { id, tenantId, leaseToken: token, status: { not: 'SENT' } },
      data: {
        status: result.success ? 'SENT' : 'FAILED', providerMessageId: result.messageId ?? null,
        failureReason: result.success ? null : 'SMS delivery failed. Verify recipient, provider, and delivery key configuration.',
        sentAt: result.success ? completedAt : null, encryptedPayload: result.success ? null : job.encryptedPayload,
        leaseToken: null, leaseUntil: null,
        nextAttemptAt: new Date(completedAt.getTime() + Math.min(3600, 30 * 2 ** Math.min(job.attemptCount, 7)) * 1000),
      },
    });
    if (updated.count === 1 && result.success) await tx.user.update({ where: { id: job.recipientUserId }, data: { status: 'ACTIVE' } });
  });
}

/** Repeatable finalization after both recipient results have committed. */
export async function finalizeAdmissionDeliveries(tenantId: string, studentId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT s."id" FROM "Student" s JOIN "User" u ON u."id" = s."userId" WHERE s."id" = ${studentId} AND u."tenantId" = ${tenantId} FOR UPDATE OF s`;
    const jobs = await tx.admissionLoginDelivery.findMany({ where: { tenantId, studentId } });
    const complete = ['STUDENT', 'PARENT'].every(recipient => jobs.some(job => job.recipient === recipient && job.status === 'SENT'));
    if (complete) {
      const activated = await tx.student.updateMany({ where: { id: studentId, user: { tenantId }, admissionStatus: 'READY_FOR_LOGIN' }, data: { admissionStatus: 'ACTIVE' } });
      if (activated.count === 1) {
        const enrollments = await tx.enrollment.findMany({ where: { studentId, class: { course: { tenantId } } }, select: { class: { select: { branchId: true } } } });
        for (const branchId of new Set(enrollments.map(entry => entry.class.branchId))) await reconcileBranchBillingAccess(tx, tenantId, studentId, branchId);
      }
    }
    return {
      delivered: complete,
      failures: jobs.filter(job => job.status !== 'SENT').map(job => `${job.recipient}: ${job.failureReason || 'Delivery queued or in progress.'}`),
      recipients: jobs.map(job => ({ recipient: job.recipient, status: job.status, sentAt: job.sentAt, error: job.failureReason })),
    };
  });
}

export async function activateAdmissionAndSendLogins(tenantId: string, studentId: string) {
  const phones = await prepareAdmissionDeliveries(tenantId, studentId);
  const jobs = await prisma.admissionLoginDelivery.findMany({ where: { tenantId, studentId, status: { not: 'SENT' } }, select: { id: true } });
  for (const job of jobs) await sendAdmissionDelivery(job.id, tenantId);
  return { ...phones, ...await finalizeAdmissionDeliveries(tenantId, studentId) };
}

/** Bounded recovery, including paid admissions interrupted before enqueue. */
export async function recoverAdmissionDeliveries(tenantId?: string, limit = 50) {
  const students = await prisma.student.findMany({
    where: {
      ...(tenantId ? { user: { tenantId } } : {}), invoices: { some: { invoiceType: 'ADMISSION', status: 'PAID' } },
      OR: [
        { admissionStatus: { not: 'ACTIVE' } },
        { loginDeliveries: { some: { status: { not: 'SENT' } } } },
        { loginDeliveries: { none: { recipient: 'STUDENT', status: 'SENT' } } },
        { loginDeliveries: { none: { recipient: 'PARENT', status: 'SENT' } } },
      ],
    },
    select: { id: true, user: { select: { tenantId: true } } },
    orderBy: { updatedAt: 'asc' }, take: Math.min(Math.max(limit, 1), 100),
  });
  let delivered = 0; let failed = 0;
  for (const student of students) {
    try { if ((await activateAdmissionAndSendLogins(student.user.tenantId, student.id)).delivered) delivered++; }
    catch { failed++; }
  }
  return { checked: students.length, delivered, failed };
}
