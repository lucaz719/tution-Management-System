import { request } from './client';

export interface PayrollRecord {
  id: string; month: number; year: number; baseSalary: number | string; attendanceDeductions: number | string;
  bonuses: number | string; netPayable: number | string; status: string; settlementReference?: string | null;
  staffRecord: { id: string; designation: string; user: { firstName: string; lastName: string; email: string } };
}
export interface DocumentAlert { id: string; documentType: string; fileUrl: string; expiryDate: string; staffRecordId: string; }

export const hrApi = {
  payroll: () => request<{ payrolls: PayrollRecord[] }>('/hr/payroll'),
  calculate: (month: number, year: number) => request<{ payrolls: PayrollRecord[] }>('/hr/payroll/calculate', { method: 'POST', body: JSON.stringify({ month, year }) }),
  approve: (id: string) => request<{ message: string }>(`/hr/payroll/approve/${id}`, { method: 'POST' }),
  reconcile: (id: string, reference: string) => request<{ message: string }>(`/hr/payroll/reconcile/${id}`, { method: 'POST', body: JSON.stringify({ reference }) }),
  documentAlerts: () => request<{ expiringDocs: DocumentAlert[] }>('/hr/documents/alerts'),
};
