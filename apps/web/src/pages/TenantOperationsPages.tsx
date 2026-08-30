import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { RemoteState } from '../components/patterns/RemoteState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import {
  type FinancialForecast,
  type FinancialSignal,
  type FinancialSuggestions,
} from '../features/tenant/tenantPortalData';
import { TenantAcademicCalendar } from '../features/tenant/TenantAcademicCalendar';
import { academicEventsApi, type AcademicEvent, type EventType } from '../services/api/academicEvents';
import { ApiError, errorMessage, request } from '../services/api/client';
import { financeApi, type Expense, type PettyCashRecord } from '../services/api/finance';
import { hrApi, type DocumentAlert, type PayrollRecord } from '../services/api/hr';
import { resourcesApi, type MaintenanceTask } from '../services/api/resources';
import { api } from '../services/api';
import './staffFinance.css';

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg-card)', color: 'var(--color-text)' };
const row: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '14px 0', display: 'grid', gap: 8 };

function Header({ title, description }: { title: string; description: string }) {
  return <div><h2 style={{ fontSize: 23 }}>{title}</h2><p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{description}</p></div>;
}

function useRemote<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await loader()); } catch (next) { setError(next); } finally { setLoading(false); }
  }, [loader]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function TenantPettyCashPage() {
  const { showToast } = useToast();
  const loader = useCallback(() => financeApi.pettyCash(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [status, setStatus] = useState('ALL');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const filtered = (data ?? []).filter((item) => status === 'ALL' || item.status === status);
  const mutate = async (item: PettyCashRecord, action: 'APPROVE' | 'REJECT' | 'REVISION' | 'CLOSE') => {
    if ((action === 'REJECT' || action === 'REVISION') && !remarks[item.id]?.trim()) return showToast('Decision remarks are required.', 'error');
    if (action === 'APPROVE' && !window.confirm(`Record release of NPR ${Number(item.amount).toLocaleString()}? TMS will not transfer funds.`)) return;
    setBusy(item.id);
    try {
      if (action === 'APPROVE') await financeApi.approvePettyCash(item.id, remarks[item.id] ?? '');
      if (action === 'REJECT' || action === 'REVISION') await financeApi.decidePettyCash(item.id, action, remarks[item.id]);
      if (action === 'CLOSE') await financeApi.closePettyCash(item.id);
      showToast('Petty-cash record updated.', 'success'); await reload();
    } catch (next) { showToast(errorMessage(next), 'error'); if (next instanceof ApiError && next.isConflict) await reload(); }
    finally { setBusy(''); }
  };
  return <div style={{ display: 'grid', gap: 18 }}><Header title="Petty Cash" description="Review branch requests and record manual release or closure." />
    <Card hoverable={false}><label>Filter status <select style={{ ...input, width: 220, marginLeft: 10 }} value={status} onChange={(e) => setStatus(e.target.value)}><option>ALL</option><option>APPROVED_LEVEL1</option><option>RELEASED</option><option>RECEIPT_SUBMITTED</option><option>CLOSED</option><option>REJECTED</option></select></label></Card>
    {loading ? <RemoteState kind="loading" /> : error ? <RemoteState kind={error instanceof ApiError && error.isAccessDenied ? 'denied' : 'error'} message={errorMessage(error)} onRetry={() => void reload()} /> :
      !filtered.length ? <RemoteState kind="empty" message="No petty-cash records match this filter." /> :
      <Card hoverable={false}>{filtered.map((item) => <div key={item.id} style={row}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><strong>{item.purpose}</strong><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(item.createdAt).toLocaleDateString()}</p></div><div style={{ textAlign: 'right' }}><strong>NPR {Number(item.amount).toLocaleString()}</strong><br/><StatusBadge variant="info">{item.status}</StatusBadge></div></div>
        {item.approvalChain?.length ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.approvalChain.map((step) => `${step.role}: ${step.action}`).join(' → ')}</p> : null}
        {item.status === 'APPROVED_LEVEL1' ? <><textarea style={input} aria-label="Decision remarks" placeholder="Decision remarks" value={remarks[item.id] ?? ''} onChange={(e) => setRemarks((old) => ({ ...old, [item.id]: e.target.value }))}/><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Button disabled={busy === item.id} onClick={() => void mutate(item, 'APPROVE')}>Record release</Button><Button variant="outline" disabled={busy === item.id} onClick={() => void mutate(item, 'REVISION')}>Send back</Button><Button variant="danger" disabled={busy === item.id} onClick={() => void mutate(item, 'REJECT')}>Reject</Button></div></> : null}
        {item.status === 'RECEIPT_SUBMITTED' ? <Button disabled={busy === item.id} onClick={() => void mutate(item, 'CLOSE')}>Verify & close</Button> : null}
      </div>)}</Card>}
  </div>;
}

export function TenantReportsPage() {
  const { showToast } = useToast();
  const loader = useCallback(async () => {
    const [pl, expenses, forecast, suggestions, globalLedger] = await Promise.all([
      financeApi.pl(), financeApi.expenses(), financeApi.forecast(), financeApi.suggestions(), api.finances.getBillingLedger()
    ]);
    return {
      pl,
      expenses: expenses.expenses,
      forecast: forecast as unknown as FinancialForecast,
      suggestions: suggestions as unknown as FinancialSuggestions,
      globalLedger
    };
  }, []);
  const { data, loading, error, reload } = useRemote(loader);
  const download = async () => {
    try {
      const { entries } = await financeApi.ledger();
      const fields = ['date', 'accountDebit', 'accountCredit', 'amount', 'description'] as const;
      const csv = [fields.join(','), ...entries.map((entry) => fields.map((field) => `"${String(entry[field]).replaceAll('"', '""')}"`).join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `tms-ledger-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (next) { showToast(errorMessage(next), 'error'); }
  };
  if (loading) return <RemoteState kind="loading" />; if (error || !data) return <RemoteState kind="error" message={errorMessage(error)} onRetry={() => void reload()} />;
  const cards: Array<[string, number, string]> = [['Revenue', data.pl.revenue, 'var(--color-success)'], ['Operating costs', data.pl.operatingCosts, 'var(--color-error)'], ['Net margin', data.pl.netMargin, 'var(--color-primary)']];
  const forecastMetrics = data.forecast.metrics;
  const forecastProgress = forecastMetrics.netForecastNpr > 0
    ? Math.min(100, Math.round((forecastMetrics.actualCollectedNpr / forecastMetrics.netForecastNpr) * 100))
    : 0;
  const signalVariant = (signal: FinancialSignal): 'error' | 'warning' | 'info' => signal.severity === 'HIGH' ? 'error' : signal.severity === 'INFO' ? 'info' : 'warning';
  const projectedMonthlyRevenue = data.globalLedger.students.reduce((sum, student) => sum + student.monthlyAmount, 0);
  const projectedMonthlyPayroll = data.globalLedger.teachers.reduce((sum, teacher) => sum + teacher.baseSalary, 0);
  const collectedRevenue = data.globalLedger.students.flatMap((student) => student.invoices).filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.netPayable, 0);
  const projectedMargin = projectedMonthlyRevenue - projectedMonthlyPayroll;
  return <div style={{ display: 'grid', gap: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <Header title="P&L and Ledger" description="Consolidated institution reporting from recorded financial transactions."/>
      <Button onClick={() => void download()}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>download</span>Download ledger</Button>
    </div>
    <div style={grid}>{cards.map(([name, value, color]) => <Card key={name} hoverable={false}><p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>{name}</p><strong style={{ display: 'block', marginTop: 8, fontSize: 25, color, fontVariantNumeric: 'tabular-nums' }}>NPR {value.toLocaleString()}</strong><p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>{data.pl.month}</p></Card>)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)', gap: 18 }}>
      <Card hoverable={false}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><div><h3>Institution billing projections</h3><p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>Derived from active student fees and staff contracts</p></div><StatusBadge variant={projectedMargin >= 0 ? 'success' : 'warning'}>{projectedMargin >= 0 ? 'Positive margin' : 'Projected deficit'}</StatusBadge></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginTop: 16 }}>
          {[
            ['Projected monthly tuition', projectedMonthlyRevenue],
            ['Projected annual tuition', projectedMonthlyRevenue * 12],
            ['Projected monthly payroll', projectedMonthlyPayroll],
            ['Recorded invoice collections', collectedRevenue],
            ['Projected monthly margin', projectedMargin]
          ].map(([label, value]) => <div key={String(label)} style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--border)' }}><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</p><strong style={{ display: 'block', marginTop: 6, fontVariantNumeric: 'tabular-nums', color: String(label).includes('Net') ? (Number(value) > 0 ? 'var(--color-success)' : 'var(--color-error)') : 'inherit' }}>NPR {Number(value).toLocaleString()}</strong></div>)}
        </div>
      </Card>
      <Card hoverable={false}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><div><h3>Legacy Monthly forecast</h3><p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>{data.forecast.billingCycle}</p></div><StatusBadge variant={forecastMetrics.varianceNpr >= 0 ? 'success' : 'warning'}>{forecastProgress}% collected</StatusBadge></div>
        <div style={{ height: 8, margin: '18px 0', overflow: 'hidden', borderRadius: 999, background: 'var(--border)' }}><div style={{ width: `${forecastProgress}%`, height: '100%', borderRadius: 'inherit', background: 'var(--color-primary)' }}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[['Expected tuition', forecastMetrics.baseForecastNpr], ['Net forecast', forecastMetrics.netForecastNpr]].map(([label, value]) => <div key={String(label)} style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--border)' }}><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</p><strong style={{ display: 'block', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>NPR {Number(value).toLocaleString()}</strong></div>)}
        </div>
        <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>{forecastMetrics.activeEnrollments} active enrollments · Estimated attrition {forecastMetrics.attritionPercentage}</p>
      </Card>
    </div>
    <Card hoverable={false}>
      <div className="accountant-header" style={{ marginBottom: 16 }}>
        <div className="accountant-header-title">
          <h2>Global Ledger (All Branches)</h2>
          <p className="accountant-text-muted" style={{ marginTop: 4 }}>Consolidated view of all branch invoices and payrolls.</p>
        </div>
      </div>
      <div className="accountant-table-scroll">
        <table className="accountant-table">
          <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Branch</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {data.globalLedger.students.flatMap((student) => student.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><strong>{invoice.id.slice(0, 8)}</strong></td><td>Invoice · {invoice.invoiceType}</td><td>{student.studentName}</td><td>{student.branchName}</td><td className="is-amount">NPR {invoice.netPayable.toLocaleString()}</td><td><StatusBadge variant={invoice.status === 'PAID' ? 'success' : invoice.overdue ? 'error' : 'warning'}>{invoice.overdue && invoice.status !== 'PAID' ? 'OVERDUE' : invoice.status}</StatusBadge></td>
              </tr>
            )))}
            {data.globalLedger.teachers.flatMap((teacher) => teacher.payrolls.map((payroll) => (
              <tr key={payroll.id}>
                <td><strong>{payroll.id.slice(0, 8)}</strong></td><td>Payroll</td><td>{teacher.teacherName}</td><td>{teacher.branchName}</td><td className="is-amount">NPR {payroll.netPayable.toLocaleString()}</td><td><StatusBadge variant={payroll.status === 'MANUALLY_PAID' ? 'success' : 'warning'}>{payroll.status.replaceAll('_', ' ')}</StatusBadge></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </Card>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)', gap: 18 }}>
      <Card hoverable={false}>
        <h3>Budget outlook</h3><p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>Projected operational surplus</p>
        <strong style={{ display: 'block', marginTop: 14, color: 'var(--color-success)', fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>NPR {data.suggestions.budgetAnalysis.projectedSurplusNpr.toLocaleString()}</strong>
        <p style={{ marginTop: 14, lineHeight: 1.6, color: 'var(--text-muted)', fontSize: 13 }}>{data.suggestions.budgetAnalysis.promptText}</p>
      </Card>
      <Card hoverable={false}>
        <h3>Recorded expenses</h3><p style={{ marginTop: 4, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>Latest operating costs by category</p>{data.expenses.map((expense: Expense) => <div key={expense.id} style={row}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}><div><strong>{expense.category}</strong><p style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 12 }}>{expense.description}</p></div><strong style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>NPR {Number(expense.amount).toLocaleString()}</strong></div></div>)}
      </Card>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
      <Card hoverable={false}><h3>Financial signals</h3><p style={{ marginTop: 4, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>Items that may need review</p>{data.suggestions.alerts.map((signal: FinancialSignal, index: number) => <div key={`${signal.type}-${index}`} style={row}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><strong style={{ fontSize: 13 }}>{signal.type.replaceAll('_', ' ')}</strong><StatusBadge variant={signalVariant(signal)}>{signal.severity}</StatusBadge></div><p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55 }}>{signal.message}</p></div>)}</Card>
    </div>
  </div>;
}

export function TenantPayrollPage() {
  const { showToast } = useToast();
  const loader = useCallback(() => hrApi.payroll(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const now = new Date(); const [month, setMonth] = useState(now.getMonth() + 1); const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(''); const [references, setReferences] = useState<Record<string, string>>({});
  const mutate = async (record: PayrollRecord, action: 'APPROVE' | 'RECONCILE') => {
    if (action === 'RECONCILE' && !references[record.id]?.trim()) return showToast('External payment reference is required.', 'error');
    if (!window.confirm(action === 'APPROVE' ? 'Approve this salary obligation for external payment?' : 'Confirm salary was paid outside TMS?')) return;
    setBusy(record.id); try { if (action === 'APPROVE') await hrApi.approve(record.id); else await hrApi.reconcile(record.id, references[record.id]); showToast('Payroll updated.', 'success'); await reload(); } catch (next) { showToast(errorMessage(next), 'error'); if (next instanceof ApiError && next.isConflict) await reload(); } finally { setBusy(''); }
  };
  const calculate = async () => { setBusy('calculate'); try { await hrApi.calculate(month, year); showToast('Payroll calculated.', 'success'); await reload(); } catch (next) { showToast(errorMessage(next), 'error'); } finally { setBusy(''); } };
  return <div style={{ display: 'grid', gap: 18 }}><Header title="Payroll" description="Calculate and approve obligations; salaries are paid outside TMS."/><Card hoverable={false}><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input aria-label="Payroll month" style={{ ...input, width: 120 }} type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value))}/><input aria-label="Payroll year" style={{ ...input, width: 140 }} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}/><Button disabled={busy === 'calculate'} onClick={() => void calculate()}>Calculate period</Button></div></Card>
    {loading ? <RemoteState kind="loading"/> : error ? <RemoteState kind="error" message={errorMessage(error)} onRetry={() => void reload()}/> : !data?.payrolls.length ? <RemoteState kind="empty" message="No payroll records yet."/> :
    <Card hoverable={false}>{data.payrolls.map((record) => <div key={record.id} style={row}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{record.staffRecord.user.firstName} {record.staffRecord.user.lastName}</strong><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{record.month}/{record.year} · {record.staffRecord.designation}</p></div><div><strong>NPR {Number(record.netPayable).toLocaleString()}</strong><br/><StatusBadge variant="info">{record.status}</StatusBadge></div></div>
      {record.status === 'PENDING' ? <Button disabled={busy === record.id} onClick={() => void mutate(record, 'APPROVE')}>Approve for external payment</Button> : null}
      {record.status === 'APPROVED_FOR_MANUAL_PAYMENT' ? <div style={{ display: 'flex', gap: 8 }}><input style={input} placeholder="External payment reference" value={references[record.id] ?? ''} onChange={(e) => setReferences((old) => ({ ...old, [record.id]: e.target.value }))}/><Button disabled={busy === record.id} onClick={() => void mutate(record, 'RECONCILE')}>Reconcile</Button></div> : null}
    </div>)}</Card>}</div>;
}

interface Branch { id: string; name: string; admissionFee?: number; }
export function TenantResourcesPage() {
  const [branches, setBranches] = useState<Branch[]>([]); const [branchId, setBranchId] = useState(''); const [tasks, setTasks] = useState<MaintenanceTask[]>([]); const [error, setError] = useState<unknown>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const result = await request<{ branches: Branch[] }>('/branches'); setBranches(result.branches); const selected = branchId || result.branches[0]?.id || ''; setBranchId(selected); setTasks(selected ? (await resourcesApi.tasks(selected)).tasks : []); } catch (next) { setError(next); } finally { setLoading(false); } }, [branchId]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => tasks.map((task) => ({ ...task, escalated: task.status !== 'COMPLETED' && Date.now() - new Date(task.createdAt).getTime() > task.escalationDaysSnapshot * 86400000 })), [tasks]);
  return <div style={{ display: 'grid', gap: 18 }}><Header title="Resource Oversight" description="Monitor maintenance work and policy-based escalation across branches."/><Card hoverable={false}><select style={{ ...input, maxWidth: 280 }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Card>{loading ? <RemoteState kind="loading"/> : error ? <RemoteState kind="error" message={errorMessage(error)} onRetry={() => void load()}/> : !visible.length ? <RemoteState kind="empty" message="No maintenance tasks for this branch."/> : <Card hoverable={false}>{visible.map((task) => <div key={task.id} style={row}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{task.description}</strong><StatusBadge variant={task.escalated ? 'error' : 'info'}>{task.escalated ? 'ESCALATED' : task.status}</StatusBadge></div><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Escalates after {task.escalationDaysSnapshot} days · Assignee {task.assignedStaffId}</p></div>)}</Card>}</div>;
}

export function TenantCalendarPage() {
  const { showToast } = useToast(); const loader = useCallback(() => academicEventsApi.list(), []); const { data, loading, error, reload } = useRemote(loader);
  const [busy, setBusy] = useState(false); const [form, setForm] = useState({ title: '', description: '', eventType: 'EVENT' as EventType, startDate: '', endDate: '' });
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await academicEventsApi.createTenantWide({ ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() }); showToast('Institution-wide event published.', 'success'); setForm({ title: '', description: '', eventType: 'EVENT', startDate: '', endDate: '' }); await reload(); } catch (next) { showToast(errorMessage(next), 'error'); } finally { setBusy(false); } };
  const events = data?.events ?? [];
  return <div style={{ display: 'grid', gap: 18 }}><Header title="Academic Calendar" description="Plan institution-wide events and review the complete academic month."/>
    {error ? <RemoteState kind="error" message={errorMessage(error)} onRetry={() => void reload()}/> : null}
    <TenantAcademicCalendar events={events} loading={loading} />
    <div className="tenant-calendar-page__lower"><Card hoverable={false}><h3>New institution event</h3><form onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 14, marginTop: 14 }}>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>Event title<input style={input} placeholder="Parent orientation" value={form.title} onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))} required/></label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>Event type<select style={input} value={form.eventType} onChange={(e) => setForm((old) => ({ ...old, eventType: e.target.value as EventType }))}><option value="EVENT">Event</option><option value="HOLIDAY">Holiday</option><option value="EXAM">Exam</option><option value="FEE_DUE">Fee due</option></select></label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>Starts<input style={input} type="datetime-local" value={form.startDate} onChange={(e) => setForm((old) => ({ ...old, startDate: e.target.value }))} required/></label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>Ends<input style={input} type="datetime-local" value={form.endDate} onChange={(e) => setForm((old) => ({ ...old, endDate: e.target.value }))} required/></label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>Description<textarea style={{ ...input, minHeight: 92, resize: 'vertical' }} placeholder="What should branches know about this event?" value={form.description} onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}/></label>
      <Button disabled={busy} aria-busy={busy} type="submit">{busy ? 'Publishing…' : 'Publish to all branches'}</Button></form></Card>
      <Card hoverable={false}><h3>Published events</h3><p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>Institution and branch events currently visible on the calendar.</p>{events.map((item: AcademicEvent) => <div key={item.id} style={row}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><strong>{item.title}</strong><p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{new Date(item.startDate).toLocaleString()} · {item.eventType.replace('_', ' ')}</p></div><StatusBadge variant={item.branchId ? 'info' : 'success'}>{item.branchId ? 'Branch' : 'Institution-wide'}</StatusBadge></div></div>)}</Card>
    </div>
  </div>;
}

export function TenantHrPage() {
  const loader = useCallback(() => hrApi.documentAlerts(), []); const { data, loading, error, reload } = useRemote(loader);
  const docs = data?.expiringDocs ?? [];
  return <div style={{ display: 'grid', gap: 18 }}><Header title="HR Management" description="Institution-wide document expiry alerts and final-settlement dependencies."/>
    {loading ? <RemoteState kind="loading"/> : error ? <RemoteState kind="error" message={errorMessage(error)} onRetry={() => void reload()}/> : !docs.length ? <RemoteState kind="empty" message="No staff documents expire within 30 days."/> : <Card hoverable={false}>{docs.map((doc: DocumentAlert) => { const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000); return <div key={doc.id} style={row}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{doc.documentType}</strong><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Staff record {doc.staffRecordId}</p></div><StatusBadge variant="warning">{days} days remaining</StatusBadge></div></div>; })}</Card>}
    <RemoteState kind="unavailable" message="Exit-case list/detail is blocked pending a tenant-scoped backend queue contract."/>
  </div>;
}

interface GradeOption { id: string; name: string; admissionFee?: number | string; }
interface AdmissionResult {
  admission: {
    studentId: string; admissionNumber: string; admittedAt: string; status: 'PENDING_PAYMENT' | 'READY_FOR_LOGIN' | 'ACTIVE'; admissionFee: number | string;
    record: { institutionName: string; branchName: string; branchAddress: string; gradeName: string; className: string; admittedBy: { id: string; name: string }; primaryGuardian: { name: string; email: string; phone: string; relationship: string }; student: Record<string, string> };
  };
  loginDelivery: { delivered: boolean } | null;
  message: string;
}

function AdmissionPrintRecord({ result }: { result: AdmissionResult }) {
  const { admission } = result;
  const { record } = admission;
  const student = record.student;
  const details = [
    ['Admission number', admission.admissionNumber], ['Admitted', new Date(admission.admittedAt).toLocaleString('en-NP')],
    ['Student', `${student.firstName} ${student.lastName}`], ['Date of birth', student.dateOfBirth], ['Gender', student.gender],
    ['Blood group', student.bloodGroup || '—'], ['Nationality', student.nationality], ['Student phone', student.phone], ['Student email', student.email],
    ['Grade', record.gradeName], ['Class', record.className], ['Permanent address', student.permanentAddress],
    ['Temporary address', student.temporaryAddress || '—'], ['School', student.school || '—'], ['Medical/accessibility notes', student.medicalNotes || 'None recorded'],
  ];
  return <section className="admission-print-record" aria-label="Printable admission record">
    <header><div><h1>{record.institutionName}</h1><p>{record.branchName} · {record.branchAddress}</p></div><div><strong>STUDENT ADMISSION RECORD</strong><span>{admission.admissionNumber}</span></div></header>
    <h2>Student and admission information</h2><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="admission-print-columns"><section><h2>Father</h2><p><strong>{student.fatherName}</strong><br />{student.fatherPhone}<br />{student.fatherEmail || 'No email'}<br />{student.fatherOccupation || 'Occupation not recorded'}</p></section><section><h2>Mother</h2><p><strong>{student.motherName}</strong><br />{student.motherPhone}<br />{student.motherEmail || 'No email'}<br />{student.motherOccupation || 'Occupation not recorded'}</p></section></div>
    {student.optionalParentName ? <div className="admission-print-columns"><section><h2>Optional parent / guardian</h2><p><strong>{student.optionalParentName}</strong> ({student.optionalParentRelationship || 'Relationship not recorded'})<br />{student.optionalParentPhone || 'No phone'}<br />{student.optionalParentEmail || 'No email'}<br />{student.optionalParentOccupation || 'Occupation not recorded'}</p></section></div> : null}
    <div className="admission-print-columns"><section><h2>Primary parent account</h2><p><strong>{record.primaryGuardian.name}</strong> ({record.primaryGuardian.relationship})<br />{record.primaryGuardian.phone}<br />{record.primaryGuardian.email}</p></section><section><h2>Emergency contact</h2><p><strong>{student.emergencyContactName}</strong> ({student.emergencyContactRelationship})<br />{student.emergencyContactPhone}</p></section></div>
    <footer><div><span>Admitted by</span><strong>{record.admittedBy.name}</strong></div><div><span>Admission date and time</span><strong>{new Date(admission.admittedAt).toLocaleString('en-NP')}</strong></div><div className="admission-signature"><span>Parent/guardian signature</span></div><div className="admission-signature"><span>Authorized signature</span></div></footer>
  </section>;
}
export function TenantAdmissionsPage() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]); const [grades, setGrades] = useState<GradeOption[]>([]); const [classes, setClasses] = useState<any[]>([]);
  const [busy, setBusy] = useState(false); const [result, setResult] = useState<AdmissionResult | null>(null); const [printAfterSave, setPrintAfterSave] = useState(false);
  const localDateTime = () => { const value = new Date(); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 16); };
  const [form, setForm] = useState({ branchId: '', gradeId: '', classId: '', admittedAt: localDateTime(), studentFirst: '', studentLast: '', studentEmail: '', studentPhone: '', dateOfBirth: '', gender: '', bloodGroup: '', nationality: 'Nepali', permanentAddress: '', temporaryAddress: '', school: '', medicalNotes: '', fatherName: '', fatherPhone: '', fatherEmail: '', fatherOccupation: '', motherName: '', motherPhone: '', motherEmail: '', motherOccupation: '', optionalParentName: '', optionalParentPhone: '', optionalParentEmail: '', optionalParentOccupation: '', optionalParentRelationship: '', primaryParent: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '' });
  useEffect(() => { void Promise.all([request<{ branches: Branch[] }>('/branches'), request<{ grades: GradeOption[] }>('/grades'), request<{ classes: any[] }>('/courses/classes')]).then(([b, g, c]) => { setBranches(b.branches); setGrades(g.grades); setClasses(c.classes); const branchId = b.branches[0]?.id ?? ''; const gradeId = g.grades[0]?.id ?? ''; const classId = c.classes.find((item) => item.branchId === branchId && item.gradeId === gradeId && item.courseType === 'REGULAR')?.id ?? ''; setForm((old) => ({ ...old, branchId, gradeId, classId })); }).catch((next) => showToast(errorMessage(next), 'error')); }, []);
  useEffect(() => { if (result && printAfterSave) { setPrintAfterSave(false); window.setTimeout(() => window.print(), 0); } }, [result, printAfterSave]);
  const availableClasses = classes.filter((item) => item.branchId === form.branchId && item.gradeId === form.gradeId && item.courseType === 'REGULAR');
  const requiredAdmissionFields = ['branchId','gradeId','classId','admittedAt','studentFirst','studentLast','studentEmail','studentPhone','dateOfBirth','gender','nationality','permanentAddress','fatherName','fatherPhone','motherName','motherPhone','primaryParent','emergencyContactName','emergencyContactPhone','emergencyContactRelationship'] as const;
  const selectedPrimaryEmail = form.primaryParent === 'Father' ? form.fatherEmail : form.primaryParent === 'Mother' ? form.motherEmail : form.primaryParent === 'Optional parent' ? form.optionalParentEmail : '';
  const optionalParentComplete = form.primaryParent !== 'Optional parent' || Boolean(form.optionalParentName.trim() && form.optionalParentPhone.trim() && form.optionalParentEmail.trim());
  const canPrint = requiredAdmissionFields.every((key) => form[key].trim()) && Boolean(selectedPrimaryEmail.trim()) && optionalParentComplete && !busy;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldPrint = submitter?.value === 'save-and-print';
    setPrintAfterSave(shouldPrint); setBusy(true);
    try {
      const admissionDetails = Object.fromEntries(Object.entries(form).filter(([key]) => ['admittedAt','dateOfBirth','gender','bloodGroup','nationality','permanentAddress','temporaryAddress','school','medicalNotes','fatherName','fatherPhone','fatherEmail','fatherOccupation','motherName','motherPhone','motherEmail','motherOccupation','optionalParentName','optionalParentPhone','optionalParentEmail','optionalParentOccupation','optionalParentRelationship','primaryParent','emergencyContactName','emergencyContactPhone','emergencyContactRelationship'].includes(key)));
      const selectedParent = form.primaryParent === 'Father' ? { name: form.fatherName, email: form.fatherEmail, phone: form.fatherPhone } : form.primaryParent === 'Mother' ? { name: form.motherName, email: form.motherEmail, phone: form.motherPhone } : { name: form.optionalParentName, email: form.optionalParentEmail, phone: form.optionalParentPhone };
      if (form.studentEmail.trim().toLowerCase() === selectedParent.email.trim().toLowerCase()) throw new Error('Student and primary parent emails must be different.');
      const nameParts = selectedParent.name.trim().split(/\s+/); const firstName = nameParts.shift() ?? ''; const lastName = nameParts.join(' ') || firstName;
      const admission = await request<AdmissionResult>('/users/admissions', { method: 'POST', body: JSON.stringify({ branchId: form.branchId, gradeId: form.gradeId, classId: form.classId, student: { firstName: form.studentFirst, lastName: form.studentLast, email: form.studentEmail, phone: form.studentPhone }, parent: { firstName, lastName, email: selectedParent.email, phone: selectedParent.phone }, admissionDetails }) });
      setResult(admission); showToast(admission.message, admission.loginDelivery && !admission.loginDelivery.delivered ? 'error' : 'success');
    } catch (next) { setPrintAfterSave(false); showToast(errorMessage(next), 'error'); } finally { setBusy(false); }
  };
  const acknowledge = () => { setResult(null); setForm((old) => ({ ...old, admittedAt: localDateTime(), studentFirst: '', studentLast: '', studentEmail: '', studentPhone: '', dateOfBirth: '', gender: '', bloodGroup: '', permanentAddress: '', temporaryAddress: '', school: '', medicalNotes: '', fatherName: '', fatherPhone: '', fatherEmail: '', fatherOccupation: '', motherName: '', motherPhone: '', motherEmail: '', motherOccupation: '', optionalParentName: '', optionalParentPhone: '', optionalParentEmail: '', optionalParentOccupation: '', optionalParentRelationship: '', primaryParent: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '' })); };
  const selectedBranch = branches.find((branch) => branch.id === form.branchId);
  return <div style={{ display: 'grid', gap: 18 }}><Header title="Admissions" description="Complete admission first. Login IDs activate and are sent to the recorded phone numbers only after the branch fee is paid."/>
    {!result ? <Card hoverable={false}><form onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 16 }} aria-busy={busy}>
      <div style={grid}>
        <label>Branch<select required style={input} value={form.branchId} onChange={(e) => { const branchId = e.target.value; const classId = classes.find((item) => item.branchId === branchId && item.gradeId === form.gradeId && item.courseType === 'REGULAR')?.id ?? ''; setForm((old) => ({ ...old, branchId, classId })); }}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Grade<select required style={input} value={form.gradeId} onChange={(e) => { const gradeId = e.target.value; const classId = classes.find((item) => item.branchId === form.branchId && item.gradeId === gradeId && item.courseType === 'REGULAR')?.id ?? ''; setForm((old) => ({ ...old, gradeId, classId })); }}>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
        <label>Regular class<select required style={input} value={form.classId} onChange={(e) => setForm((old) => ({ ...old, classId: e.target.value }))}><option value="">Select class</option>{availableClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.courseName}</option>)}</select>{!availableClasses.length ? <small style={{ color: 'var(--color-error)' }}>Create a regular class for this branch and grade before admission.</small> : null}</label>
        <label>Admission date and time *<input required type="datetime-local" style={input} value={form.admittedAt} onChange={(e) => setForm((old) => ({ ...old, admittedAt: e.target.value }))}/></label>
      </div>
      <div role="note" style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--color-surface)' }}>
        <strong>Admission fee for this branch: NPR {Number(selectedBranch?.admissionFee ?? 0).toLocaleString()}</strong>
        <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>Tenant Admin can edit this amount independently in Branches.</p>
      </div>
      <fieldset className="admission-fieldset"><legend>Student details</legend><div style={grid}>{[['studentFirst','First name'],['studentLast','Last name'],['studentEmail','Email'],['studentPhone','Phone']].map(([key, text]) => <label key={key}>{text} *<input required style={input} type={key.includes('Email') ? 'email' : key.includes('Phone') ? 'tel' : 'text'} autoComplete={key.includes('Email') ? 'email' : key.includes('Phone') ? 'tel' : key.includes('First') ? 'given-name' : 'family-name'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}<label>Date of birth *<input required type="date" max={new Date().toISOString().slice(0, 10)} style={input} value={form.dateOfBirth} onChange={(e) => setForm((old) => ({ ...old, dateOfBirth: e.target.value }))}/></label><label>Gender *<select required style={input} value={form.gender} onChange={(e) => setForm((old) => ({ ...old, gender: e.target.value }))}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label><label>Blood group<input style={input} value={form.bloodGroup} onChange={(e) => setForm((old) => ({ ...old, bloodGroup: e.target.value }))} placeholder="O+" /></label><label>Nationality *<input required style={input} value={form.nationality} onChange={(e) => setForm((old) => ({ ...old, nationality: e.target.value }))}/></label><label>School<input style={input} value={form.school} onChange={(e) => setForm((old) => ({ ...old, school: e.target.value }))}/></label></div><label>Permanent address *<textarea required style={{ ...input, minHeight: 72 }} value={form.permanentAddress} onChange={(e) => setForm((old) => ({ ...old, permanentAddress: e.target.value }))}/></label><label>Temporary address<textarea style={{ ...input, minHeight: 72 }} value={form.temporaryAddress} onChange={(e) => setForm((old) => ({ ...old, temporaryAddress: e.target.value }))}/></label><label>Medical conditions, allergies, or accessibility notes<textarea style={{ ...input, minHeight: 72 }} value={form.medicalNotes} onChange={(e) => setForm((old) => ({ ...old, medicalNotes: e.target.value }))}/></label></fieldset>
      <fieldset className="admission-fieldset"><legend>Father's details</legend><div style={grid}>{[['fatherName','Full name *'],['fatherPhone','Phone *'],['fatherEmail','Email'],['fatherOccupation','Occupation']].map(([key, text]) => <label key={key}>{text}<input required={key === 'fatherName' || key === 'fatherPhone'} style={input} type={key.includes('Email') ? 'email' : key.includes('Phone') ? 'tel' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}</div></fieldset>
      <fieldset className="admission-fieldset"><legend>Mother's details</legend><div style={grid}>{[['motherName','Full name *'],['motherPhone','Phone *'],['motherEmail','Email'],['motherOccupation','Occupation']].map(([key, text]) => <label key={key}>{text}<input required={key === 'motherName' || key === 'motherPhone'} style={input} type={key.includes('Email') ? 'email' : key.includes('Phone') ? 'tel' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}</div></fieldset>
      <fieldset className="admission-fieldset"><legend>Optional parent or guardian</legend><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Leave this section empty if only the father and mother should be recorded.</p><div style={grid}>{[['optionalParentName','Full name'],['optionalParentPhone','Phone'],['optionalParentEmail','Email'],['optionalParentOccupation','Occupation'],['optionalParentRelationship','Relationship']].map(([key, text]) => <label key={key}>{text}<input style={input} type={key.includes('Email') ? 'email' : key.includes('Phone') ? 'tel' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}</div></fieldset>
      <fieldset className="admission-fieldset"><legend>Primary parent account</legend><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select one parent already entered above. Their email and phone will be used automatically for account credentials.</p><label htmlFor="admission-primary-parent">Parent receiving credentials *<select id="admission-primary-parent" required style={input} value={form.primaryParent} onChange={(e) => setForm((old) => ({ ...old, primaryParent: e.target.value }))}><option value="">Select recorded parent</option><option value="Father" disabled={!form.fatherName || !form.fatherPhone || !form.fatherEmail}>Father{!form.fatherEmail ? ' — add email first' : ''}</option><option value="Mother" disabled={!form.motherName || !form.motherPhone || !form.motherEmail}>Mother{!form.motherEmail ? ' — add email first' : ''}</option><option value="Optional parent" disabled={!form.optionalParentName || !form.optionalParentPhone || !form.optionalParentEmail}>Optional parent{!form.optionalParentEmail ? ' — complete optional parent first' : ''}</option></select></label></fieldset>
      <fieldset className="admission-fieldset"><legend>Emergency contact</legend><div style={grid}>{[['emergencyContactName','Full name *'],['emergencyContactPhone','Phone *'],['emergencyContactRelationship','Relationship *']].map(([key, text]) => <label key={key}>{text}<input required style={input} type={key.includes('Phone') ? 'tel' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}</div></fieldset>
      <div className="admission-result-actions">
        <Button disabled={busy || !form.branchId || !form.gradeId || !form.classId || !form.admittedAt} type="submit">{busy ? 'Saving admission…' : 'Complete admission'}</Button>
        <Button variant="outline" type="submit" name="admission-action" value="save-and-print" disabled={!canPrint} title={canPrint ? 'Save the admission and open the printable record' : 'Complete every required field to enable printing'}><span className="material-symbols-outlined" aria-hidden="true">print</span>Save and print admission</Button>
      </div>
      {!canPrint && !busy ? <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Complete all required fields to enable printing.</p> : null}
    </form></Card> : <Card hoverable={false}><StatusBadge variant={result.admission.status === 'ACTIVE' ? 'success' : 'warning'}>{result.admission.status === 'ACTIVE' ? 'Active' : 'Payment pending'}</StatusBadge><h3 style={{ marginTop: 12 }}>Admission recorded</h3><div role="status" style={{ padding: 16, marginTop: 12, background: 'var(--color-warning-soft)', borderRadius: 10 }}><strong>{result.message}</strong><p style={{ marginTop: 12 }}>Amount due: <strong>NPR {Number(result.admission.admissionFee).toLocaleString()}</strong></p><p style={{ marginTop: 10, color: 'var(--text-muted)' }}>After confirmed payment, student and parent login IDs and temporary passwords are sent automatically to their admission phone numbers.</p></div><AdmissionPrintRecord result={result} /><div className="admission-result-actions"><Button onClick={() => window.print()}><span className="material-symbols-outlined" aria-hidden="true">print</span>Print admission record</Button><Button variant="outline" onClick={acknowledge}>Start another admission</Button></div></Card>}
  </div>;
}

export function TenantCertificatesPage() {
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Course Completion Certificate', type: 'COMPLETION', status: 'ACTIVE' },
    { id: '2', name: 'Certificate of Merit', type: 'MERIT', status: 'ACTIVE' },
    { id: '3', name: 'Leaving Certificate', type: 'LEAVING', status: 'DRAFT' },
  ]);
  const [form, setForm] = useState({ name: '', type: 'COMPLETION' });

  const addTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setTemplates(old => [...old, { id: String(Date.now()), name: form.name, type: form.type, status: 'DRAFT' }]);
    setForm({ name: '', type: 'COMPLETION' });
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Header title="Master Certificate Templates" description="Create and manage certificate templates that branch admins can issue to students." />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(300px, 1fr)', gap: 18 }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px' }}>Existing Templates</h3>
          </div>
          <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Template Name</th>
                <th style={{ padding: '8px' }}>Type</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{t.name}</td>
                  <td style={{ padding: '12px 8px' }}>{t.type}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <StatusBadge variant={t.status === 'ACTIVE' ? 'success' : 'warning'}>{t.status}</StatusBadge>
                  </td>
                  <td style={{ padding: '12px 8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }}>Edit Design</Button>
                    {t.status === 'DRAFT' && <Button style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }} onClick={() => setTemplates(old => old.map(x => x.id === t.id ? { ...x, status: 'ACTIVE' } : x))}>Activate</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        
        <Card hoverable={false}>
          <h3 style={{ fontSize: '18px' }}>Create Template</h3>
          <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Define a new template structure for branches.</p>
          <form onSubmit={addTemplate} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>
              Template Name
              <input style={input} placeholder="e.g. Special Achievement" value={form.name} onChange={e => setForm(old => ({ ...old, name: e.target.value }))} required />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>
              Certificate Type
              <select style={input} value={form.type} onChange={e => setForm(old => ({ ...old, type: e.target.value }))}>
                <option value="COMPLETION">Course Completion</option>
                <option value="MERIT">Merit / Achievement</option>
                <option value="LEAVING">Leaving / Transfer</option>
              </select>
            </label>
            <div style={{ padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <strong style={{ fontSize: '13px' }}>Design Builder</strong>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Visual template editor will open after creation to add branding and placeholders (e.g. {"{{studentName}}"}, {"{{branchName}}"}).</p>
            </div>
            <Button type="submit">Create Template</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export function TenantLeaveRequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof api.branchAdmin.getLeaves>>['leaves']>([]);
  const [busy, setBusy] = useState('');
  const [decisionRemarks, setDecisionRemarks] = useState<Record<string, string>>({});
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { setRequests((await api.branchAdmin.getLeaves('L2')).leaves); }
    catch (next) { setLoadError(errorMessage(next)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const interval = window.setInterval(() => { void load(); }, 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const mutate = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const remarks = decisionRemarks[id]?.trim();
    if (action === 'REJECT' && !remarks) {
      setDecisionErrors((current) => ({ ...current, [id]: 'Add a reason so the teacher understands why this request was rejected.' }));
      document.getElementById(`leave-remarks-${id}`)?.focus();
      return;
    }
    setBusy(id); setDecisionErrors((current) => ({ ...current, [id]: '' }));
    try {
      await api.branchAdmin.decideLeave(id, action, action === 'REJECT' ? remarks : undefined);
      await load();
      setDecisionRemarks((current) => ({ ...current, [id]: '' }));
      showToast(action === 'APPROVE' ? 'Leave approved. The teacher can now see the final decision.' : 'Leave rejected. The teacher can now see the reason.', 'success');
    } catch (next) {
      showToast(errorMessage(next), 'error');
    } finally {
      setBusy('');
    }
  };

  const pending = requests.filter(r => r.status === 'APPROVED_LEVEL1');
  const history = requests.filter(r => r.status !== 'APPROVED_LEVEL1');

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Header title="Leave Requests (Level 2)" description="Final approval for long-duration or special leaves forwarded by Branch Admins." />
      
      <Card hoverable={false}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Pending Final Approval</h3>
        {loading ? <RemoteState kind="loading" message="Loading Level 2 leave requests…" /> : loadError ? <RemoteState kind="error" message={loadError} onRetry={() => void load()} /> : !pending.length ? <RemoteState kind="empty" message="No pending Level 2 leave requests." /> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pending.map(req => (
              <div key={req.id} style={{ ...row, padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{req.staffName}</strong> <span style={{ color: 'var(--text-muted)' }}>({req.branchName})</span>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{req.leaveType.replaceAll('_', ' ')}</span>
                      <span>{Math.max(1, Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / 86_400_000) + 1)} days</span>
                      <span>Starts: {new Date(req.startDate).toLocaleDateString('en-NP')}</span>
                    </div>
                    <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>"{req.reason}"</p>
                    <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-primary)' }}>Level 1 approval recorded by the assigned Branch Admin.</p>
                  </div>
                  <StatusBadge variant="warning">L2 Review</StatusBadge>
                </div>
                <label style={{ display: 'grid', gap: 6, marginTop: 16, fontSize: 13, fontWeight: 700 }} htmlFor={`leave-remarks-${req.id}`}>Reason for rejection <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400 }}>Required only when rejecting.</span><textarea id={`leave-remarks-${req.id}`} style={{ ...input, minHeight: 72 }} maxLength={2000} value={decisionRemarks[req.id] ?? ''} aria-invalid={Boolean(decisionErrors[req.id]) || undefined} aria-describedby={decisionErrors[req.id] ? `leave-remarks-error-${req.id}` : undefined} onChange={(event) => { setDecisionRemarks((old) => ({ ...old, [req.id]: event.target.value })); if (decisionErrors[req.id]) setDecisionErrors((current) => ({ ...current, [req.id]: '' })); }} placeholder="Explain the decision to the teacher" />{decisionErrors[req.id] ? <span id={`leave-remarks-error-${req.id}`} role="alert" style={{ color: 'var(--color-error)', fontSize: 12 }}>{decisionErrors[req.id]}</span> : null}</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <Button disabled={busy === req.id} onClick={() => void mutate(req.id, 'APPROVE')}>{busy === req.id ? 'Saving decision…' : 'Approve leave'}</Button>
                  <Button disabled={busy === req.id} variant="danger" onClick={() => void mutate(req.id, 'REJECT')}>{busy === req.id ? 'Saving decision…' : 'Reject leave'}</Button>
                </div>
              </div>
            ))}
          </div>
        }
      </Card>

      {history.length > 0 && (
        <Card hoverable={false}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Decisions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map(req => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>{req.staffName}</strong> · {req.leaveType.replaceAll('_', ' ')} ({req.branchName})
                </div>
                <StatusBadge variant={req.status === 'APPROVED_LEVEL2' ? 'success' : 'error'}>{req.status === 'APPROVED_LEVEL2' ? 'Approved' : 'Rejected'}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
