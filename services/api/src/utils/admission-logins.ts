import bcrypt from 'bcryptjs';
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
  if (!delivered) {
    await prisma.$transaction([
      prisma.student.update({ where: { id: student.id }, data: { admissionStatus: 'READY_FOR_LOGIN' } }),
      prisma.user.updateMany({ where: { id: { in: [student.userId, parentUser.id] } }, data: { status: 'INACTIVE' } }),
      prisma.enrollment.updateMany({ where: { studentId: student.id, status: 'ACTIVE' }, data: { status: 'BLOCKED' } }),
    ]);
  }
  return { delivered, studentPhone: student.user.phone, parentPhone: parentUser.phone };
}
