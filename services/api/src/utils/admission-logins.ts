import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from './db';
import smsSender from './sms';
import { canReleaseAdmissionLogins, oneYearEnrollmentWindow } from './billing-rules';

function temporaryPassword(): string {
  return `Tms@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
}

type SmsDeliveryResult = { success: boolean; messageId?: string; error?: string };
type StoredDelivery = {
  recipient: 'STUDENT' | 'PARENT';
  status: 'PENDING' | 'SENT' | 'FAILED';
  providerMessageId: string | null;
  failureReason: string | null;
  sentAt: Date | null;
};

export async function activateAdmissionAndSendLogins(tenantId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { tenantId } },
    include: {
      user: true,
      studentParents: { include: { parent: { include: { user: true } } } },
      invoices: { where: { invoiceType: 'ADMISSION' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!student) throw new Error('Admission not found.');
  if (!canReleaseAdmissionLogins(student.admissionStatus, student.invoices[0]?.status)) {
    throw new Error('Admission payment must be recorded before logins can be issued.');
  }
  const parentUser = student.studentParents[0]?.parent.user;
  if (!parentUser) throw new Error('A linked parent account is required before issuing logins.');
  const paidAt = student.invoices[0]?.paymentDate;
  if (!paidAt) throw new Error('The admission payment date is missing. Record the payment again before issuing logins.');
  const enrollmentWindow = oneYearEnrollmentWindow(paidAt);

  const storedDeliveries = await prisma.$queryRaw<StoredDelivery[]>`
    SELECT "recipient", "status", "providerMessageId", "failureReason", "sentAt"
    FROM "AdmissionLoginDelivery"
    WHERE "tenantId" = ${tenantId} AND "studentId" = ${student.id}
  `;
  const storedStudent = storedDeliveries.find((item) => item.recipient === 'STUDENT');
  const storedParent = storedDeliveries.find((item) => item.recipient === 'PARENT');
  const sendStudent = storedStudent?.status !== 'SENT';
  const sendParent = storedParent?.status !== 'SENT';

  const studentPassword = sendStudent ? temporaryPassword() : null;
  const parentPassword = sendParent ? temporaryPassword() : null;
  const [studentHash, parentHash] = await Promise.all([
    studentPassword ? bcrypt.hash(studentPassword, 10) : Promise.resolve(null),
    parentPassword ? bcrypt.hash(parentPassword, 10) : Promise.resolve(null),
  ]);

  const activated = await prisma.$transaction(async (tx) => {
    const transition = await tx.student.updateMany({
      where: { id: student.id, admissionStatus: 'READY_FOR_LOGIN' },
      data: { admissionStatus: 'ACTIVE' },
    });
    if (transition.count !== 1) return false;
    await tx.user.update({
      where: { id: student.userId },
      data: { status: 'ACTIVE', ...(studentHash ? { passwordHash: studentHash } : {}) },
    });
    if (studentHash) {
      await tx.account.updateMany({ where: { userId: student.userId, providerId: 'credential' }, data: { password: studentHash } });
    }
    await tx.user.update({
      where: { id: parentUser.id },
      data: { status: 'ACTIVE', ...(parentHash ? { passwordHash: parentHash } : {}) },
    });
    if (parentHash) {
      await tx.account.updateMany({ where: { userId: parentUser.id, providerId: 'credential' }, data: { password: parentHash } });
    }
    await tx.enrollment.updateMany({
      where: { studentId: student.id, status: { in: ['BLOCKED', 'ACTIVE'] }, validUntil: null },
      data: { status: 'ACTIVE', ...enrollmentWindow },
    });
    return true;
  });
  if (!activated) throw new Error('Admission logins were already issued.');

  // Send sequentially so the provider applies credit updates deterministically.
  // A recipient already recorded as SENT is never charged or messaged again.
  const studentDelivery: SmsDeliveryResult = sendStudent
    ? await smsSender.sendSms(student.user.phone, `TMS admission approved. Student login ID: ${student.user.email}. Temporary password: ${studentPassword}`)
    : { success: true, messageId: storedStudent?.providerMessageId ?? undefined };
  const parentDelivery: SmsDeliveryResult = sendParent
    ? await smsSender.sendSms(parentUser.phone, `TMS admission approved. Parent login ID: ${parentUser.email}. Temporary password: ${parentPassword}`)
    : { success: true, messageId: storedParent?.providerMessageId ?? undefined };
  const delivered = studentDelivery.success && parentDelivery.success;
  const failures = [
    ...(!studentDelivery.success ? [`Student SMS: ${studentDelivery.error || 'delivery failed.'}`] : []),
    ...(!parentDelivery.success ? [`Parent SMS: ${parentDelivery.error || 'delivery failed.'}`] : []),
  ];
  const attemptedAt = new Date();
  const recipients = [
    { recipient: 'STUDENT', userId: student.userId, delivery: studentDelivery, attempted: sendStudent, previous: storedStudent },
    { recipient: 'PARENT', userId: parentUser.id, delivery: parentDelivery, attempted: sendParent, previous: storedParent },
  ] as const;

  await prisma.$transaction(async (tx) => {
    for (const item of recipients) {
      if (!item.attempted) continue;
      const status = item.delivery.success ? 'SENT' : 'FAILED';
      const messageId = item.delivery.messageId ?? null;
      const failureReason = item.delivery.success ? null : item.delivery.error ?? 'Delivery failed.';
      const sentAt = item.delivery.success ? attemptedAt : null;
      await tx.$executeRaw`
        INSERT INTO "AdmissionLoginDelivery" (
          "id", "tenantId", "studentId", "recipientUserId", "recipient", "channel", "provider",
          "status", "providerMessageId", "failureReason", "attemptCount", "lastAttemptAt", "sentAt", "createdAt", "updatedAt"
        ) VALUES (
          ${crypto.randomUUID()}, ${tenantId}, ${student.id}, ${item.userId}, ${item.recipient}::"AdmissionLoginRecipient",
          'SMS', 'AAKASH', ${status}::"NotificationDeliveryStatus", ${messageId}, ${failureReason}, 1,
          ${attemptedAt}, ${sentAt}, ${attemptedAt}, ${attemptedAt}
        )
        ON CONFLICT ("studentId", "recipient") DO UPDATE SET
          "recipientUserId" = EXCLUDED."recipientUserId",
          "status" = EXCLUDED."status",
          "providerMessageId" = EXCLUDED."providerMessageId",
          "failureReason" = EXCLUDED."failureReason",
          "attemptCount" = "AdmissionLoginDelivery"."attemptCount" + 1,
          "lastAttemptAt" = EXCLUDED."lastAttemptAt",
          "sentAt" = EXCLUDED."sentAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `;
    }

    await tx.user.update({ where: { id: student.userId }, data: { status: studentDelivery.success ? 'ACTIVE' : 'INACTIVE' } });
    await tx.user.update({ where: { id: parentUser.id }, data: { status: parentDelivery.success ? 'ACTIVE' : 'INACTIVE' } });
    if (delivered) {
      await tx.enrollment.updateMany({ where: { studentId: student.id, status: 'BLOCKED' }, data: { status: 'ACTIVE' } });
    } else {
      await tx.student.update({ where: { id: student.id }, data: { admissionStatus: 'READY_FOR_LOGIN' } });
      await tx.enrollment.updateMany({ where: { studentId: student.id, status: 'ACTIVE' }, data: { status: 'BLOCKED' } });
    }
  });

  return {
    delivered,
    studentPhone: student.user.phone,
    parentPhone: parentUser.phone,
    failures,
    recipients: recipients.map((item) => ({
      recipient: item.recipient,
      status: item.delivery.success ? 'SENT' as const : 'FAILED' as const,
      sentAt: item.attempted
        ? item.delivery.success ? attemptedAt : null
        : item.previous?.sentAt ?? null,
      error: item.delivery.success ? null : item.delivery.error ?? 'Delivery failed.',
    })),
  };
}
