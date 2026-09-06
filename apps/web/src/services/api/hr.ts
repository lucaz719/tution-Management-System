import { request } from './client';

export interface PayrollRecord {
  id: string; month: number; year: number; baseSalary: number | string; attendanceDeductions: number | string;
  bonuses: number | string; netPayable: number | string; status: string; settlementReference?: string | null;
  payslipNumber: string; calculationBreakdown: Record<string, unknown>; adjustmentRemarks?: string | null;
  calculatedBy?: string | null; calculatedAt: string; approvedBy?: string | null; approvedAt?: string | null;
  reconciledBy?: string | null; paymentDate?: string | null; settlementDate?: string | null; paymentEvidence?: string | null;
  staffRecord: { id: string; designation: string; user: { firstName: string; lastName: string; email: string } };
}
export interface PayrollPreviewRecord {
  staffRecordId: string; baseSalary: number; bonuses: number; deductions: number; netPayable: number;
  adjustmentRemarks: string | null; breakdown: Record<string, unknown>; existingPayroll: { id: string; status: string } | null;
  staffRecord: PayrollRecord['staffRecord'];
}
export interface PayrollSummary {
  staffCount: number; gross: number; deductions: number; netPayable: number; counts: Record<string, number>;
}
export interface DocumentAlert { id: string; documentType: string; fileUrl: string; expiryDate: string; staffRecordId: string; }

export const hrApi = {
  payroll: (filters?: { month?: number; year?: number; status?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.month !== undefined) params.set('month', String(filters.month));
    if (filters?.year !== undefined) params.set('year', String(filters.year));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    return request<{ payrolls: PayrollRecord[]; summary: PayrollSummary }>(`/hr/payroll${params.size ? `?${params}` : ''}`);
  },
  preview: (month: number, year: number) => request<{ payrolls: PayrollPreviewRecord[]; summary: { gross: number; deductions: number; netPayable: number } }>('/hr/payroll/preview', { method: 'POST', body: JSON.stringify({ month, year }) }),
  calculate: (month: number, year: number) => request<{ payrolls: PayrollRecord[] }>('/hr/payroll/calculate', { method: 'POST', body: JSON.stringify({ month, year }) }),
  approve: (id: string) => request<{ message: string }>(`/hr/payroll/approve/${id}`, { method: 'POST' }),
  approveBulk: (ids: string[]) => request<{ message: string; updated: number }>('/hr/payroll/approve-bulk', { method: 'POST', body: JSON.stringify({ ids }) }),
  reconcile: (id: string, reference: string, paymentEvidence?: string, settlementDate?: string) => request<{ message: string }>(`/hr/payroll/reconcile/${id}`, { method: 'POST', body: JSON.stringify({ reference, paymentEvidence, settlementDate }) }),
  reconcileBulk: (entries: Array<{ id: string; reference: string; paymentEvidence?: string }>) => request<{ message: string; updated: number }>('/hr/payroll/reconcile-bulk', { method: 'POST', body: JSON.stringify({ entries }) }),
  documentAlerts: () => request<{ expiringDocs: DocumentAlert[] }>('/hr/documents/alerts'),
};
