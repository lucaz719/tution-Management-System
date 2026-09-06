export type RecurringInvoiceType = 'TUITION' | 'SUBJECT' | 'ACTIVITY';

export function recurringInvoiceType(
  billingMode: 'GRADE' | 'SUBJECT',
  isExtraActivity: boolean,
): RecurringInvoiceType | null {
  if (isExtraActivity) return 'ACTIVITY';
  return billingMode === 'SUBJECT' ? 'SUBJECT' : null;
}

export function canReleaseAdmissionLogins(admissionStatus: string, invoiceStatus: string | undefined): boolean {
  return admissionStatus === 'READY_FOR_LOGIN' && invoiceStatus === 'PAID';
}

export function oneYearEnrollmentWindow(paidAt: Date) {
  const validFrom = new Date(paidAt);
  const validUntil = new Date(paidAt);
  validUntil.setUTCFullYear(validUntil.getUTCFullYear() + 1);
  return { validFrom, validUntil };
}

export function isInvoiceOverdue(
  status: string,
  dueDate: Date | string,
  now: Date = new Date(),
): boolean {
  return status === 'OVERDUE' || (status === 'UNPAID' && new Date(dueDate).getTime() < now.getTime());
}
