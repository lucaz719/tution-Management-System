import { Prisma } from '@prisma/client';

/** Match the existing overdue rule, including debt not yet processed by cron. */
function overdueDebt(tenantId: string, branchId: string, now: Date): Prisma.InvoiceWhereInput {
  return { tenantId, branchId, OR: [
    { status: 'OVERDUE' },
    { status: 'UNPAID', dueDate: { lt: now } },
  ] };
}

/** Run within the payment transaction; do not restore access in other branches. */
export async function reconcileBranchBillingAccess(
  tx: Prisma.TransactionClient, tenantId: string, studentId: string, branchId: string, now = new Date(),
) {
  const scope = { studentId, class: { branchId, course: { tenantId } } };
  const debt = overdueDebt(tenantId, branchId, now);
  await tx.enrollment.updateMany({
    where: { ...scope, status: 'ACTIVE', student: { user: { tenantId }, invoices: { some: debt } } },
    data: { status: 'BLOCKED' },
  });
  return tx.enrollment.updateMany({
    where: {
      ...scope, status: 'BLOCKED',
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
      ],
      student: { user: { tenantId, status: 'ACTIVE' }, admissionStatus: 'ACTIVE', invoices: { none: debt } },
    },
    data: { status: 'ACTIVE' },
  });
}

/** Invoice status changes and related enrollment blocks commit together. */
export async function markOverdueInvoices(tx: Prisma.TransactionClient, tenantId: string, now = new Date()) {
  const updated = await tx.invoice.updateMany({
    where: { tenantId, status: 'UNPAID', dueDate: { lt: now } },
    data: { status: 'OVERDUE' },
  });
  const debts = await tx.invoice.findMany({
    where: { tenantId, status: 'OVERDUE' },
    select: { studentId: true, branchId: true },
    distinct: ['studentId', 'branchId'],
  });
  for (const debt of debts) {
    await tx.enrollment.updateMany({
      where: {
        studentId: debt.studentId, status: 'ACTIVE',
        class: { branchId: debt.branchId, course: { tenantId } },
        student: { user: { tenantId }, invoices: { some: overdueDebt(tenantId, debt.branchId, now) } },
      },
      data: { status: 'BLOCKED' },
    });
  }
  return updated;
}
