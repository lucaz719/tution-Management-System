import { Prisma } from '@prisma/client';
import prisma from '../utils/db';

export type SupportedContractType = 'FIXED' | 'HOUR_RATE';

export type CompensationStructure = Record<string, number> & {
  baseMonthlySalary?: number;
  hourlyRate?: number;
};

export class PayrollConfigurationError extends Error {
  constructor(public readonly staff: Array<{ staffRecordId: string; name: string; reason: string }>) {
    super('Payroll cannot be calculated until every staff member has a valid compensation setup.');
  }
}

export class PayrollPeriodConflictError extends Error {
  constructor(public readonly staff: Array<{ staffRecordId: string; name: string }>) {
    super('Payroll already exists for one or more staff members in this period.');
  }
}

export function compensationStructure(
  contractType: string,
  raw: Prisma.JsonValue,
): { success: true; value: CompensationStructure } | { success: false; reason: string } {
  const structure = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  if (contractType === 'FIXED') {
    const baseMonthlySalary = Number(structure.baseMonthlySalary);
    return Number.isFinite(baseMonthlySalary) && baseMonthlySalary > 0
      ? { success: true, value: { baseMonthlySalary } }
      : { success: false, reason: 'Base monthly salary is missing or invalid.' };
  }
  if (contractType === 'HOUR_RATE') {
    const hourlyRate = Number(structure.hourlyRate);
    return Number.isFinite(hourlyRate) && hourlyRate > 0
      ? { success: true, value: { hourlyRate } }
      : { success: false, reason: 'Hourly rate is missing or invalid.' };
  }
  return { success: false, reason: `Unsupported contract type: ${contractType || 'not set'}.` };
}

export function salaryStructureFor(contractType: SupportedContractType, amount: number): CompensationStructure {
  return contractType === 'FIXED' ? { baseMonthlySalary: amount } : { hourlyRate: amount };
}

interface CreatePayrollInput {
  tenantId: string;
  month: number;
  year: number;
  staffRecordIds?: string[];
  bonuses?: number;
  deductions?: number;
}

export async function createPayrollRecords(input: CreatePayrollInput) {
  const staffRecords = await prisma.staffRecord.findMany({
    where: {
      ...(input.staffRecordIds ? { id: { in: input.staffRecordIds } } : {}),
      user: { tenantId: input.tenantId, status: 'ACTIVE' },
    },
    include: { user: true },
    orderBy: { user: { firstName: 'asc' } },
  });
  if (staffRecords.length === 0) return [];

  const configured = staffRecords.map((record) => ({
    record,
    compensation: compensationStructure(record.contractType, record.salaryStructure),
  }));
  const incomplete = configured
    .filter((item) => !item.compensation.success)
    .map((item) => ({
      staffRecordId: item.record.id,
      name: `${item.record.user.firstName} ${item.record.user.lastName}`.trim(),
      reason: item.compensation.success ? '' : item.compensation.reason,
    }));
  if (incomplete.length) throw new PayrollConfigurationError(incomplete);

  const existing = await prisma.payroll.findMany({
    where: {
      tenantId: input.tenantId,
      month: input.month,
      year: input.year,
      staffRecordId: { in: staffRecords.map((record) => record.id) },
    },
    select: { staffRecordId: true },
  });
  if (existing.length) {
    const ids = new Set(existing.map((record) => record.staffRecordId));
    throw new PayrollPeriodConflictError(staffRecords
      .filter((record) => ids.has(record.id))
      .map((record) => ({ staffRecordId: record.id, name: `${record.user.firstName} ${record.user.lastName}`.trim() })));
  }

  const periodStart = new Date(input.year, input.month - 1, 1);
  const periodEnd = new Date(input.year, input.month, 1);
  const rows: Prisma.PayrollCreateManyInput[] = [];
  for (const item of configured) {
    const compensation = item.compensation.success ? item.compensation.value : {};
    let baseSalary = compensation.baseMonthlySalary ?? 0;
    if (item.record.contractType === 'HOUR_RATE') {
      const worked = await prisma.teacherSession.aggregate({
        where: {
          teacherId: item.record.userId,
          status: 'PRESENT_CONFIRMED',
          date: { gte: periodStart, lt: periodEnd },
        },
        _sum: { totalMinutes: true },
      });
      baseSalary = Math.round((((worked._sum.totalMinutes ?? 0) / 60) * (compensation.hourlyRate ?? 0)) * 100) / 100;
    }
    const bonuses = input.bonuses ?? 0;
    const deductions = input.deductions ?? 0;
    const netPayable = Math.round((baseSalary + bonuses - deductions) * 100) / 100;
    if (netPayable < 0) throw new Error('Deductions cannot exceed salary plus bonuses.');
    rows.push({
      tenantId: input.tenantId,
      staffRecordId: item.record.id,
      month: input.month,
      year: input.year,
      baseSalary,
      attendanceDeductions: deductions,
      bonuses,
      netPayable,
      status: 'PENDING',
    });
  }

  try {
    await prisma.payroll.createMany({ data: rows });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new PayrollPeriodConflictError(staffRecords.map((record) => ({
        staffRecordId: record.id,
        name: `${record.user.firstName} ${record.user.lastName}`.trim(),
      })));
    }
    throw error;
  }

  return prisma.payroll.findMany({
    where: {
      tenantId: input.tenantId,
      month: input.month,
      year: input.year,
      staffRecordId: { in: staffRecords.map((record) => record.id) },
    },
    include: { staffRecord: { include: { user: true } } },
    orderBy: { staffRecord: { user: { firstName: 'asc' } } },
  });
}
