type BillingMode = 'GRADE' | 'SUBJECT';

export interface BillingGrade { name: string; billingMode: BillingMode; monthlyFee: number | { toString(): string } }
export interface BillingEnrollment {
  id: string; status: string;
  course: { id: string; name: string; isExtraActivity: boolean; isTaxExempt: boolean; taxPercentage: number | { toString(): string }; feeStructure: unknown };
  class: { id: string; name: string };
}

export function studentBillingSummary(grade: BillingGrade | null, enrollments: BillingEnrollment[]) {
  const lines: Array<{ type: 'GRADE' | 'SUBJECT' | 'ACTIVITY'; sourceId: string; enrollmentId?: string; label: string; className?: string; amount: number; status: string }> = [];
  const blockers: string[] = [];
  const eligible = enrollments.filter((item) => item.status === 'ACTIVE' || item.status === 'BLOCKED');
  if (!grade) blockers.push('Assign a grade before configuring monthly billing.');
  if (grade?.billingMode === 'GRADE') {
    const amount = Number(grade.monthlyFee ?? 0);
    lines.push({ type: 'GRADE', sourceId: grade.name, label: `${grade.name} tuition package`, amount, status: 'INCLUDED' });
    if (amount <= 0) blockers.push(`Set the monthly package fee for ${grade.name}.`);
  }
  for (const enrollment of eligible) {
    if (!grade) continue;
    const invoiceType = recurringInvoiceType(grade.billingMode, enrollment.course.isExtraActivity);
    if (!invoiceType) continue;
    const type = invoiceType === 'ACTIVITY' ? 'ACTIVITY' : 'SUBJECT';
    const structure = enrollment.course.feeStructure && typeof enrollment.course.feeStructure === 'object' ? enrollment.course.feeStructure as { monthlyBase?: unknown } : {};
    const base = Number(structure.monthlyBase ?? 0);
    const taxRate = enrollment.course.isTaxExempt ? 0 : Number(enrollment.course.taxPercentage ?? 0);
    const amount = Math.round(base * (1 + taxRate / 100) * 100) / 100;
    lines.push({ type, sourceId: enrollment.course.id, enrollmentId: enrollment.id, label: enrollment.course.name, className: enrollment.class.name, amount, status: enrollment.status });
    if (base <= 0) blockers.push(`Set a monthly price for ${enrollment.course.name}.`);
  }
  if (grade?.billingMode === 'SUBJECT' && !lines.some((line) => line.type === 'SUBJECT')) blockers.push(`Select at least one ${grade.name} subject.`);
  return { billingMode: grade?.billingMode ?? null, setupStatus: blockers.length ? 'INCOMPLETE' as const : 'READY' as const, blockers: Array.from(new Set(blockers)), lines, recurringTotal: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100 };
}
import { recurringInvoiceType } from './billing-rules';
