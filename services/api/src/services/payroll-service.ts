import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import prisma from '../utils/db';

export type SupportedContractType = 'FIXED' | 'HOUR_RATE';
export type CompensationStructure = Record<string, number> & { baseMonthlySalary?: number; hourlyRate?: number };
export type PayrollAdjustment = { staffRecordId: string; bonuses: number; deductions: number; remarks?: string };

export class PayrollConfigurationError extends Error {
  constructor(public readonly staff: Array<{ staffRecordId: string; name: string; reason: string }>) { super('Payroll cannot be calculated until every staff member has valid compensation and branch ownership.'); }
}
export class PayrollPeriodConflictError extends Error {
  constructor(public readonly staff: Array<{ staffRecordId: string; name: string }>) { super('Payroll already exists for one or more staff members in this period.'); }
}

export function money(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
export function calculateNetPayable(baseSalary: number, bonuses: number, deductions: number) {
  const total = money(money(baseSalary) + money(bonuses) - money(deductions));
  if (total < 0) throw new Error('Deductions cannot exceed salary plus bonuses.');
  return total;
}

export function compensationStructure(contractType: string, raw: Prisma.JsonValue): { success: true; value: CompensationStructure } | { success: false; reason: string } {
  const structure = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  if (contractType === 'FIXED') {
    const baseMonthlySalary = Number(structure.baseMonthlySalary);
    return Number.isFinite(baseMonthlySalary) && baseMonthlySalary > 0 ? { success: true, value: { baseMonthlySalary } } : { success: false, reason: 'Base monthly salary is missing or invalid.' };
  }
  if (contractType === 'HOUR_RATE') {
    const hourlyRate = Number(structure.hourlyRate);
    return Number.isFinite(hourlyRate) && hourlyRate > 0 ? { success: true, value: { hourlyRate } } : { success: false, reason: 'Hourly rate is missing or invalid.' };
  }
  return { success: false, reason: `Unsupported contract type: ${contractType || 'not set'}.` };
}
export function salaryStructureFor(contractType: SupportedContractType, amount: number): CompensationStructure { return contractType === 'FIXED' ? { baseMonthlySalary: amount } : { hourlyRate: amount }; }

interface PayrollInput { tenantId: string; branchId?: string; month: number; year: number; staffRecordIds?: string[]; adjustments?: PayrollAdjustment[]; bonuses?: number; deductions?: number; calculatedBy?: string }

async function buildPayrollRows(input: PayrollInput) {
  const staffRecords = await prisma.staffRecord.findMany({
    where: {
      ...(input.staffRecordIds ? { id: { in: input.staffRecordIds } } : {}),
      user: {
        tenantId: input.tenantId,
        status: 'ACTIVE',
        ...(input.branchId ? { userRoles: { some: { branchId: input.branchId } } } : {}),
      },
    },
    include: { user: { include: { userRoles: true } } },
    orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }, { id: 'asc' }],
  });
  const configured = staffRecords.map((record) => {
    const branchIds = [...new Set(record.user.userRoles.map((role) => role.branchId).filter((id): id is string => Boolean(id)))];
    const branchId = input.branchId && branchIds.includes(input.branchId)
      ? input.branchId
      : branchIds.length === 1 ? branchIds[0] : null;
    return { record, branchId, compensation: compensationStructure(record.contractType, record.salaryStructure) };
  });
  const incomplete = configured.flatMap((item) => {
    const name = `${item.record.user.firstName} ${item.record.user.lastName}`.trim();
    if (!item.branchId) return [{ staffRecordId: item.record.id, name, reason: 'Payroll branch ownership is missing or ambiguous.' }];
    if (!item.compensation.success) return [{ staffRecordId: item.record.id, name, reason: item.compensation.reason }];
    return [];
  });
  if (incomplete.length) throw new PayrollConfigurationError(incomplete);
  const adjustmentMap = new Map((input.adjustments ?? []).map((item) => [item.staffRecordId, item]));
  const periodStart = new Date(input.year, input.month - 1, 1), periodEnd = new Date(input.year, input.month, 1);
  const rows = [];
  for (const item of configured) {
    const compensation = item.compensation.success ? item.compensation.value : {};
    let workedMinutes = 0;
    let baseSalary = compensation.baseMonthlySalary ?? 0;
    if (item.record.contractType === 'HOUR_RATE') {
      const worked = await prisma.teacherSession.aggregate({ where: { teacherId: item.record.userId, status: 'PRESENT_CONFIRMED', date: { gte: periodStart, lt: periodEnd } }, _sum: { totalMinutes: true } });
      workedMinutes = worked._sum.totalMinutes ?? 0;
      baseSalary = money((workedMinutes / 60) * (compensation.hourlyRate ?? 0));
    }
    const adjustment = adjustmentMap.get(item.record.id);
    const bonuses = money(adjustment?.bonuses ?? input.bonuses ?? 0), deductions = money(adjustment?.deductions ?? input.deductions ?? 0);
    const netPayable = calculateNetPayable(baseSalary, bonuses, deductions);
    const breakdown = { contractType: item.record.contractType, baseSalary: money(baseSalary), hourlyRate: compensation.hourlyRate ?? null, workedMinutes, bonuses, deductions, netPayable, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() };
    rows.push({ staffRecord: item.record, staffRecordId: item.record.id, branchId: item.branchId!, baseSalary: money(baseSalary), bonuses, deductions, netPayable, adjustmentRemarks: adjustment?.remarks?.trim() || null, breakdown });
  }
  return rows;
}

export async function previewPayrollRecords(input: PayrollInput) {
  const rows = await buildPayrollRows(input);
  const existing = await prisma.payroll.findMany({ where: { tenantId: input.tenantId, month: input.month, year: input.year, staffRecordId: { in: rows.map((row) => row.staffRecordId) } }, select: { staffRecordId: true, id: true, status: true } });
  const existingMap = new Map(existing.map((record) => [record.staffRecordId, record]));
  return rows.map((row) => ({ ...row, existingPayroll: existingMap.get(row.staffRecordId) ?? null }));
}

export async function createPayrollRecords(input: PayrollInput) {
  const rows = await buildPayrollRows(input);
  if (!rows.length) return [];
  const existing = await prisma.payroll.findMany({ where: { tenantId: input.tenantId, month: input.month, year: input.year, staffRecordId: { in: rows.map((row) => row.staffRecordId) } }, select: { staffRecordId: true } });
  if (existing.length) {
    const ids = new Set(existing.map((record) => record.staffRecordId));
    throw new PayrollPeriodConflictError(rows.filter((row) => ids.has(row.staffRecordId)).map((row) => ({ staffRecordId: row.staffRecordId, name: `${row.staffRecord.user.firstName} ${row.staffRecord.user.lastName}`.trim() })));
  }
  try {
    await prisma.payroll.createMany({ data: rows.map((row) => ({ tenantId: input.tenantId, branchId: row.branchId, staffRecordId: row.staffRecordId, month: input.month, year: input.year, payslipNumber: `PS-${input.year}${String(input.month).padStart(2, '0')}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`, baseSalary: row.baseSalary, attendanceDeductions: row.deductions, bonuses: row.bonuses, netPayable: row.netPayable, calculationBreakdown: row.breakdown, adjustmentRemarks: row.adjustmentRemarks, calculatedBy: input.calculatedBy, status: 'PENDING' })) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new PayrollPeriodConflictError(rows.map((row) => ({ staffRecordId: row.staffRecordId, name: `${row.staffRecord.user.firstName} ${row.staffRecord.user.lastName}`.trim() })));
    throw error;
  }
  return prisma.payroll.findMany({ where: { tenantId: input.tenantId, month: input.month, year: input.year, staffRecordId: { in: rows.map((row) => row.staffRecordId) } }, include: { staffRecord: { include: { user: true } } }, orderBy: [{ staffRecord: { user: { firstName: 'asc' } } }, { staffRecord: { user: { lastName: 'asc' } } }, { id: 'asc' }] });
}
