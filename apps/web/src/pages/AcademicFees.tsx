import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api, type BillingLedger } from '../services/api';
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
  const [billingProfile, setBillingProfile] = useState<BillingLedger['students'][number] | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [payingId, setPayingId] = useState('');
  const [qrModal, setQrModal] = useState<{ id: string; studentName: string; amount: number; month: string } | null>(null);

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
    setBillingProfile(null);
    try {
      const [list, ledger] = await Promise.all([
        api.finances.getStudentInvoices(student.studentId),
        api.finances.getBillingLedger(),
      ]);
      setInvoices(list as Invoice[]);
      setBillingProfile(ledger.students.find((item) => item.studentId === student.studentId) ?? null);
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
              ) : (
                <>
                  {billingProfile ? (
                    <section style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-surface)', marginBottom: '14px' }}>
                      <h3 style={{ fontSize: '15px', margin: 0 }}>Billing plan</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 12px' }}>
                        {billingProfile.grade} · estimated monthly billing {money(billingProfile.monthlyAmount)} · course through {new Date(billingProfile.courseEnd).toLocaleDateString('en-NP')}
                      </p>
                      {billingProfile.projections.length ? (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {billingProfile.projections.map((projection) => (
                            <div key={projection.cycleStart} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '12px' }}>{new Date(projection.cycleStart).toLocaleDateString('en-NP', { month: 'short', year: 'numeric' })} · due {new Date(projection.dueDate).toLocaleDateString('en-NP')}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><strong style={{ fontSize: '13px' }}>{money(projection.amount)}</strong><StatusBadge variant="info">Projection</StatusBadge></span>
                            </div>
                          ))}
                        </div>
                      ) : <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>No future billing cycles remain in the current course window.</p>}
                    </section>
                  ) : null}
                  {invoices.length === 0 ? (
                    <div className="people-empty" role="status"><span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>No invoices have been posted for this student yet.</div>
                  ) : invoices.map((inv) => (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {inv.overdue ? <StatusBadge variant="error">Overdue</StatusBadge> : <StatusBadge variant="warning">Unpaid</StatusBadge>}
                        <Button
                          variant="outline"
                          onClick={() => setQrModal({
                            id: inv.id,
                            studentName: payStudent.name,
                            amount: inv.netPayable,
                            month: toBsLabel(inv.dueDate)
                          })}
                          style={{ minHeight: '34px', height: '34px', padding: '6px 12px', borderColor: 'var(--color-accent)', color: 'var(--color-accent-hover)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>qr_code_scanner</span>
                          QR
                        </Button>
                        <Button onClick={() => void recordPayment(inv.id)} disabled={payingId === inv.id} style={{ minHeight: '34px', height: '34px', padding: '6px 14px' }}>
                          {payingId === inv.id ? 'Saving…' : 'Mark Paid'}
                        </Button>
                      </div>
                    )}
                  </div>
                  ))}
                </>
              )}
            </div>
            <div className="people-drawer-foot">
              <Button variant="outline" onClick={() => setPayStudent(null)} style={{ flex: 1 }}>Done</Button>
            </div>
          </aside>
        </>
      ) : null}

      {/* NepalPay QR Modal */}
      {qrModal ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setQrModal(null)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '32px',
            zIndex: 1100,
            width: '90%',
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '24px' }}>qr_code_2</span>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>NepalPay QR</span>
              </div>
              <button onClick={() => setQrModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Invoice for <strong>{qrModal.studentName}</strong> ({qrModal.month} BS)
            </div>

            {/* Generated QR Mock Card */}
            <div style={{
              background: '#F8F9FA',
              padding: '24px',
              borderRadius: '16px',
              border: '2px dashed var(--color-border)',
              marginBottom: '20px',
              display: 'inline-block'
            }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ display: 'block', margin: '0 auto' }}>
                {/* Outer frame */}
                <rect x="10" y="10" width="160" height="160" fill="none" stroke="#0F4C8A" strokeWidth="4" rx="8" />
                {/* QR Pattern Simulation */}
                <rect x="25" y="25" width="40" height="40" fill="#0F4C8A" />
                <rect x="33" y="33" width="24" height="24" fill="#FFFFFF" />
                <rect x="39" y="39" width="12" height="12" fill="#0F4C8A" />

                <rect x="115" y="25" width="40" height="40" fill="#0F4C8A" />
                <rect x="123" y="33" width="24" height="24" fill="#FFFFFF" />
                <rect x="129" y="39" width="12" height="12" fill="#0F4C8A" />

                <rect x="25" y="115" width="40" height="40" fill="#0F4C8A" />
                <rect x="33" y="123" width="24" height="24" fill="#FFFFFF" />
                <rect x="39" y="129" width="12" height="12" fill="#0F4C8A" />

                <path d="M75 25h30v10H75zM75 45h20v20H75zM100 55h20v10h-20zM25 75h50v10H25zM85 75h30v20H85zM125 75h30v10h-30zM45 95h30v30H45zM95 105h20v40H95zM125 115h25v25h-25z" fill="#2C3E50" />
                {/* NepalPay Logo Icon Center */}
                <circle cx="90" cy="90" r="16" fill="#F39C12" />
                <text x="90" y="94" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900">NPR</text>
              </svg>
            </div>

            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '4px' }}>
              {money(qrModal.amount)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Scan using FONEPAY, eSewa, Khalti, or any NepalPay Mobile Banking app.
            </div>

            <Button onClick={() => { showToast('QR code copied to clipboard!', 'success'); setQrModal(null); }} style={{ width: '100%' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>download</span>
              Done / Save QR
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
