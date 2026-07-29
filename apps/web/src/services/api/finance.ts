import { request } from './client';

export type PettyCashStatus = 'PENDING' | 'APPROVED_LEVEL1' | 'REJECTED' | 'RELEASED' | 'RECEIPT_SUBMITTED' | 'CLOSED';
export interface PettyCashRecord {
  id: string; branchId: string; amount: number | string; purpose: string; status: PettyCashStatus;
  approvalChain: Array<{ role: string; action: string; timestamp: string; comment: string }>;
  receiptProofUrl?: string | null; createdAt: string;
}
export interface ProfitLoss { revenue: number; operatingCosts: number; netMargin: number; month: string; }
export interface Expense { id: string; category: string; amount: number | string; description: string; date: string; branchId: string; }
export interface LedgerEntry { date: string; accountDebit: string; accountCredit: string; amount: number; description: string; }

export const financeApi = {
  pettyCash: () => request<PettyCashRecord[]>('/finances/petty-cash'),
  approvePettyCash: (id: string, remarks: string) => request<{ message: string }>(`/finances/petty-cash/approve-l2/${id}`, { method: 'POST', body: JSON.stringify({ remarks }) }),
  decidePettyCash: (id: string, action: 'REJECT' | 'REVISION', remarks: string) => request<{ message: string }>(`/finances/petty-cash/decide/${id}`, { method: 'POST', body: JSON.stringify({ action, remarks }) }),
  closePettyCash: (id: string) => request<{ message: string }>(`/finances/petty-cash/close/${id}`, { method: 'POST' }),
  pl: () => request<ProfitLoss>('/finances/pl'),
  expenses: () => request<{ expenses: Expense[] }>('/finances/expenses'),
  forecast: () => request<Record<string, unknown>>('/finances/forecast'),
  suggestions: () => request<Record<string, unknown>>('/finances/suggestions'),
  ledger: () => request<{ format: string; entries: LedgerEntry[] }>('/finances/ledger/export'),
};
