import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import { toBsLabel } from '../utils/nepaliDate';

interface StudentFee {
  studentId: string;
  userId: string;
  name: string;
  email: string;
  branchName: string | null;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  overdueCount: number;
  overdueAmount: number;
  invoiceCount: number;
}

interface Overview {
  collected: number;
  outstanding: number;
  overdueAmount: number;
  overdueStudents: number;
  invoiceCount: number;
  billingPeriod: string;
}

interface Invoice {
  id: string;
  netPayable: number;
  status: string;
  overdue: boolean;
  dueDate: string;
  billingCycleStart: string;
  billingCycleEnd: string;
  paymentDate: string | null;
}

function money(n: number): string {
  return `NPR ${n.toLocaleString()}`;
}

export function AcademicFees() {
  const { showToast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [students, setStudents] = useState<StudentFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE'>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);

  const [payStudent, setPayStudent] = useState<StudentFee | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [payingId, setPayingId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [ov, list] = await Promise.all([api.finances.getOverview(), api.finances.getStudentFees()]);
      setOverview(ov);
      setStudents(list as StudentFee[]);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load fees.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch = !term || s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (filter === 'OVERDUE') return s.overdueAmount > 0;
      if (filter === 'DUE') return s.totalDue > 0;
      return true;
    });
  }, [students, search, filter]);

  const openPayments = async (student: StudentFee) => {
    setPayStudent(student);
    setInvoicesLoading(true);
    setInvoices([]);
    try {
      const list = await api.finances.getStudentInvoices(student.studentId);
      setInvoices(list as Invoice[]);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to load invoices.', 'error');
    } finally {
      setInvoicesLoading(false);
    }
  };

  const recordPayment = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      await api.finances.payInvoice(invoiceId, 'CASH');
      showToast('Payment recorded.', 'success');
      if (payStudent) {
        const list = await api.finances.getStudentInvoices(payStudent.studentId);
        setInvoices(list as Invoice[]);
      }
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to record payment.', 'error');
    } finally {
      setPayingId('');
    }
  };

  const runBilling = async () => {
    setIsGenerating(true);
    try {
      const result = await api.finances.generateInvoices();
      showToast(result.message, result.created > 0 ? 'success' : 'info');
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to generate invoices.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="people-page">
      <div className="people-header">
        <div>
          <h1 className="people-title">Fee &amp; Billing</h1>
          <p className="people-subtitle">
            Collections, dues, and payments{overview ? ` · billing cycle ${overview.billingPeriod} BS` : ''}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={() => void loadData()} disabled={isLoading} style={{ height: '42px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh
          </Button>
          <Button onClick={() => void runBilling()} disabled={isGenerating} style={{ height: '42px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
            {isGenerating ? 'Generating…' : `Generate ${overview?.billingPeriod ?? ''} Invoices`}
          </Button>
        </div>
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <KPICard title="Collected" value={overview ? money(overview.collected) : '—'} delta="Paid invoices" icon="paid" accentColor="var(--color-success)" loading={isLoading} />
        <KPICard title="Outstanding" value={overview ? money(overview.outstanding) : '—'} delta="Unpaid + overdue" icon="account_balance_wallet" accentColor="var(--color-warning)" loading={isLoading} />
        <KPICard title="Overdue" value={overview ? money(overview.overdueAmount) : '—'} delta={overview && overview.overdueStudents > 0 ? `${overview.overdueStudents} student${overview.overdueStudents === 1 ? '' : 's'}` : 'None overdue'} icon="warning" accentColor="var(--color-error)" loading={isLoading} />
        <KPICard title="Invoices" value={overview ? overview.invoiceCount : '—'} delta="Total raised" icon="description" loading={isLoading} />
      </div>

      <div className="people-toolbar">
        <div className="people-search">
          <span className="material-symbols-outlined">search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students…" />
        </div>
        <select className="people-filter" value={filter} onChange={(e) => setFilter(e.target.value as 'ALL' | 'OVERDUE' | 'DUE')}>
          <option value="ALL">All students</option>
          <option value="OVERDUE">Overdue only</option>
          <option value="DUE">Any dues</option>
        </select>
      </div>

      <div className="people-table-wrap">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Branch</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="people-empty">
                      <span className="material-symbols-outlined">payments</span>
                      {isLoading ? 'Loading fees…' : students.length === 0 ? 'No students with fee records yet.' : 'No students match your filter.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.studentId}>
                    <td>
                      <div className="people-person-name">{s.name}</div>
                      <div className="people-person-email">{s.email}</div>
                    </td>
                    <td><span style={{ fontSize: '13.5px' }}>{s.branchName ?? '—'}</span></td>
                    <td><span style={{ fontSize: '13.5px', color: 'var(--color-success)', fontWeight: 600 }}>{money(s.totalPaid)}</span></td>
                    <td><span style={{ fontSize: '13.5px', fontWeight: 700, color: s.totalDue > 0 ? 'var(--color-text)' : 'var(--text-muted)' }}>{money(s.totalDue)}</span></td>
                    <td>
                      {s.overdueAmount > 0 ? (
                        <StatusBadge variant="error">Overdue</StatusBadge>
                      ) : s.totalDue > 0 ? (
                        <StatusBadge variant="warning">Due</StatusBadge>
                      ) : (
                        <StatusBadge variant="success">Cleared</StatusBadge>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="outline"
                        onClick={() => void openPayments(s)}
                        disabled={s.invoiceCount === 0}
                        style={{ minHeight: '34px', height: '34px', padding: '6px 14px', borderColor: 'rgba(21, 96, 189, 0.16)' }}
                      >
                        {s.totalDue > 0 ? 'Collect' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payStudent ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setPayStudent(null)} />
          <aside className="people-drawer" role="dialog" aria-modal="true">
            <div className="people-drawer-head">
              <div>
                <h2>{payStudent.name}</h2>
                <p>Invoices — record cash/bank payments here.</p>
              </div>
              <button type="button" className="people-drawer-close" onClick={() => setPayStudent(null)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="people-drawer-body">
              {invoicesLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>Loading invoices…</p>
              ) : invoices.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No invoices for this student.</p>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{money(inv.netPayable)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Due {toBsLabel(inv.dueDate)} BS
                        {inv.paymentDate ? ` · paid ${toBsLabel(inv.paymentDate)} BS` : ''}
                      </div>
                    </div>
                    {inv.status === 'PAID' ? (
                      <StatusBadge variant="success">Paid</StatusBadge>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {inv.overdue ? <StatusBadge variant="error">Overdue</StatusBadge> : <StatusBadge variant="warning">Unpaid</StatusBadge>}
                        <Button onClick={() => void recordPayment(inv.id)} disabled={payingId === inv.id} style={{ minHeight: '34px', height: '34px', padding: '6px 14px' }}>
                          {payingId === inv.id ? 'Saving…' : 'Mark Paid'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="people-drawer-foot">
              <Button variant="outline" onClick={() => setPayStudent(null)} style={{ flex: 1 }}>Done</Button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
