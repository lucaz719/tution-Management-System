import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { isTenantAdmin, managedBranchIds } from '../utils/access-control';

const router = Router();

// 1. Upload Staff Document (Admin/Staff)
router.post(
  '/documents',
  authMiddleware,
  hasPermission('manage_staff'),
  async (req: TenantRequest, res: Response) => {
    const { staffRecordId, documentType, fileUrl, expiryDate } = req.body;

    if (!staffRecordId || !documentType || !fileUrl) {
      return res.status(400).json({
        error: 'Missing required parameters: staffRecordId, documentType, fileUrl.',
      });
    }

    try {
      // Confirm the staff record belongs to the caller's tenant before writing.
      const staffRecord = await prisma.staffRecord.findUnique({
        where: { id: staffRecordId },
        include: { user: true },
      });
      if (!staffRecord || staffRecord.user.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Staff record not found in your institution.' });
      }

      const doc = await prisma.staffDocument.create({
        data: {
          staffRecordId,
          documentType,
          fileUrl,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });

      return res.status(201).json({ message: 'Document uploaded successfully.', doc });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to upload document.', details: error.message });
    }
  }
);

// 2. Document Expiry Alerts: Flags documents expiring within 30 days
router.get(
  '/documents/alerts',
  authMiddleware,
  hasPermission('manage_staff'),
  async (req: TenantRequest, res: Response) => {
    try {
      const today = new Date();
      const next30Days = new Date();
      next30Days.setDate(today.getDate() + 30);

      const expiringDocs = await prisma.staffDocument.findMany({
        where: {
          expiryDate: {
            gte: today,
            lte: next30Days,
          },
          // Scope to the caller's tenant — documents belong to staff whose user
          // record carries the tenantId.
          staffRecord: { user: { tenantId: req.tenantId! } },
        },
      });

      return res.status(200).json({ expiringDocs });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load document alerts.', details: error.message });
    }
  }
);

// 3. Initiate Exit Offboarding (Admin/Staff)
router.post(
  '/exit/initiate',
  authMiddleware,
  hasPermission('manage_staff'),
  async (req: TenantRequest, res: Response) => {
    const { staffRecordId, resignationDate, reason, noticePeriodDays } = req.body;

    if (!staffRecordId || !resignationDate) {
      return res.status(400).json({
        error: 'Missing required parameters: staffRecordId, resignationDate.',
      });
    }

    try {
      const staff = await prisma.staffRecord.findFirst({
        where: { id: staffRecordId, user: { tenantId: req.tenantId! } },
      });
      if (!staff) return res.status(404).json({ error: 'Staff record not found.' });
      const resignation = new Date(resignationDate);
      if (Number.isNaN(resignation.getTime())) return res.status(400).json({ error: 'Invalid resignationDate.' });
      const structure = (staff.salaryStructure ?? {}) as { basicSalary?: number };
      const salary = Number(structure.basicSalary ?? 0);
      const proRatedSalary = Math.round((salary / 30) * Math.min(resignation.getDate(), 30) * 100) / 100;

      const exit = await prisma.exitClearance.create({
        data: {
          staffRecordId,
          resignationDate: resignation,
          reason,
          noticePeriodDays: noticePeriodDays || 30,
          clearanceChecklist: [
            { item: 'Return of Tuition Keys & Access Card', cleared: false, signature: null },
            { item: 'Handover of Physical Textbooks & Curriculums', cleared: false, signature: null },
            { item: 'Finalization of Class Grading Marks', cleared: false, signature: null },
          ],
          finalSettlementNpr: proRatedSalary,
          status: 'PENDING',
        },
      });

      return res.status(201).json({ message: 'Exit clearance initiated successfully.', exit });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to initiate staff exit.' });
    }
  }
);

// 4. Branch Admin Signs Off Clearance Item (Branch Admin)
router.post(
  '/exit/clear/:exitId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { exitId } = req.params;
    const { checklistItem } = req.body;

    if (!checklistItem) {
      return res.status(400).json({ error: 'Missing required parameter: checklistItem.' });
    }

    try {
      const exit = await prisma.exitClearance.findFirst({
        where: { id: exitId, staffRecord: { user: { tenantId: req.tenantId! } } },
        include: { staffRecord: { include: { user: { include: { userRoles: true } } } } },
      });
      if (!exit) return res.status(404).json({ error: 'Exit clearance not found.' });
      const branchIds = exit.staffRecord.user.userRoles
        .map((assignment) => assignment.branchId)
        .filter((branchId): branchId is string => Boolean(branchId));
      if (!branchIds.some((branchId) => managedBranchIds(req.user!).includes(branchId))) {
        return res.status(403).json({ error: 'Only the assigned Branch Admin may clear this checklist.' });
      }
      const checklist = Array.isArray(exit.clearanceChecklist) ? [...exit.clearanceChecklist as any[]] : [];
      const index = checklist.findIndex((item) => item.item === checklistItem);
      if (index < 0) return res.status(404).json({ error: 'Checklist item not found.' });
      checklist[index] = { ...checklist[index], cleared: true, signature: req.user!.id, clearedAt: new Date().toISOString() };
      const completed = checklist.length > 0 && checklist.every((item) => item.cleared === true);
      const updated = await prisma.exitClearance.update({
        where: { id: exit.id },
        data: { clearanceChecklist: checklist, status: completed ? 'CLEARANCE_COMPLETED' : 'PENDING' },
      });
      return res.status(200).json({ message: 'Checklist item cleared.', exit: updated });
    } catch (error: any) {
      return res.status(500).json({ error: 'Clearance sign-off failed.' });
    }
  }
);

// 5. Tenant Admin Settle Final Offboarding and Deactivate Account
router.post(
  '/exit/settle/:exitId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { exitId } = req.params;

    try {
      if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may settle staff exits.' });
      const exit = await prisma.exitClearance.findFirst({
        where: { id: exitId, staffRecord: { user: { tenantId: req.tenantId! } } },
        include: { staffRecord: true },
      });
      if (!exit) return res.status(404).json({ error: 'Exit clearance not found.' });
      if (exit.status !== 'CLEARANCE_COMPLETED') {
        return res.status(409).json({ error: 'Branch clearance must be completed before final settlement.' });
      }
      await prisma.$transaction(async (tx) => {
        await tx.exitClearance.update({ where: { id: exit.id }, data: { status: 'SETTLED' } });
        await tx.user.update({ where: { id: exit.staffRecord.userId }, data: { status: 'INACTIVE' } });
        await tx.session.deleteMany({ where: { userId: exit.staffRecord.userId } });
      });
      return res.status(200).json({ message: 'Exit settled and staff account deactivated.', exitId, status: 'SETTLED' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Final settlement failed.' });
    }
  }
);

// 6. Calculate Payroll
router.post(
  '/payroll/calculate',
  authMiddleware,
  hasPermission('manage_staff'),
  async (req: TenantRequest, res: Response) => {
    const { month, year } = req.body;
    const tenantId = req.tenantId!;

    if (!month || !year) {
      return res.status(400).json({ error: 'Missing required parameters: month, year.' });
    }

    try {
      const staffRecords = await prisma.staffRecord.findMany({
          where: { user: { tenantId } },
          include: { user: true },
        });

      const payrolls = [];

      for (const record of staffRecords) {
        let baseSalary = 0;
        let deductions = 0;
        let bonuses = 0;

        if (record.contractType === 'FIXED') {
          const struct = record.salaryStructure as any || {};
          baseSalary = Number(struct.basicSalary) || 30000;
          deductions = 0;
          bonuses = 2000;
        } else if (record.contractType === 'HOUR_RATE') {
          const struct = record.salaryStructure as any || {};
          const hourlyRate = Number(struct.hourlyRate) || 400;
          
          const sessionsCount = await prisma.teacherSession.count({
              where: {
                teacherId: record.userId,
                status: 'PRESENT_CONFIRMED',
                date: {
                  gte: new Date(year, month - 1, 1),
                  lt: new Date(year, month, 1),
                },
              },
            });

          const hoursWorked = sessionsCount * 1.5;
          baseSalary = hoursWorked * hourlyRate;
          deductions = 0;
          bonuses = 0;
        }

        const netPayable = baseSalary + bonuses - deductions;

        const payRecord = await prisma.payroll.create({
            data: {
              tenantId,
              staffRecordId: record.id,
              month: Number(month),
              year: Number(year),
              baseSalary,
              attendanceDeductions: deductions,
              bonuses,
              netPayable,
              status: 'PENDING',
            },
          });
        payrolls.push(payRecord);
      }

      return res.status(201).json({
        message: 'Payroll calculated successfully.',
        payrolls,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Payroll calculation failed.', details: error.message });
    }
  }
);

// 7. Get Payroll Records
router.get(
  '/payroll',
  authMiddleware,
  hasPermission('manage_staff'),
  async (req: TenantRequest, res: Response) => {
    try {
      const list = await prisma.payroll.findMany({
          where: { tenantId: req.tenantId! },
          include: { staffRecord: { include: { user: true } } },
        });
      return res.status(200).json({ payrolls: list });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to retrieve payrolls.' });
    }
  }
);

// 8. Approve payroll obligation. TMS does not transfer salary funds.
router.post(
  '/payroll/approve/:id',
  authMiddleware,
  hasPermission('manage_staff'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    try {
      const payroll = await prisma.payroll.findFirst({ where: { id, tenantId: req.tenantId! } });
      if (!payroll) return res.status(404).json({ error: 'Payroll record not found.' });
      if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may approve payroll.' });
      if (payroll.status !== 'PENDING') return res.status(409).json({ error: 'Payroll is not pending.' });
      const transition = await prisma.payroll.updateMany({
          where: { id: payroll.id, tenantId: req.tenantId!, status: 'PENDING' },
          data: {
            status: 'APPROVED_FOR_MANUAL_PAYMENT',
            approvedBy: req.user!.id,
            approvedAt: new Date(),
          },
        });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Payroll was already processed by another request.' });
      }
      const approved = await prisma.payroll.findUniqueOrThrow({ where: { id: payroll.id } });

      return res.status(200).json({
        message: 'Payroll approved for manual payment. No salary funds were transferred by TMS.',
        payroll: approved,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to process payroll payment.', details: error.message });
    }
  }
);

router.post('/payroll/reconcile/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may reconcile payroll.' });
  const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
  if (!reference) return res.status(400).json({ error: 'External payment reference is required.' });
  const payroll = await prisma.payroll.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
  if (!payroll) return res.status(404).json({ error: 'Payroll record not found.' });
  if (payroll.status !== 'APPROVED_FOR_MANUAL_PAYMENT') {
    return res.status(409).json({ error: 'Payroll must be approved before reconciliation.' });
  }
  const transition = await prisma.payroll.updateMany({
    where: { id: payroll.id, tenantId: req.tenantId!, status: 'APPROVED_FOR_MANUAL_PAYMENT' },
    data: {
      status: 'MANUALLY_PAID',
      settlementReference: reference,
      reconciledBy: req.user!.id,
      paymentDate: new Date(),
    },
  });
  if (transition.count !== 1) {
    return res.status(409).json({ error: 'Payroll was reconciled by another request.' });
  }
  const reconciled = await prisma.payroll.findUniqueOrThrow({ where: { id: payroll.id } });
  return res.json({ message: 'Manual salary payment reconciled. TMS did not transfer funds.', payroll: reconciled });
});

export default router;
