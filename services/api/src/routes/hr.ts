import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { hasBranchPermission, isTenantAdmin, managedBranchIds } from '../utils/access-control';
import { parseStrictKeys, readFiniteNumber, readTrimmedString, type ValidationResult } from '../utils/request-validation';
import {
  createPayrollRecords,
  PayrollConfigurationError,
  PayrollPeriodConflictError,
} from '../services/payroll-service';

const router = Router();
const STAFF_DOCUMENT_TYPES = new Set(['NID', 'CONTRACT', 'ACADEMIC', 'CERTIFICATION']);
const CONTROL_CHARACTER_PATTERN = /^[^\u0000-\u001F\u007F]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function parseOptionalDate(value: unknown, field: string): ValidationResult<Date | null> {
  if (value === undefined || value === null) return { success: true, data: null };
  if (typeof value !== 'string' || value.length > 40 || !ISO_DATE_PATTERN.test(value)) return { success: false, error: `${field} must be a valid ISO date or null.` };
  const parsed = new Date(value);
  const invalidDate = Number.isNaN(parsed.getTime());
  const invalidCalendarDate = !invalidDate && value.length === 10 && parsed.toISOString().slice(0, 10) !== value;
  return invalidDate || invalidCalendarDate
    ? { success: false, error: `${field} must be a valid ISO date or null.` }
    : { success: true, data: parsed };
}

function parseEmptyBody(body: unknown): ValidationResult<Record<string, never>> {
  const shape = parseStrictKeys(body ?? {}, []);
  return shape.success ? { success: true, data: {} } : shape;
}

function hrBranchIds(req: TenantRequest): string[] {
  return managedBranchIds(req.user!).filter((branchId) => hasBranchPermission(req.user!, 'manage_staff', branchId));
}

function canManageStaffAssignments(req: TenantRequest, assignments: Array<{ branchId: string | null }>): boolean {
  if (isTenantAdmin(req.user!)) return true;
  const allowed = new Set(hrBranchIds(req));
  return assignments.some((assignment) => assignment.branchId !== null && allowed.has(assignment.branchId));
}

// 1. Upload Staff Document (Tenant Admin or assigned Branch Admin)
router.post(
  '/documents',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['staffRecordId', 'documentType', 'fileUrl', 'expiryDate']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const staffRecordId = readTrimmedString(shape.data, 'staffRecordId', { required: true, maxLength: 128, message: 'A valid staffRecordId is required.' });
    const documentType = readTrimmedString(shape.data, 'documentType', { required: true, maxLength: 40, message: 'A valid documentType is required.' });
    const fileUrl = readTrimmedString(shape.data, 'fileUrl', { required: true, maxLength: 2_048, message: 'A valid HTTPS fileUrl is required.' });
    const expiryDate = parseOptionalDate(shape.data.expiryDate, 'expiryDate');
    if (!staffRecordId.success) return res.status(400).json({ error: staffRecordId.error });
    if (!documentType.success || !STAFF_DOCUMENT_TYPES.has(documentType.data)) {
      return res.status(400).json({ error: 'documentType must be NID, CONTRACT, ACADEMIC, or CERTIFICATION.' });
    }
    if (!fileUrl.success) return res.status(400).json({ error: fileUrl.error });
    try {
      const url = new URL(fileUrl.data);
      if (url.protocol !== 'https:') return res.status(400).json({ error: 'fileUrl must use HTTPS.' });
    } catch {
      return res.status(400).json({ error: 'A valid HTTPS fileUrl is required.' });
    }
    if (!expiryDate.success) return res.status(400).json({ error: expiryDate.error });

    try {
      // Confirm the staff record belongs to the caller's tenant before writing.
      const staffRecord = await prisma.staffRecord.findUnique({
        where: { id: staffRecordId.data },
        include: { user: { include: { userRoles: true } } },
      });
      if (!staffRecord || staffRecord.user.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Staff record not found in your institution.' });
      }
      if (!canManageStaffAssignments(req, staffRecord.user.userRoles)) {
        return res.status(403).json({ error: 'You cannot manage staff documents outside your assigned branches.' });
      }

      const doc = await prisma.staffDocument.create({
        data: {
          staffRecordId: staffRecordId.data,
          documentType: documentType.data,
          fileUrl: fileUrl.data,
          expiryDate: expiryDate.data,
        },
      });

      return res.status(201).json({ message: 'Document uploaded successfully.', doc });
    } catch {
      return res.status(500).json({ error: 'Failed to upload document.' });
    }
  }
);

// 2. Document Expiry Alerts: Flags documents expiring within 30 days
router.get(
  '/documents/alerts',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const branchIds = hrBranchIds(req);
      if (!isTenantAdmin(req.user!) && branchIds.length === 0) {
        return res.status(403).json({ error: 'Only Tenant Admins or assigned Branch Admins may view staff document alerts.' });
      }
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
          staffRecord: {
            user: {
              tenantId: req.tenantId!,
              ...(isTenantAdmin(req.user!) ? {} : { userRoles: { some: { branchId: { in: branchIds } } } }),
            },
          },
        },
      });

      return res.status(200).json({ expiringDocs });
    } catch {
      return res.status(500).json({ error: 'Failed to load document alerts.' });
    }
  }
);

// 3. Initiate Exit Offboarding (Tenant Admin or assigned Branch Admin)
router.post(
  '/exit/initiate',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['staffRecordId', 'resignationDate', 'reason', 'noticePeriodDays']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const staffRecordId = readTrimmedString(shape.data, 'staffRecordId', { required: true, maxLength: 128, message: 'A valid staffRecordId is required.' });
    const resignationDate = parseOptionalDate(shape.data.resignationDate, 'resignationDate');
    const reasonValue = shape.data.reason;
    if (!staffRecordId.success) return res.status(400).json({ error: staffRecordId.error });
    if (!resignationDate.success || resignationDate.data === null) return res.status(400).json({ error: 'A valid resignationDate is required.' });
    if (reasonValue !== undefined && reasonValue !== null && (typeof reasonValue !== 'string' || reasonValue.trim().length > 2_000)) {
      return res.status(400).json({ error: 'reason must be a string of 2000 characters or fewer, or null.' });
    }
    const reason = typeof reasonValue === 'string' ? reasonValue.trim() || null : null;
    let noticePeriodDays = 30;
    if (shape.data.noticePeriodDays !== undefined) {
      const notice = readFiniteNumber(shape.data, 'noticePeriodDays', { min: 0, max: 365, message: 'noticePeriodDays must be an integer between 0 and 365.' });
      if (!notice.success || !Number.isInteger(notice.data)) return res.status(400).json({ error: 'noticePeriodDays must be an integer between 0 and 365.' });
      noticePeriodDays = notice.data;
    }

    try {
      const staff = await prisma.staffRecord.findFirst({
        where: { id: staffRecordId.data, user: { tenantId: req.tenantId! } },
        include: { user: { include: { userRoles: true } } },
      });
      if (!staff) return res.status(404).json({ error: 'Staff record not found.' });
      if (!canManageStaffAssignments(req, staff.user.userRoles)) {
        return res.status(403).json({ error: 'You cannot initiate exits for staff outside your assigned branches.' });
      }
      const structure = (staff.salaryStructure ?? {}) as { baseMonthlySalary?: number };
      const salary = Number(structure.baseMonthlySalary ?? 0);
      const resignationDay = Number((shape.data.resignationDate as string).slice(8, 10));
      const proRatedSalary = Math.round((salary / 30) * Math.min(resignationDay, 30) * 100) / 100;

      const exit = await prisma.exitClearance.create({
        data: {
          staffRecordId: staffRecordId.data,
          resignationDate: resignationDate.data,
          reason,
          noticePeriodDays,
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
    } catch {
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
    const shape = parseStrictKeys(req.body, ['checklistItem']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const checklistItem = readTrimmedString(shape.data, 'checklistItem', { required: true, maxLength: 200, message: 'A valid checklistItem is required.' });
    if (!checklistItem.success) return res.status(400).json({ error: checklistItem.error });

    try {
      const exit = await prisma.exitClearance.findFirst({
        where: { id: exitId, staffRecord: { user: { tenantId: req.tenantId! } } },
        include: { staffRecord: { include: { user: { include: { userRoles: true } } } } },
      });
      if (!exit) return res.status(404).json({ error: 'Exit clearance not found.' });
      if (isTenantAdmin(req.user!)) {
        return res.status(403).json({ error: 'Tenant Admin cannot perform the Branch Admin clearance step.' });
      }
      const branchIds = exit.staffRecord.user.userRoles
        .map((assignment) => assignment.branchId)
        .filter((branchId): branchId is string => Boolean(branchId));
      if (!branchIds.some((branchId) => hrBranchIds(req).includes(branchId))) {
        return res.status(403).json({ error: 'Only the assigned Branch Admin may clear this checklist.' });
      }
      const checklist = Array.isArray(exit.clearanceChecklist) ? [...exit.clearanceChecklist as any[]] : [];
      const index = checklist.findIndex((item) => item.item === checklistItem.data);
      if (index < 0) return res.status(404).json({ error: 'Checklist item not found.' });
      if (checklist[index]?.cleared === true) {
        return res.status(409).json({ error: 'This checklist item was already cleared.' });
      }
      checklist[index] = { ...checklist[index], cleared: true, signature: req.user!.id, clearedAt: new Date().toISOString() };
      const completed = checklist.length > 0 && checklist.every((item) => item.cleared === true);
      const transition = await prisma.exitClearance.updateMany({
        where: { id: exit.id, status: 'PENDING', updatedAt: exit.updatedAt },
        data: { clearanceChecklist: checklist, status: completed ? 'CLEARANCE_COMPLETED' : 'PENDING' },
      });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Exit clearance changed in another request. Refresh and try again.' });
      }
      const updated = await prisma.exitClearance.findUniqueOrThrow({ where: { id: exit.id } });
      return res.status(200).json({ message: 'Checklist item cleared.', exit: updated });
    } catch {
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
      const body = parseEmptyBody(req.body);
      if (!body.success) return res.status(400).json({ error: body.error });
      const exit = await prisma.exitClearance.findFirst({
        where: { id: exitId, staffRecord: { user: { tenantId: req.tenantId! } } },
        include: { staffRecord: true },
      });
      if (!exit) return res.status(404).json({ error: 'Exit clearance not found.' });
      if (exit.status !== 'CLEARANCE_COMPLETED') {
        return res.status(409).json({ error: 'Branch clearance must be completed before final settlement.' });
      }
      const settled = await prisma.$transaction(async (tx) => {
        const transition = await tx.exitClearance.updateMany({
          where: { id: exit.id, status: 'CLEARANCE_COMPLETED' },
          data: { status: 'SETTLED' },
        });
        if (transition.count !== 1) return false;
        await tx.user.update({ where: { id: exit.staffRecord.userId }, data: { status: 'INACTIVE' } });
        await tx.session.deleteMany({ where: { userId: exit.staffRecord.userId } });
        return true;
      });
      if (!settled) {
        return res.status(409).json({ error: 'Exit was already settled or changed by another request.' });
      }
      return res.status(200).json({ message: 'Exit settled and staff account deactivated.', exitId, status: 'SETTLED' });
    } catch {
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
    if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may calculate payroll.' });
    const shape = parseStrictKeys(req.body, ['month', 'year']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const month = readFiniteNumber(shape.data, 'month', { min: 1, max: 12, message: 'month must be an integer between 1 and 12.' });
    const year = readFiniteNumber(shape.data, 'year', { min: 2_000, max: 2_100, message: 'year must be an integer between 2000 and 2100.' });
    if (!month.success || !Number.isInteger(month.data)) return res.status(400).json({ error: 'month must be an integer between 1 and 12.' });
    if (!year.success || !Number.isInteger(year.data)) return res.status(400).json({ error: 'year must be an integer between 2000 and 2100.' });
    const tenantId = req.tenantId!;

    try {
      const payrolls = await createPayrollRecords({ tenantId, month: month.data, year: year.data });
      return res.status(201).json({
        message: 'Payroll calculated successfully.',
        payrolls,
      });
    } catch (error) {
      if (error instanceof PayrollConfigurationError) {
        return res.status(422).json({ error: error.message, incompleteStaff: error.staff });
      }
      if (error instanceof PayrollPeriodConflictError) {
        return res.status(409).json({ error: error.message, existingStaff: error.staff });
      }
      return res.status(500).json({ error: 'Payroll calculation failed.' });
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
      if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may view payroll.' });
      const month = typeof req.query.month === 'string' ? Number(req.query.month) : undefined;
      const year = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const allowedStatuses = ['PENDING', 'APPROVED_FOR_MANUAL_PAYMENT', 'MANUALLY_PAID'];
      if ((month === undefined) !== (year === undefined)) return res.status(400).json({ error: 'month and year must be provided together.' });
      if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) return res.status(400).json({ error: 'month must be an integer between 1 and 12.' });
      if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) return res.status(400).json({ error: 'year must be an integer between 2000 and 2100.' });
      if (status && !allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid payroll status filter.' });
      if (search.length > 120) return res.status(400).json({ error: 'Payroll search must be 120 characters or fewer.' });
      const periodWhere: Prisma.PayrollWhereInput = {
        tenantId: req.tenantId!,
        ...(month !== undefined && year !== undefined ? { month, year } : {}),
      };
      const where: Prisma.PayrollWhereInput = {
        ...periodWhere,
        ...(status ? { status } : {}),
        ...(search ? { staffRecord: { user: { OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ] } } } : {}),
      };
      const [list, periodRecords] = await Promise.all([prisma.payroll.findMany({
          where,
          include: { staffRecord: { include: { user: true } } },
          orderBy: [{ year: 'desc' }, { month: 'desc' }, { staffRecord: { user: { firstName: 'asc' } } }],
          take: 500,
      }), prisma.payroll.findMany({
        where: periodWhere,
        select: { baseSalary: true, bonuses: true, attendanceDeductions: true, netPayable: true, status: true },
        take: 500,
      })]);
      const summary = periodRecords.reduce((result, payroll) => {
        result.gross += payroll.baseSalary + payroll.bonuses;
        result.deductions += payroll.attendanceDeductions;
        result.netPayable += payroll.netPayable;
        result.counts[payroll.status] = (result.counts[payroll.status] ?? 0) + 1;
        return result;
      }, { gross: 0, deductions: 0, netPayable: 0, counts: {} as Record<string, number> });
      return res.status(200).json({ payrolls: list, summary: { ...summary, staffCount: periodRecords.length } });
    } catch {
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
      const body = parseEmptyBody(req.body);
      if (!body.success) return res.status(400).json({ error: body.error });
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
    } catch {
      return res.status(500).json({ error: 'Failed to process payroll payment.' });
    }
  }
);

router.post('/payroll/reconcile/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may reconcile payroll.' });
  const shape = parseStrictKeys(req.body, ['reference']);
  if (!shape.success) return res.status(400).json({ error: shape.error });
  const reference = readTrimmedString(shape.data, 'reference', {
    required: true,
    maxLength: 160,
    pattern: CONTROL_CHARACTER_PATTERN,
    message: 'External payment reference must be a non-empty string of 160 characters or fewer.',
  });
  if (!reference.success) return res.status(400).json({ error: reference.error });

  try {
    const payroll = await prisma.payroll.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
    if (!payroll) return res.status(404).json({ error: 'Payroll record not found.' });
    if (payroll.status !== 'APPROVED_FOR_MANUAL_PAYMENT') {
      return res.status(409).json({ error: 'Payroll must be approved before reconciliation.' });
    }
    const transition = await prisma.payroll.updateMany({
      where: { id: payroll.id, tenantId: req.tenantId!, status: 'APPROVED_FOR_MANUAL_PAYMENT' },
      data: {
        status: 'MANUALLY_PAID',
        settlementReference: reference.data,
        reconciledBy: req.user!.id,
        paymentDate: new Date(),
      },
    });
    if (transition.count !== 1) {
      return res.status(409).json({ error: 'Payroll was reconciled by another request.' });
    }
    const reconciled = await prisma.payroll.findUniqueOrThrow({ where: { id: payroll.id } });
    return res.json({ message: 'Manual salary payment reconciled. TMS did not transfer funds.', payroll: reconciled });
  } catch {
    return res.status(500).json({ error: 'Payroll reconciliation failed.' });
  }
});

export default router;
