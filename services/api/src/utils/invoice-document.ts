export type InvoiceLineItem = { label: string; amount: number };

export function invoiceTypeLabel(invoiceType: string): string {
  if (invoiceType === 'ADMISSION') return 'One-time admission fee';
  if (invoiceType === 'SUBJECT') return 'Monthly subject tuition';
  if (invoiceType === 'ACTIVITY') return 'Optional activity fee';
  return 'Monthly grade tuition';
}

export function invoiceLineItems(snapshot: unknown, invoiceType: string, amount: unknown): InvoiceLineItem[] {
  if (Array.isArray(snapshot)) {
    const saved = snapshot.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const numericAmount = Number(record.amount);
      return label && Number.isFinite(numericAmount) && numericAmount >= 0
        ? [{ label, amount: numericAmount }]
        : [];
    });
    if (saved.length > 0) return saved;
  }

  return [{ label: invoiceTypeLabel(invoiceType), amount: Number(amount ?? 0) }];
}
