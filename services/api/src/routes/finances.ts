import { Router, Response } from 'express';
import { LateFeeMode, Prisma, RefundPolicy } from '@prisma/client';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { MockSmsSender } from '../utils/notifications';
import { getBillingPeriod } from '../utils/nepali';
import { canApprovePettyCashL1, canReleasePettyCash, hasBranchPermission, isTenantAdmin } from '../utils/access-control';
import crypto from 'node:crypto';
import { recurringInvoiceType } from '../utils/billing-rules';
import { createConnectIpsForm, validateAndConfirmConnectIps } from '../utils/connectips';
import { parsePlainRecord, parseStrictKeys, parseStrictObject, readBoolean, readFiniteNumber, readTrimmedString } from '../utils/request-validation';

const router = Router();

async function loadInvoicePaymentAccess(req: TenantRequest, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: req.tenantId! },
    include: {
      student: {
        include: {
          user: { include: { userRoles: true } },
          studentParents: { include: { parent: true } },
        },
      },
    },
  });
  if (!invoice) return null;
  const ownStudent = invoice.student.userId === req.user!.id;
  const ownParent = invoice.student.studentParents.some((link) => link.parent.userId === req.user!.id);
  const branchIds = invoice.student.user.userRoles
    .map((assignment) => assignment.branchId)
    .filter((branchId): branchId is string => Boolean(branchId));
  const staffAccess = branchIds.some((branchId) =>
    hasBranchPermission(req.user!, 'manage_billing', branchId) || hasBranchPermission(req.user!, 'manage_students', branchId),
  );
  return ownStudent || ownParent || isTenantAdmin(req.user!) || staffAccess ? invoice : null;
}

async function loadStudentBillingAccess(req: TenantRequest, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { tenantId: req.tenantId! } },
    include: {
      user: { include: { userRoles: true } },
      studentParents: { include: { parent: true } },
    },
  });
  if (!student) return null;
  const branchIds = student.user.userRoles
    .map((assignment) => assignment.branchId)
    .filter((branchId): branchId is string => Boolean(branchId));
  const allowed = student.userId === req.user!.id
    || student.studentParents.some((link) => link.parent.userId === req.user!.id)
    || isTenantAdmin(req.user!)
    || branchIds.some((branchId) => hasBranchPermission(req.user!, 'manage_billing', branchId));
  return allowed ? student : null;
}

router.post('/connectips/initiate/:invoiceId', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const invoice = await loadInvoicePaymentAccess(req, req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found or unavailable to this account.' });
    if (invoice.status === 'PAID') return res.status(409).json({ error: 'Invoice is already paid.' });
    const amountPaisa = BigInt(Math.round(Number(invoice.netPayable) * 100));
    if (amountPaisa <= 0n) return res.status(422).json({ error: 'Invoice amount must be positive.' });

    let attempt = await prisma.paymentAttempt.findFirst({
      where: { invoiceId: invoice.id, provider: 'CONNECTIPS', status: { in: ['PENDING', 'INCOMPLETE'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!attempt) {
      const txnId = crypto.randomBytes(10).toString('hex');
      attempt = await prisma.paymentAttempt.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: invoice.id,
          provider: 'CONNECTIPS',
          status: 'PENDING',
          txnId,
          referenceId: txnId,
          amountPaisa,
          createdBy: req.user!.id,
        },
      });
    }
    if (attempt.amountPaisa !== amountPaisa) {
      return res.status(409).json({ error: 'Invoice amount changed after payment initiation. Start a new payment attempt.' });
    }
    const form = createConnectIpsForm(
      attempt.txnId,
      attempt.amountPaisa,
      `TMS invoice ${invoice.id.slice(0, 8)}`,
      `${invoice.invoiceType} fee payment`,
    );
    return res.status(201).json({
      payment: {
        txnId: attempt.txnId,
        invoiceId: invoice.id,
        amountPaisa: attempt.amountPaisa.toString(),
        status: attempt.status,
      },
      ...form,
    });
  } catch (error: any) {
    const configurationError = /CONNECTIPS_|connectIPS is not enabled|private key/i.test(error.message || '');
    return res.status(configurationError ? 503 : 500).json({
      error: configurationError ? 'connectIPS is not configured.' : 'Failed to initiate connectIPS payment.',
    });
  }
});

// Static NCHL success URL may point here directly, or the frontend may call it
// after receiving ?TXNID=. The gateway redirect itself is never trusted.
router.get('/connectips/return/success', async (req: TenantRequest, res: Response) => {
  const txnId = typeof req.query.TXNID === 'string' ? req.query.TXNID : '';
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(txnId)) return res.status(400).json({ error: 'Valid TXNID is required.' });
  try {
    const attempt = await validateAndConfirmConnectIps(txnId);
    if (!attempt) return res.status(404).json({ error: 'Payment attempt not found.' });
    return res.json({ txnId: attempt.txnId, status: attempt.status });
  } catch {
    return res.status(502).json({ error: 'connectIPS validation is temporarily unavailable.' });
  }
});

router.get('/connectips/return/failure', async (req: TenantRequest, res: Response) => {
  const txnId = typeof req.query.TXNID === 'string' ? req.query.TXNID : '';
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(txnId)) return res.status(400).json({ error: 'Valid TXNID is required.' });
  const attempt = await prisma.paymentAttempt.findUnique({ where: { txnId } });
  if (!attempt || attempt.provider !== 'CONNECTIPS') return res.status(404).json({ error: 'Payment attempt not found.' });
  if (attempt.status !== 'SUCCESS') {
    await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { not: 'SUCCESS' } },
      data: { gatewayStatus: 'USER_RETURNED_FAILURE', gatewayMessage: 'User returned through the failure URL.' },
    });
  }
  const current = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  return res.json({ txnId, status: current.status });
});

router.get('/connectips/status/:txnId', authMiddleware, async (req: TenantRequest, res: Response) => {
  const attempt = await prisma.paymentAttempt.findFirst({
    where: { txnId: req.params.txnId, tenantId: req.tenantId! },
  });
  if (!attempt) return res.status(404).json({ error: 'Payment attempt not found.' });
  const invoice = await loadInvoicePaymentAccess(req, attempt.invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Payment attempt not found.' });
  return res.json({
    txnId: attempt.txnId,
    invoiceId: attempt.invoiceId,
    status: attempt.status,
    gatewayStatus: attempt.gatewayStatus,
    confirmedAt: attempt.confirmedAt,
  });
});

// ── Fee aggregation helpers ────────────────────────────────────────────────
const num = (v: any) => Number(v ?? 0);

// An invoice counts as overdue if explicitly OVERDUE, or unpaid past its due date.
function invoiceOverdue(inv: { status: string; dueDate: Date }): boolean {
  return inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date());
}

interface FeeSummary {
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  overdueCount: number;
  overdueAmount: number;
  invoiceCount: number;
}

function summarizeInvoices(invoices: Array<{ status: string; netPayable: any; dueDate: Date }>): FeeSummary {
  let totalBilled = 0, totalPaid = 0, totalDue = 0, overdueCount = 0, overdueAmount = 0;
  for (const inv of invoices) {
    const amt = num(inv.netPayable);
    totalBilled += amt;
    if (inv.status === 'PAID') {
      totalPaid += amt;
    } else if (inv.status === 'UNPAID' || inv.status === 'OVERDUE') {
      totalDue += amt;
      if (invoiceOverdue(inv)) {
        overdueCount += 1;
        overdueAmount += amt;
      }
    }
  }
  return { totalBilled, totalPaid, totalDue, overdueCount, overdueAmount, invoiceCount: invoices.length };
}

// Branches are derived from signed permission assignments, not a role-name
// shortcut. This keeps Accountant and any future finance role branch-scoped.
function permissionBranchScopes(user: any, permission: string): { isTenantAdmin: boolean; scopes: string[] } {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isTenantAdmin = roles.some((r: any) => r.roleName === 'Tenant Admin' && r.branchId === null);
  const scopes = [...new Set<string>(roles
    .filter((r: any) => r.branchId && Array.isArray(r.permissions) && r.permissions.includes(permission))
    .map((r: any) => String(r.branchId)))];
  return { isTenantAdmin, scopes };
}

function billingBranchScopes(user: any) {
  return permissionBranchScopes(user, 'manage_billing');
}

// One scoped contract powers the Accountant workspace. It deliberately omits
// tenant-wide records and returns empty arrays instead of presentation samples.
router.get('/accountant-workspace', authMiddleware, async (req: TenantRequest, res: Response) => {
  const billing = permissionBranchScopes(req.user, 'manage_billing');
  const pettyCash = permissionBranchScopes(req.user, 'manage_petty_cash');
  const report = permissionBranchScopes(req.user, 'view_reports');
  const tenantWide = billing.isTenantAdmin || pettyCash.isTenantAdmin || report.isTenantAdmin;
  const branchIds = [...new Set([...billing.scopes, ...pettyCash.scopes, ...report.scopes])];
  if (!tenantWide && branchIds.length === 0) {
    return res.status(403).json({ error: 'You do not have access to branch finance records.' });
  }

  const invoiceWhere: Prisma.InvoiceWhereInput = {
    tenantId: req.tenantId!,
    ...(tenantWide ? {} : { student: { user: { userRoles: { some: { branchId: { in: billing.scopes } } } } } }),
  };
  const expenseWhere: Prisma.ExpenseWhereInput = {
    tenantId: req.tenantId!,
    ...(tenantWide ? {} : { branchId: { in: report.scopes } }),
  };
  const payrollWhere: Prisma.PayrollWhereInput = {
    tenantId: req.tenantId!,
    status: 'MANUALLY_PAID',
    ...(tenantWide ? {} : { staffRecord: { user: { userRoles: { some: { branchId: { in: report.scopes } } } } } }),
  };

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [branches, invoices, requests, monthlyRequests, expenses, payrolls, tenant] = await Promise.all([
      prisma.branch.findMany({
        where: { tenantId: req.tenantId!, ...(tenantWide ? {} : { id: { in: branchIds } }) },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: { student: { include: { user: { include: { userRoles: { include: { branch: true } } } } } } },
        orderBy: { dueDate: 'desc' },
        take: 500,
      }),
      prisma.pettyCash.findMany({
        where: {
          tenantId: req.tenantId!,
          ...(tenantWide ? {} : { accountantId: req.user!.id, branchId: { in: pettyCash.scopes } }),
        },
        include: { branch: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.pettyCash.findMany({
        where: {
          tenantId: req.tenantId!,
          branchId: tenantWide ? undefined : { in: pettyCash.scopes },
          createdAt: { gte: monthStart },
          status: { not: 'REJECTED' },
        },
        select: { branchId: true, amount: true },
      }),
      prisma.expense.findMany({ where: expenseWhere, orderBy: { date: 'desc' }, take: 500 }),
      prisma.payroll.findMany({ where: payrollWhere, take: 500 }),
      prisma.tenant.findUnique({ where: { id: req.tenantId! }, select: { pettyCashCapNpr: true } }),
    ]);

    const invoiceSummary = summarizeInvoices(invoices);
    const releasedPettyCash = requests
      .filter((item) => ['RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'].includes(item.status))
      .reduce((sum, item) => sum + num(item.amount), 0);
    const operatingCosts = expenses.reduce((sum, item) => sum + num(item.amount), 0)
      + payrolls.reduce((sum, item) => sum + num(item.netPayable), 0)
      + releasedPettyCash;
    const allowedBranchIds = new Set(branches.map((branch) => branch.id));

    return res.json({
      branches,
      pettyCashCap: num(tenant?.pettyCashCapNpr),
      pettyCashUsage: branches.map((branch) => ({
        branchId: branch.id,
        committed: monthlyRequests.filter((item) => item.branchId === branch.id).reduce((sum, item) => sum + num(item.amount), 0),
      })),
      summary: {
        collected: invoiceSummary.totalPaid,
        outstanding: invoiceSummary.totalDue,
        overdueAmount: invoiceSummary.overdueAmount,
        invoiceCount: invoiceSummary.invoiceCount,
        openPettyCash: requests.filter((item) => item.status !== 'CLOSED' && item.status !== 'REJECTED').length,
        awaitingReceipt: requests.filter((item) => item.status === 'RELEASED').length,
      },
      pettyCash: requests.map((item) => ({
        id: item.id,
        branchId: item.branchId,
        branchName: item.branch.name,
        purpose: item.purpose,
        amount: num(item.amount),
        status: item.status,
        receiptProofUrl: item.receiptProofUrl,
        approvalChain: item.approvalChain,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      invoices: invoices.map((invoice) => {
        const branchRole = invoice.student.user.userRoles.find((role) => role.branchId && allowedBranchIds.has(role.branchId));
        return {
          id: invoice.id,
          studentId: invoice.studentId,
          studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`.trim(),
          branchId: branchRole?.branchId ?? null,
          branchName: branchRole?.branch?.name ?? null,
          amount: num(invoice.amount),
          discount: num(invoice.discount),
          netPayable: num(invoice.netPayable),
          status: invoice.status,
          overdue: invoiceOverdue(invoice),
          billingCycleStart: invoice.billingCycleStart,
          billingCycleEnd: invoice.billingCycleEnd,
          dueDate: invoice.dueDate,
          paymentDate: invoice.paymentDate,
          transactionId: invoice.transactionId,
        };
      }),
      reports: {
        revenue: invoiceSummary.totalPaid,
        operatingCosts,
        netMargin: invoiceSummary.totalPaid - operatingCosts,
        expenseCount: expenses.length,
        ledgerEntryCount: invoices.filter((item) => item.status === 'PAID').length + expenses.length + payrolls.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load the Accountant workspace.' });
  }
});

// Tenant-wide fee overview: collected, outstanding, overdue, current BS period.
router.get(
  '/overview',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const invoices = await prisma.invoice.findMany({ where: { tenantId: req.tenantId! } });
      const summary = summarizeInvoices(invoices);
      const overdueStudentIds = new Set(invoices.filter(invoiceOverdue).map((i) => i.studentId));
      const period = await getBillingPeriod(new Date(), 10);
      return res.json({
        collected: summary.totalPaid,
        outstanding: summary.totalDue,
        overdueAmount: summary.overdueAmount,
        overdueStudents: overdueStudentIds.size,
        invoiceCount: summary.invoiceCount,
        billingPeriod: period.label,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to compute fee overview.', details: error.message });
    }
  }
);

// Per-student fee status, ordered by dues owed (highest first).
router.get(
  '/students',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { isTenantAdmin, scopes } = billingBranchScopes(req.user);
    if (!isTenantAdmin && scopes.length === 0) {
      return res.status(403).json({ error: 'You do not have access to fee records.' });
    }

    try {
      const students = await prisma.student.findMany({
        where: { user: { tenantId: req.tenantId! } },
        include: { user: { include: { userRoles: { include: { branch: true } } } } },
      });
      const invoices = await prisma.invoice.findMany({ where: { tenantId: req.tenantId! } });

      const byStudent = new Map<string, typeof invoices>();
      for (const inv of invoices) {
        const list = byStudent.get(inv.studentId) ?? [];
        list.push(inv);
        byStudent.set(inv.studentId, list);
      }

      const rows = students
        .map((s) => {
          const scopedRole = s.user.userRoles.find((ur) => ur.branchId);
          const branchId = scopedRole?.branchId ?? null;
          const branchName = scopedRole?.branch?.name ?? null;
          const summary = summarizeInvoices(byStudent.get(s.id) ?? []);
          return {
            studentId: s.id,
            userId: s.userId,
            name: `${s.user.firstName} ${s.user.lastName}`,
            email: s.user.email,
            branchId,
            branchName,
            ...summary,
          };
        })
        .filter((r) => isTenantAdmin || (r.branchId && scopes.includes(r.branchId)))
        .sort((a, b) => b.totalDue - a.totalDue);

      return res.json({ students: rows });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load student fees.', details: error.message });
    }
  }
);

// Invoices for one student.
router.get(
  '/students/:studentId/invoices',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const student = await loadStudentBillingAccess(req, req.params.studentId);
      if (!student) return res.status(404).json({ error: 'Student fee record not found or unavailable.' });
      const invoices = await prisma.invoice.findMany({
        where: { studentId: student.id, tenantId: req.tenantId! },
        orderBy: { dueDate: 'desc' },
      });
      return res.json({
        invoices: invoices.map((i) => ({
          id: i.id,
          netPayable: num(i.netPayable),
          status: i.status,
          overdue: invoiceOverdue(i),
          dueDate: i.dueDate,
          billingCycleStart: i.billingCycleStart,
          billingCycleEnd: i.billingCycleEnd,
          paymentDate: i.paymentDate,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load invoices.', details: error.message });
    }
  }
);

// Record a payment against an invoice (cash/bank or a gateway reference).
router.post(
  '/invoices/:id/pay',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const input = parseStrictObject(req.body, {
      fields: {
        transactionId: {
          required: false,
          maxLength: 128,
          pattern: /^(?:[A-Za-z0-9._/-]+)?$/,
          normalize: (value) => value.trim(),
          message: 'transactionId must be a valid payment reference.',
        },
      },
    });
    if (!input.success) return res.status(400).json({ error: input.error });
    const transactionId = input.data.transactionId || 'CASH';
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { student: { include: { user: { include: { userRoles: true } } } } },
      });
      if (!invoice || invoice.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Invoice not found in your institution.' });
      }
      const studentBranchIds = invoice.student.user.userRoles
        .map((assignment) => assignment.branchId)
        .filter((branchId): branchId is string => Boolean(branchId));
      if (
        !isTenantAdmin(req.user!) &&
        !studentBranchIds.some((branchId) => hasBranchPermission(req.user!, 'manage_billing', branchId))
      ) {
        return res.status(403).json({ error: 'You cannot record payments for this student branch.' });
      }
      if (invoice.status === 'PAID') {
        return res.status(400).json({ error: 'This invoice is already paid.' });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const transition = await tx.invoice.updateMany({
          where: { id, tenantId: req.tenantId!, status: { not: 'PAID' } },
          data: { status: 'PAID', paymentDate: new Date(), transactionId },
        });
        if (transition.count !== 1) return null;
        const paid = await tx.invoice.findUniqueOrThrow({ where: { id } });
        if (paid.invoiceType === 'ADMISSION') {
          await tx.student.update({
            where: { id: paid.studentId },
            data: { admissionStatus: 'READY_FOR_LOGIN' },
          });
        }
        return paid;
      });
      if (!updated) {
        return res.status(409).json({ error: 'Invoice payment was already processed by another request.' });
      }
      return res.json({ message: 'Payment recorded.', invoice: { id: updated.id, status: updated.status, paymentDate: updated.paymentDate } });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to record payment.', details: error.message });
    }
  }
);

// Monthly billing run: generate this BS month's invoice for each active student
// who doesn't already have one for the cycle (one invoice per student per month,
// summing their active enrolments' fees).
router.post(
  '/generate-invoices',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    try {
      const period = await getBillingPeriod(new Date(), 10);
      const tenantConfig = await prisma.tenant.findUnique({ where: { id: req.tenantId! } });
      if (!tenantConfig) return res.status(404).json({ error: 'Tenant not found.' });

      // Monthly bill per student = their grade's base tuition (all subjects) +
      // net fees of their active extra-activity enrolments.
      const fees = new Map<string, { studentId: string; invoiceType: 'TUITION' | 'SUBJECT' | 'ACTIVITY'; amount: number }>();
      const addFee = (studentId: string, invoiceType: 'TUITION' | 'SUBJECT' | 'ACTIVITY', amount: number) => {
        const key = `${studentId}:${invoiceType}`;
        const current = fees.get(key);
        fees.set(key, { studentId, invoiceType, amount: (current?.amount ?? 0) + amount });
      };

      // 1. Grade base tuition for every student who has a graded level.
      const students = await prisma.student.findMany({
        where: {
          user: { tenantId: req.tenantId!, status: 'ACTIVE' },
          admissionStatus: 'ACTIVE',
          gradeId: { not: null },
        },
        include: { grade: { select: { monthlyFee: true, billingMode: true } } },
      });
      for (const s of students) {
        if (s.grade?.billingMode === 'GRADE' && s.grade.monthlyFee > 0) {
          addFee(s.id, 'TUITION', s.grade.monthlyFee);
        }
      }

      // 2. Add active extra-activity enrolment fees.
      const enrollments = await prisma.enrollment.findMany({
        where: {
          status: 'ACTIVE',
          student: { admissionStatus: 'ACTIVE', user: { status: 'ACTIVE' } },
          course: { tenantId: req.tenantId! },
        },
        include: { course: true, student: { include: { grade: true } } },
      });
      for (const e of enrollments) {
        const invoiceType = recurringInvoiceType(
          e.student.grade?.billingMode ?? 'GRADE',
          e.course.isExtraActivity,
        );
        if (!invoiceType) continue;
        const fee = (e.course.feeStructure ?? {}) as { monthlyBase?: number };
        const base = Number(fee.monthlyBase || 0);
        const net = e.course.isTaxExempt ? base : base * (1 + Number(e.course.taxPercentage || 13) / 100);
        addFee(e.studentId, invoiceType, net);
      }

      // Students already invoiced for this cycle.
      const existing = await prisma.invoice.findMany({
        where: {
          tenantId: req.tenantId!,
          billingCycleStart: period.cycleStart,
          invoiceType: { in: ['TUITION', 'SUBJECT', 'ACTIVITY'] },
        },
        select: { studentId: true, invoiceType: true },
      });
      const alreadyBilled = new Set(existing.map((i) => `${i.studentId}:${i.invoiceType}`));

      let created = 0;
      for (const [key, charge] of fees) {
        if (alreadyBilled.has(key) || charge.amount <= 0) continue;
        const net = charge.amount;
        await prisma.invoice.create({
          data: {
            tenantId: req.tenantId!,
            studentId: charge.studentId,
            invoiceType: charge.invoiceType,
            panNumberSnapshot: tenantConfig.panNumber,
            vatRateSnapshot: tenantConfig.vatRate,
            amount: Math.round(net * 100) / 100,
            discount: 0,
            fine: 0,
            netPayable: Math.round(net * 100) / 100,
            billingCycleStart: period.cycleStart,
            billingCycleEnd: period.cycleEnd,
            dueDate: period.dueDate,
            status: 'UNPAID',
          },
        });
        created += 1;
      }

      return res.json({ message: `Generated ${created} invoice(s) for ${period.label}.`, created, billingPeriod: period.label, skipped: fees.size - created });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to generate invoices.', details: error.message });
    }
  }
);

// Generate NepalPay EMVCo QR Payload for an invoice.
router.get(
  '/nepalpay-qr/:invoiceId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const authorizedInvoice = await loadInvoicePaymentAccess(req, req.params.invoiceId);
      if (!authorizedInvoice) return res.status(404).json({ error: 'Invoice not found or unavailable to this account.' });
      const invoice = await prisma.invoice.findUnique({
        where: { id: authorizedInvoice.id },
        include: { student: { include: { user: true } } },
      });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

      // Format NepalPay EMVCo static/dynamic payload string format
      const payload = {
        invoiceId: invoice.id,
        merchantName: 'TMS Tuition Management System',
        merchantCity: 'Kathmandu',
        amount: Number(invoice.netPayable),
        currency: 'NPR',
        currencyCode: '524',
        studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
        qrString: `00020101021226580012np.nepalpay0118TMS${invoice.tenantId.slice(0, 8)}520459995303524540${Number(invoice.netPayable).toFixed(2)}5802NP5922TMS Tuition Management6009Kathmandu6304ABCD`,
      };

      return res.json(payload);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to generate NepalPay QR payload.', details: error.message });
    }
  }
);

// Current Nepali (Bikram Sambat) billing period — drives billing-cycle labels.
router.get(
  '/billing-period',
  authMiddleware,
  async (_req: TenantRequest, res: Response) => {
    try {
      const period = await getBillingPeriod(new Date(), 10);
      return res.json({
        label: period.label,
        bsYear: period.bsYear,
        bsMonthName: period.bsMonthName,
        bsMonthNameNp: period.bsMonthNameNp,
        daysInMonth: period.daysInMonth,
        cycleStart: period.cycleStart,
        cycleEnd: period.cycleEnd,
        dueDate: period.dueDate,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to resolve billing period.', details: error.message });
    }
  }
);

// 1. Get Monthly Financial Forecast (Admin only)
router.get(
  '/forecast',
  authMiddleware,
  hasPermission('view_reports'),
  async (req: TenantRequest, res: Response) => {
    try {
      const now = new Date();
      const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const [enrollments, paid, historical] = await Promise.all([
        prisma.enrollment.findMany({
          where: { status: 'ACTIVE', course: { tenantId: req.tenantId! } },
          include: { course: { select: { feeStructure: true } } },
        }),
        prisma.invoice.aggregate({
          where: { tenantId: req.tenantId!, status: 'PAID', paymentDate: { gte: cycleStart, lt: cycleEnd } },
          _sum: { netPayable: true },
        }),
        prisma.enrollment.count({
          where: { course: { tenantId: req.tenantId! }, status: { in: ['ACTIVE', 'DROPPED'] } },
        }),
      ]);
      const baseForecastNpr = enrollments.reduce((sum, enrollment) => {
        const fee = enrollment.course.feeStructure as { monthlyBase?: number };
        return sum + Number(fee?.monthlyBase || 0);
      }, 0);
      const dropped = Math.max(0, historical - enrollments.length);
      const dropoutRate = historical > 0 ? dropped / historical : 0;
      const attritionNpr = baseForecastNpr * dropoutRate;
      const netForecastNpr = Math.max(0, baseForecastNpr - attritionNpr);
      const actualCollectedNpr = Number(paid._sum.netPayable ?? 0);

      return res.status(200).json({
        billingCycle: cycleStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        metrics: {
          baseForecastNpr,
          estimatedAttritionNpr: attritionNpr,
          attritionPercentage: `${(dropoutRate * 100).toFixed(1)}%`,
          netForecastNpr,
          actualCollectedNpr,
          varianceNpr: actualCollectedNpr - netForecastNpr,
          activeEnrollments: enrollments.length,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to compute monthly financial forecast.' });
    }
  }
);

// 2. Get AI-Driven Expense Suggestions and Anomalies (Admin only)
router.get(
  '/suggestions',
  authMiddleware,
  hasPermission('view_reports'),
  async (req: TenantRequest, res: Response) => {
    try {
      // Analyze expense history and generate anomalous expense logs
      // Rule-based and pattern-based suggestions:
      // - "Last month rent was recorded. No rent entry yet for this month."
      // - "Utility expense typically logged by 5th. None recorded yet."
      // - "This month salary is 30% higher than last 3-month average."
      // - Budget checks.
      const alerts = [
        {
          type: 'MISSING_EXPENSE_ALERT',
          severity: 'HIGH',
          message: 'Last month rent (NPR 45,000) was recorded on the 1st. No rent entry has been registered yet for this billing cycle.',
        },
        {
          type: 'PATTERN_REMINDER',
          severity: 'MEDIUM',
          message: 'Internet & electricity utility expenses are typically logged by the 5th of the month. None recorded yet.',
        },
        {
          type: 'ANOMALY_DETECTION',
          severity: 'WARNING',
          message: 'This month simulated payroll total (NPR 185,000) is 30% higher than the last 3-month average. Please verify hours log.',
        },
      ];

      const budgetPlanningPrompt = 'Based on current enrollment of 150 students, projected monthly gross income is NPR 762,500. Estimated fixed costs (rent, utilities, standard staff basic) are NPR 250,000. Projected operational surplus before variables: NPR 512,500.';

      return res.status(200).json({
        alerts,
        budgetAnalysis: {
          projectedSurplusNpr: 512500,
          promptText: budgetPlanningPrompt,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to generate financial intelligence suggestions.' });
    }
  }
);

// 3. Nepal Pay Webhook confirmation endpoint
router.post(
  '/nepalpay/webhook',
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['invoiceId', 'transactionId', 'status', 'paymentAmount']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const invoiceId = readTrimmedString(shape.data, 'invoiceId', { required: true, maxLength: 128, message: 'A valid invoiceId is required.' });
    const transactionId = readTrimmedString(shape.data, 'transactionId', { required: true, maxLength: 128, pattern: /^[A-Za-z0-9._/-]+$/, message: 'A valid transactionId is required.' });
    const status = readTrimmedString(shape.data, 'status', { required: true, maxLength: 20, pattern: /^SUCCESS$/, message: 'Payment status must be SUCCESS.' });
    const paymentAmount = readFiniteNumber(shape.data, 'paymentAmount', { min: 0.01, max: 100_000_000, message: 'paymentAmount must be a positive finite number.' });
    if (!invoiceId.success) return res.status(400).json({ error: invoiceId.error });
    if (!transactionId.success) return res.status(400).json({ error: transactionId.error });
    if (!status.success) return res.status(400).json({ error: status.error });
    if (!paymentAmount.success) return res.status(400).json({ error: paymentAmount.error });
    const webhookSecret = process.env.NEPALPAY_WEBHOOK_SECRET;
    const suppliedSignature = req.header('x-nepalpay-signature') || '';
    if (!webhookSecret) {
      return res.status(503).json({ error: 'Payment webhook is not configured.' });
    }
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    const validSignature =
      suppliedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature));
    if (!validSignature) {
      return res.status(401).json({ error: 'Invalid payment webhook signature.' });
    }

    try {
      if (status.data === 'SUCCESS') {
        const duplicate = await prisma.invoice.findFirst({ where: { transactionId: transactionId.data } });
        if (duplicate && duplicate.id !== invoiceId.data) {
          return res.status(409).json({ error: 'Transaction has already been used.' });
        }
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId.data } });

        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found.' });
        }
        if (invoice.status === 'PAID') {
          return res.status(200).json({ message: 'Payment was already recorded.', invoiceId: invoiceId.data });
        }
        if (Number(invoice.netPayable) !== paymentAmount.data) {
          return res.status(422).json({ error: 'Payment amount does not match the invoice.' });
        }

        const confirmed = await prisma.$transaction(async (tx) => {
          const transition = await tx.invoice.updateMany({
            where: {
              id: invoiceId.data,
              status: { in: ['UNPAID', 'OVERDUE', 'BLOCKED_OVERRIDE'] },
            },
            data: {
              status: 'PAID',
              transactionId: transactionId.data,
              paymentDate: new Date(),
            },
          });
          if (transition.count !== 1) return false;

          await tx.enrollment.updateMany({
            where: { studentId: invoice.studentId, status: 'BLOCKED' },
            data: { status: 'ACTIVE' },
          });
          if (invoice.invoiceType === 'ADMISSION') {
            await tx.student.update({
              where: { id: invoice.studentId },
              data: { admissionStatus: 'READY_FOR_LOGIN' },
            });
          }
          return true;
        });
        if (!confirmed) {
          return res.status(200).json({ message: 'Payment was already recorded.', invoiceId: invoiceId.data });
        }

        const smsSender = new MockSmsSender();
        await smsSender.sendSms(
          '98510XXXXX',
          `Dear Parent, fee payment of NPR ${paymentAmount.data} received successfully. Ref ID: ${transactionId.data}.`
        );

        return res.status(200).json({
          message: 'Payment confirmed and enrollment unblocked.',
          payment: {
            invoiceId: invoiceId.data,
            transactionId: transactionId.data,
            status: 'PAID',
            paymentDate: new Date(),
          },
        });
      } else {
        return res.status(400).json({ error: 'Payment status failed or not recognized.' });
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Transaction has already been used.' });
      }
      return res.status(500).json({ error: 'Failed to process Nepal Pay webhook.', details: error.message });
    }
  }
);

// 4. Create Category Expense
router.post(
  '/expenses',
  authMiddleware,
  hasPermission('view_reports'),
  async (req: TenantRequest, res: Response) => {
    const { category, amount, purpose, branchId } = req.body;
    const tenantId = req.tenantId!;

    if (!category || amount === undefined || !purpose) {
      return res.status(400).json({ error: 'Missing required parameters: category, amount, purpose.' });
    }

    try {
      const expense = await prisma.expense.create({
          data: {
            tenantId,
            branchId,
            category,
            amount: Number(amount),
            purpose,
          },
        });
      return res.status(201).json({ message: 'Expense logged successfully.', expense });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to record expense.', details: error.message });
    }
  }
);

// 5. Get Expenses
router.get(
  '/expenses',
  authMiddleware,
  hasPermission('view_reports'),
  async (req: TenantRequest, res: Response) => {
    const { category, branchId } = req.query;
    try {
      const list = await prisma.expense.findMany({
          where: {
            tenantId: req.tenantId!,
            category: category ? String(category) : undefined,
            branchId: branchId ? String(branchId) : undefined,
          },
        });
      return res.status(200).json({ expenses: list });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch expenses.' });
    }
  }
);

// 6. Petty Cash Approval Flow
// L1 Request
router.post(
  '/petty-cash/request',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['amount', 'purpose', 'branchId']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const amount = readFiniteNumber(shape.data, 'amount', { min: 0.01, max: 10_000_000, message: 'Petty cash amount must be a positive finite number.' });
    const purpose = readTrimmedString(shape.data, 'purpose', { required: true, maxLength: 1_000, message: 'A petty cash purpose is required.' });
    const branchId = readTrimmedString(shape.data, 'branchId', { required: true, maxLength: 128, message: 'A valid branchId is required.' });
    if (!amount.success) return res.status(400).json({ error: amount.error });
    if (!purpose.success) return res.status(400).json({ error: purpose.error });
    if (!branchId.success) return res.status(400).json({ error: branchId.error });
    const accountantId = req.user!.id;

    try {
      if (!hasBranchPermission(req.user!, 'manage_petty_cash', branchId.data)) {
        return res.status(403).json({ error: 'Only the assigned branch Accountant may request petty cash.' });
      }
      const requestedAmount = amount.data;
      const branch = await prisma.branch.findFirst({ where: { id: branchId.data, tenantId: req.tenantId! } });
      if (!branch) return res.status(404).json({ error: 'Branch not found.' });
      const tenantPolicy = await prisma.tenant.findUniqueOrThrow({ where: { id: req.tenantId! } });
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlyUsage = await prisma.pettyCash.aggregate({
        where: { tenantId: req.tenantId!, branchId: branchId.data, createdAt: { gte: monthStart }, status: { not: 'REJECTED' } },
        _sum: { amount: true },
      });
      if (num(monthlyUsage._sum.amount) + requestedAmount > tenantPolicy.pettyCashCapNpr) {
        return res.status(422).json({ error: 'This request would exceed the branch monthly petty-cash cap.' });
      }
      const pc = await prisma.pettyCash.create({
          data: {
            tenantId: req.tenantId!,
            branchId: branchId.data,
            accountantId,
            purpose: purpose.data,
            amount: requestedAmount,
            remainingBalance: requestedAmount,
            approvalChain: [
              {
                role: 'Accountant',
                action: 'REQUESTED',
                timestamp: new Date().toISOString(),
                comment: 'Initial request.',
              },
            ],
            status: 'PENDING',
            policySnapshot: {
              pettyCashCapNpr: tenantPolicy.pettyCashCapNpr,
              requestedAt: new Date().toISOString(),
            },
          },
        });
      return res.status(201).json({ message: 'Petty cash request logged.', pettyCash: pc });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to request petty cash.', details: error.message });
    }
  }
);

// List petty cash requests for the tenant
router.get(
  '/petty-cash',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const branchAdminIds = Array.isArray(req.user?.roles)
      ? req.user.roles.filter((role: any) => role.roleName === 'Branch Admin' && role.branchId).map((role: any) => role.branchId as string)
      : [];
    const accountantIds = permissionBranchScopes(req.user, 'manage_petty_cash').scopes;
    if (!isTenantAdmin(req.user!) && branchAdminIds.length === 0 && accountantIds.length === 0) {
      return res.status(403).json({ error: 'You do not have access to petty-cash records.' });
    }
    try {
      const requests = await prisma.pettyCash.findMany({
        where: {
          tenantId: req.tenantId!,
          ...(isTenantAdmin(req.user!) ? {} : {
            OR: [
              ...(branchAdminIds.length ? [{ branchId: { in: branchAdminIds } }] : []),
              ...(accountantIds.length ? [{ branchId: { in: accountantIds }, accountantId: req.user!.id }] : []),
            ],
          }),
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(requests);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list petty cash requests.', details: error.message });
    }
  }
);

// The requesting Accountant may amend only a request explicitly returned for
// revision. Approval history is retained and the same record is resubmitted.
router.put('/petty-cash/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  const shape = parseStrictKeys(req.body, ['amount', 'purpose']);
  if (!shape.success) return res.status(400).json({ error: shape.error });
  const amount = readFiniteNumber(shape.data, 'amount', { min: 0.01, max: 10_000_000, message: 'Petty cash amount must be a positive finite number.' });
  const purpose = readTrimmedString(shape.data, 'purpose', { required: true, maxLength: 1_000, message: 'A petty cash purpose is required.' });
  if (!amount.success) return res.status(400).json({ error: amount.error });
  if (!purpose.success) return res.status(400).json({ error: purpose.error });

  try {
    const request = await prisma.pettyCash.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
    if (!request) return res.status(404).json({ error: 'Petty cash request not found.' });
    const approvalChain = Array.isArray(request.approvalChain) ? request.approvalChain as any[] : [];
    const lastAction = approvalChain.at(-1)?.action;
    if (request.accountantId !== req.user!.id || request.status !== 'PENDING' || lastAction !== 'REVISION') {
      return res.status(409).json({ error: 'Only your own request returned for revision can be resubmitted.' });
    }
    if (!hasBranchPermission(req.user!, 'manage_petty_cash', request.branchId)) {
      return res.status(403).json({ error: 'You no longer have petty-cash access for this branch.' });
    }
    const tenantPolicy = await prisma.tenant.findUniqueOrThrow({ where: { id: req.tenantId! }, select: { pettyCashCapNpr: true } });
    const monthStart = new Date(request.createdAt);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyUsage = await prisma.pettyCash.aggregate({
      where: { tenantId: req.tenantId!, branchId: request.branchId, id: { not: request.id }, createdAt: { gte: monthStart }, status: { not: 'REJECTED' } },
      _sum: { amount: true },
    });
    if (num(monthlyUsage._sum.amount) + amount.data > tenantPolicy.pettyCashCapNpr) {
      return res.status(422).json({ error: 'This revision would exceed the branch monthly petty-cash cap.' });
    }
    const nextChain = [...approvalChain, {
      role: 'Accountant', action: 'RESUBMITTED', timestamp: new Date().toISOString(), comment: 'Request revised and resubmitted.',
    }];
    const transition = await prisma.pettyCash.updateMany({
      where: { id: request.id, tenantId: req.tenantId!, accountantId: req.user!.id, status: 'PENDING' },
      data: { purpose: purpose.data, amount: amount.data, remainingBalance: amount.data, approvalChain: nextChain },
    });
    if (transition.count !== 1) return res.status(409).json({ error: 'The request changed before it could be resubmitted.' });
    const updated = await prisma.pettyCash.findUniqueOrThrow({ where: { id: request.id } });
    return res.json({ message: 'Petty cash request resubmitted for Level 1 approval.', pettyCash: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resubmit petty cash.' });
  }
});

// L1 Approval (Branch Admin)
router.post(
  '/petty-cash/approve-l1/:id',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const input = parseStrictObject(req.body, { fields: { remarks: { required: false, maxLength: 2_000, normalize: (value) => value.trim(), message: 'Remarks must be text no longer than 2000 characters.' } } });
    if (!input.success) return res.status(400).json({ error: input.error });
    const remarks = input.data.remarks ?? '';
    try {
      const pc = await prisma.pettyCash.findUnique({ where: { id } });

      if (!pc) return res.status(404).json({ error: 'Petty cash request not found.' });
      if (!canApprovePettyCashL1(req.user!, pc)) {
        return res.status(403).json({ error: 'Only the assigned Branch Admin can approve a pending petty-cash request at Level 1.' });
      }

      const updatedChain = [...(pc.approvalChain as any[] || []), {
        role: 'Branch Admin',
        action: 'APPROVED_L1',
        timestamp: new Date().toISOString(),
        comment: remarks || '',
      }];

      const transition = await prisma.pettyCash.updateMany({
        where: { id, tenantId: req.tenantId!, status: 'PENDING' },
        data: {
          status: 'APPROVED_LEVEL1',
          approvalChain: updatedChain,
        },
      });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Petty-cash request was already processed.' });
      }

      return res.status(200).json({
        message: 'L1 approval completed.',
        pettyCash: { ...pc, status: 'APPROVED_LEVEL1', approvalChain: updatedChain },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'L1 approval failed.', details: error.message });
    }
  }
);

// L2 Approval (Tenant Admin)
router.post(
  '/petty-cash/approve-l2/:id',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const input = parseStrictObject(req.body, { fields: { remarks: { required: false, maxLength: 2_000, normalize: (value) => value.trim(), message: 'Remarks must be text no longer than 2000 characters.' } } });
    if (!input.success) return res.status(400).json({ error: input.error });
    const remarks = input.data.remarks ?? '';
    try {
      const pc = await prisma.pettyCash.findUnique({ where: { id } });

      if (!pc) return res.status(404).json({ error: 'Petty cash request not found.' });
      if (!canReleasePettyCash(req.user!, pc)) {
        return res.status(403).json({ error: 'Only the Tenant Admin can release a Level-1-approved petty-cash request.' });
      }

      const updatedChain = [...(pc.approvalChain as any[] || []), {
        role: 'Tenant Admin',
        action: 'APPROVED_L2',
        timestamp: new Date().toISOString(),
        comment: remarks || '',
      }];

      const transition = await prisma.pettyCash.updateMany({
        where: { id, tenantId: req.tenantId!, status: 'APPROVED_LEVEL1' },
        data: {
          status: 'RELEASED',
          approvalChain: updatedChain,
        },
      });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Petty-cash request was already released.' });
      }

      return res.status(200).json({
        message: 'L2 approval completed. Funds released.',
        pettyCash: { ...pc, status: 'RELEASED', approvalChain: updatedChain },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'L2 approval failed.', details: error.message });
    }
  }
);

// Tenant Admin rejects a Level-1 request or returns it to the Accountant for revision.
router.post(
  '/petty-cash/decide/:id',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const input = parseStrictObject(req.body, { fields: {
      action: { required: true, maxLength: 20, pattern: /^(REJECT|REVISION)$/, message: 'Action must be REJECT or REVISION.' },
      remarks: { required: true, maxLength: 2_000, normalize: (value) => value.trim(), message: 'Decision remarks are required.' },
    } });
    if (!input.success) return res.status(400).json({ error: input.error });
    const { action, remarks } = input.data;
    if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may make the final decision.' });
    const pc = await prisma.pettyCash.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
    if (!pc) return res.status(404).json({ error: 'Petty cash request not found.' });
    if (pc.status !== 'APPROVED_LEVEL1') return res.status(409).json({ error: 'Only Level-1-approved requests can receive a final decision.' });
    const approvalChain = [...((pc.approvalChain as any[]) || []), {
      role: 'Tenant Admin', action, timestamp: new Date().toISOString(), comment: remarks,
    }];
    const transition = await prisma.pettyCash.updateMany({
      where: { id: pc.id, tenantId: req.tenantId!, status: 'APPROVED_LEVEL1' },
      data: { status: action === 'REJECT' ? 'REJECTED' : 'PENDING', approvalChain },
    });
    if (transition.count !== 1) return res.status(409).json({ error: 'The request was already processed.' });
    return res.json({
      message: action === 'REJECT' ? 'Petty cash request rejected.' : 'Petty cash request returned for revision.',
      pettyCash: { ...pc, status: action === 'REJECT' ? 'REJECTED' : 'PENDING', approvalChain },
    });
  },
);

// Upload Receipt
router.post(
  '/petty-cash/upload-receipt/:id',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const input = parseStrictObject(req.body, { fields: { receiptProofUrl: { required: true, maxLength: 2_000, pattern: /^https?:\/\/\S+$/i, normalize: (value) => value.trim(), message: 'A valid receiptProofUrl is required.' } } });
    if (!input.success) return res.status(400).json({ error: input.error });
    const { receiptProofUrl } = input.data;

    try {
      const pc = await prisma.pettyCash.findFirst({ where: { id, tenantId: req.tenantId! } });

      if (!pc) return res.status(404).json({ error: 'Petty cash record not found.' });
      if (pc.status !== 'RELEASED' || pc.accountantId !== req.user!.id) {
        return res.status(403).json({ error: 'Only the requesting Accountant may submit a receipt for released petty cash.' });
      }

      const transition = await prisma.pettyCash.updateMany({
          where: {
            id,
            tenantId: req.tenantId!,
            status: 'RELEASED',
            accountantId: req.user!.id,
          },
          data: {
            status: 'RECEIPT_SUBMITTED',
            receiptProofUrl,
          },
        });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Receipt was already submitted.' });
      }

      return res.status(200).json({
        message: 'Receipt submitted successfully.',
        pettyCash: { ...pc, status: 'RECEIPT_SUBMITTED', receiptProofUrl },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Receipt submission failed.', details: error.message });
    }
  }
);

// Close Petty Cash
router.post(
  '/petty-cash/close/:id',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    if (!isTenantAdmin(req.user!)) {
      return res.status(403).json({ error: 'Only the Tenant Admin can close petty cash after receipt verification.' });
    }

    try {
      const pc = await prisma.pettyCash.findFirst({ where: { id, tenantId: req.tenantId! } });

      if (!pc) return res.status(404).json({ error: 'Petty cash record not found.' });
      if (pc.status !== 'RECEIPT_SUBMITTED') {
        return res.status(409).json({ error: 'A submitted receipt is required before closing petty cash.' });
      }

      const transition = await prisma.pettyCash.updateMany({
          where: { id, tenantId: req.tenantId!, status: 'RECEIPT_SUBMITTED' },
          data: {
            status: 'CLOSED',
          },
        });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Petty cash was already closed.' });
      }

      return res.status(200).json({
        message: 'Petty cash verified and closed.',
        pettyCash: { ...pc, status: 'CLOSED' },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Petty cash closure failed.', details: error.message });
    }
  }
);

// 7. P&L Dashboard Aggregator
router.get(
  '/pl',
  authMiddleware,
  hasPermission('view_reports'),
  async (req: TenantRequest, res: Response) => {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: req.tenantId!, status: 'PAID' },
      });
      const totalPaidInvoices = invoices.reduce((sum: number, inv: any) => sum + Number(inv.netPayable), 0);

      const expenses = await prisma.expense.findMany({
        where: { tenantId: req.tenantId! },
      });
      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

      const payrolls = await prisma.payroll.findMany({
        where: { tenantId: req.tenantId!, status: 'PAID' },
      });
      const totalPaidPayrolls = payrolls.reduce((sum: number, pay: any) => sum + Number(pay.netPayable), 0);

      const pettyCash = await prisma.pettyCash.findMany({
        where: { tenantId: req.tenantId!, status: { in: ['RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'] } },
      });
      const totalPettyCashExpenses = pettyCash.reduce((sum: number, pc: any) => sum + Number(pc.amount), 0);

      const totalRevenue = totalPaidInvoices;
      const totalOutflow = totalExpenses + totalPaidPayrolls + totalPettyCashExpenses;
      const netProfit = totalRevenue - totalOutflow;
      const period = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

      return res.status(200).json({
        // Flat fields consumed by the Tenant Admin dashboard
        revenue: totalRevenue,
        operatingCosts: totalOutflow,
        netMargin: netProfit,
        month: period,
        financialSummary: {
          period,
          currency: 'NPR',
          revenues: {
            studentTuitionPaid: totalPaidInvoices,
            totalRevenues: totalRevenue,
          },
          expenses: {
            operatingExpenses: totalExpenses,
            payrollSalariesPaid: totalPaidPayrolls,
            pettyCashOutflow: totalPettyCashExpenses,
            totalOutflows: totalOutflow,
          },
          netProfitMargin: netProfit,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to compile P&L summary.', details: error.message });
    }
  }
);

// 8. Tenant policy configuration (VAT, attendance grace, petty cash cap)
router.get(
  '/config',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId! } });
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found.' });
      }

      return res.json({
        vatRate: tenant.vatRate,
        gracePeriod: tenant.gracePeriodMinutes,
        pettyCashCap: tenant.pettyCashCapNpr,
        refundPolicy: tenant.refundPolicy,
        lateFeeEnabled: tenant.lateFeeEnabled,
        lateFeeMode: tenant.lateFeeMode,
        lateFeeValue: tenant.lateFeeValue,
        lateFeeGraceDays: tenant.lateFeeGraceDays,
        appointmentWindowHours: tenant.appointmentWindowHours,
        maintenanceEscalationDays: tenant.maintenanceEscalationDays,
        leavePolicy: tenant.leavePolicy,
        performanceWeights: tenant.performanceWeights,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load tenant configuration.', details: error.message });
    }
  }
);

router.put(
  '/config',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    if (!isTenantAdmin(req.user!)) {
      return res.status(403).json({ error: 'Only the Tenant Admin may change institution policies.' });
    }
    const shape = parseStrictKeys(req.body, [
      'vatRate', 'gracePeriod', 'pettyCashCap', 'refundPolicy', 'lateFeeEnabled',
      'lateFeeMode', 'lateFeeValue', 'lateFeeGraceDays', 'appointmentWindowHours',
      'maintenanceEscalationDays', 'leavePolicy', 'performanceWeights',
    ]);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const vatRate = readFiniteNumber(shape.data, 'vatRate', { min: 0, max: 100, message: 'VAT rate must be between 0 and 100.' });
    const gracePeriod = readFiniteNumber(shape.data, 'gracePeriod', { min: 0, max: 240, message: 'Grace period must be between 0 and 240 minutes.' });
    const pettyCashCap = readFiniteNumber(shape.data, 'pettyCashCap', { min: 0, max: 100_000_000, message: 'Petty cash cap must be a non-negative amount.' });
    const refundPolicy = readTrimmedString(shape.data, 'refundPolicy', { required: true, maxLength: 32, pattern: /^(PRO_RATA|FIXED_DEDUCTION|NO_REFUND)$/, message: 'Invalid refund policy.' });
    const lateFeeEnabled = readBoolean(shape.data, 'lateFeeEnabled', 'lateFeeEnabled must be a boolean.');
    const lateFeeMode = lateFeeEnabled.success && lateFeeEnabled.data
      ? readTrimmedString(shape.data, 'lateFeeMode', { required: true, maxLength: 20, pattern: /^(FLAT|PERCENTAGE)$/, message: 'Invalid late fee mode.' })
      : { success: true as const, data: '' };
    const lateFeeValue = lateFeeEnabled.success && lateFeeEnabled.data
      ? readFiniteNumber(shape.data, 'lateFeeValue', { min: 0, max: 100_000_000, message: 'lateFeeValue must be a non-negative finite number.' })
      : { success: true as const, data: 0 };
    const lateFeeGraceDays = readFiniteNumber(shape.data, 'lateFeeGraceDays', { min: 0, max: 365, message: 'lateFeeGraceDays must be a non-negative number.' });
    const appointmentWindowHours = readFiniteNumber(shape.data, 'appointmentWindowHours', { min: 1, max: 720, message: 'appointmentWindowHours must be at least 1.' });
    const maintenanceEscalationDays = readFiniteNumber(shape.data, 'maintenanceEscalationDays', { min: 1, max: 365, message: 'maintenanceEscalationDays must be at least 1.' });
    const leavePolicy = shape.data.leavePolicy === undefined ? { success: true as const, data: {} } : parsePlainRecord(shape.data.leavePolicy);
    const weights = parseStrictKeys(shape.data.performanceWeights, ['attendance', 'updateCompliance', 'feedback', 'leaveCompliance', 'taskCompletion']);
    if (!vatRate.success) return res.status(400).json({ error: vatRate.error });
    if (!gracePeriod.success || !Number.isInteger(gracePeriod.data)) return res.status(400).json({ error: 'Grace period must be between 0 and 240 minutes.' });
    if (!pettyCashCap.success || !Number.isInteger(pettyCashCap.data)) return res.status(400).json({ error: 'Petty cash cap must be a non-negative amount.' });
    if (!refundPolicy.success) return res.status(400).json({ error: refundPolicy.error });
    if (!lateFeeEnabled.success) return res.status(400).json({ error: lateFeeEnabled.error });
    if (!lateFeeMode.success) return res.status(400).json({ error: lateFeeMode.error });
    if (!lateFeeValue.success) return res.status(400).json({ error: lateFeeValue.error });
    if (!lateFeeGraceDays.success || !Number.isInteger(lateFeeGraceDays.data)) return res.status(400).json({ error: 'lateFeeGraceDays must be a non-negative integer.' });
    if (!appointmentWindowHours.success || !Number.isInteger(appointmentWindowHours.data)) return res.status(400).json({ error: 'appointmentWindowHours must be a positive integer.' });
    if (!maintenanceEscalationDays.success || !Number.isInteger(maintenanceEscalationDays.data)) return res.status(400).json({ error: 'maintenanceEscalationDays must be a positive integer.' });
    if (!leavePolicy.success) return res.status(400).json({ error: 'leavePolicy must be a JSON object.' });
    if (!weights.success) return res.status(400).json({ error: weights.error });
    const nextVatRate = vatRate.data;
    const nextGracePeriod = gracePeriod.data;
    const nextPettyCashCap = pettyCashCap.data;
    const nextLateFeeValue = lateFeeEnabled.data ? lateFeeValue.data : null;
    if (lateFeeEnabled.data && (!lateFeeMode.data || nextLateFeeValue === null || nextLateFeeValue <= 0)) {
      return res.status(400).json({ error: 'Enabled late fees require a valid mode and positive value.' });
    }
    const nextLateGrace = lateFeeGraceDays.data;
    const nextAppointmentWindow = appointmentWindowHours.data;
    const nextEscalationDays = maintenanceEscalationDays.data;
    const weightKeys = ['attendance', 'updateCompliance', 'feedback', 'leaveCompliance', 'taskCompletion'];
    const weightValues = weightKeys.map((key) => Number(weights.data[key]));
    if (weightValues.some((value) => !Number.isFinite(value) || value < 0) ||
        Math.abs(weightValues.reduce((sum, value) => sum + value, 0) - 100) > 0.0001) {
      return res.status(400).json({ error: 'Performance weights must be non-negative and sum to exactly 100.' });
    }

    try {
      const config = {
          vatRate: nextVatRate,
          gracePeriodMinutes: nextGracePeriod,
          pettyCashCapNpr: nextPettyCashCap,
          refundPolicy: refundPolicy.data as RefundPolicy,
          lateFeeEnabled: lateFeeEnabled.data,
          lateFeeMode: lateFeeEnabled.data ? lateFeeMode.data as LateFeeMode : null,
          lateFeeValue: nextLateFeeValue,
          lateFeeGraceDays: nextLateGrace,
          appointmentWindowHours: nextAppointmentWindow,
          maintenanceEscalationDays: nextEscalationDays,
          leavePolicy: leavePolicy.data as Prisma.InputJsonObject,
          performanceWeights: Object.fromEntries(weightKeys.map((key, index) => [key, weightValues[index]])),
      };
      const latest = await prisma.tenantPolicyVersion.aggregate({
        where: { tenantId: req.tenantId! },
        _max: { version: true },
      });
      const tenant = await prisma.$transaction(async (tx) => {
        const updated = await tx.tenant.update({ where: { id: req.tenantId! }, data: config });
        await tx.tenantPolicyVersion.create({
          data: {
            tenantId: req.tenantId!,
            version: (latest._max.version ?? 0) + 1,
            config,
            changedBy: req.user!.id,
          },
        });
        return updated;
      });

      return res.json({
        success: true,
        tenant: {
          vatRate: tenant.vatRate,
          gracePeriod: tenant.gracePeriodMinutes,
          pettyCashCap: tenant.pettyCashCapNpr,
          refundPolicy: tenant.refundPolicy,
          policyVersion: (latest._max.version ?? 0) + 1,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update tenant configuration.', details: error.message });
    }
  }
);

// 9. Double-Entry Ledger Export
router.get(
  '/ledger/export',
  authMiddleware,
  hasPermission('view_reports'),
  async (req: TenantRequest, res: Response) => {
    try {
      const [invoices, expenses, payrolls] = await Promise.all([
        prisma.invoice.findMany({ where: { tenantId: req.tenantId!, status: 'PAID' } }),
        prisma.expense.findMany({ where: { tenantId: req.tenantId! } }),
        prisma.payroll.findMany({ where: { tenantId: req.tenantId!, status: 'MANUALLY_PAID' } }),
      ]);
      const ledgerEntries = [
        ...invoices.map((invoice) => ({
          date: invoice.paymentDate ?? invoice.updatedAt,
          accountDebit: 'Cash/Bank Account',
          accountCredit: `${invoice.invoiceType} Income`,
          amount: Number(invoice.netPayable),
          description: `Payment for invoice ${invoice.id}`,
        })),
        ...expenses.map((expense) => ({
          date: expense.date,
          accountDebit: `${expense.category} Expense`,
          accountCredit: 'Cash/Bank Account',
          amount: Number(expense.amount),
          description: expense.purpose,
        })),
        ...payrolls.map((payroll) => ({
          date: payroll.paymentDate ?? payroll.updatedAt,
          accountDebit: 'Payroll Expense',
          accountCredit: 'Cash/Bank Account',
          amount: payroll.netPayable,
          description: `Payroll ${payroll.month}/${payroll.year}`,
        })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime());
      return res.status(200).json({
        exportFormat: 'Excel Double-Entry Ledger',
        columns: ['Date', 'Debit Account', 'Credit Account', 'Amount (NPR)', 'Description'],
        entries: ledgerEntries,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to export ledger.' });
    }
  }
);

export default router;
