import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from './db';
import smsSender from './sms';
import { canReleaseAdmissionLogins } from './billing-rules';

function temporaryPassword(): string {
  return `Tms@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
}

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

  const studentPassword = temporaryPassword();
  const parentPassword = temporaryPassword();
  const [studentHash, parentHash] = await Promise.all([
    bcrypt.hash(studentPassword, 10),
    bcrypt.hash(parentPassword, 10),
  ]);

  const activated = await prisma.$transaction(async (tx) => {
    const transition = await tx.student.updateMany({
      where: { id: student.id, admissionStatus: 'READY_FOR_LOGIN' },
      data: { admissionStatus: 'ACTIVE' },
    });
    if (transition.count !== 1) return false;
    await tx.user.update({ where: { id: student.userId }, data: { status: 'ACTIVE', passwordHash: studentHash } });
    await tx.account.updateMany({ where: { userId: student.userId, providerId: 'credential' }, data: { password: studentHash } });
    await tx.user.update({ where: { id: parentUser.id }, data: { status: 'ACTIVE', passwordHash: parentHash } });
    await tx.account.updateMany({ where: { userId: parentUser.id, providerId: 'credential' }, data: { password: parentHash } });
    await tx.enrollment.updateMany({ where: { studentId: student.id, status: 'BLOCKED' }, data: { status: 'ACTIVE' } });
    return true;
  });
  if (!activated) throw new Error('Admission logins were already issued.');

  const [studentDelivery, parentDelivery] = await Promise.all([
    smsSender.sendSms(student.user.phone, `TMS admission approved. Student login ID: ${student.user.email}. Temporary password: ${studentPassword}`),
    smsSender.sendSms(parentUser.phone, `TMS admission approved. Parent login ID: ${parentUser.email}. Temporary password: ${parentPassword}`),
  ]);
  const delivered = studentDelivery.success && parentDelivery.success;
  const failures = [
    ...(!studentDelivery.success ? [`Student SMS: ${studentDelivery.error || 'delivery failed.'}`] : []),
    ...(!parentDelivery.success ? [`Parent SMS: ${parentDelivery.error || 'delivery failed.'}`] : []),
  ];
  const attemptedAt = new Date();
  const recipients = [
    { recipient: 'STUDENT', userId: student.userId, phone: student.user.phone, delivery: studentDelivery },
    { recipient: 'PARENT', userId: parentUser.id, phone: parentUser.phone, delivery: parentDelivery },
  ] as const;

  await prisma.$transaction(async (tx) => {
    for (const item of recipients) {
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

    if (!delivered) {
      await tx.student.update({ where: { id: student.id }, data: { admissionStatus: 'READY_FOR_LOGIN' } });
      await tx.user.updateMany({ where: { id: { in: [student.userId, parentUser.id] } }, data: { status: 'INACTIVE' } });
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
      sentAt: item.delivery.success ? attemptedAt : null,
      error: item.delivery.success ? null : item.delivery.error ?? 'Delivery failed.',
    })),
  };
}
