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
