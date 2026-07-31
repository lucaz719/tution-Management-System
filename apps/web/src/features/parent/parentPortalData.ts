import type { ParentInvoice } from './parentPortalTypes';

export function invoiceTotal(invoice: ParentInvoice) {
  return invoice.netPayable;
}
