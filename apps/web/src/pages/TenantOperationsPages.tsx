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
    const [pl, expenses, forecast, suggestions] = await Promise.all([
      financeApi.pl(), financeApi.expenses(), financeApi.forecast(), financeApi.suggestions(),
    ]);
    return {
      pl,
      expenses: expenses.expenses,
      forecast: forecast as unknown as FinancialForecast,
      suggestions: suggestions as unknown as FinancialSuggestions,
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
  return <div style={{ display: 'grid', gap: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <Header title="P&L and Ledger" description="Consolidated institution reporting from recorded financial transactions."/>
      <Button onClick={() => void download()}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>download</span>Download ledger</Button>
    </div>
    <div style={grid}>{cards.map(([name, value, color]) => <Card key={name} hoverable={false}><p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>{name}</p><strong style={{ display: 'block', marginTop: 8, fontSize: 25, color, fontVariantNumeric: 'tabular-nums' }}>NPR {value.toLocaleString()}</strong><p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>{data.pl.month}</p></Card>)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)', gap: 18 }}>
      <Card hoverable={false}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><div><h3>Monthly forecast</h3><p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>{data.forecast.billingCycle}</p></div><StatusBadge variant={forecastMetrics.varianceNpr >= 0 ? 'success' : 'warning'}>{forecastProgress}% collected</StatusBadge></div>
        <div style={{ height: 8, margin: '18px 0', overflow: 'hidden', borderRadius: 999, background: 'var(--border)' }}><div style={{ width: `${forecastProgress}%`, height: '100%', borderRadius: 'inherit', background: 'var(--color-primary)' }}/></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12 }}>
          {[['Expected tuition', forecastMetrics.baseForecastNpr], ['Net forecast', forecastMetrics.netForecastNpr], ['Collected', forecastMetrics.actualCollectedNpr], ['Forecast variance', forecastMetrics.varianceNpr]].map(([label, value]) => <div key={String(label)} style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--border)' }}><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</p><strong style={{ display: 'block', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>NPR {Number(value).toLocaleString()}</strong></div>)}
        </div>
        <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>{forecastMetrics.activeEnrollments} active enrollments · Estimated attrition {forecastMetrics.attritionPercentage}</p>
      </Card>
      <Card hoverable={false}>
        <h3>Budget outlook</h3><p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>Projected operational surplus</p>
        <strong style={{ display: 'block', marginTop: 14, color: 'var(--color-success)', fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>NPR {data.suggestions.budgetAnalysis.projectedSurplusNpr.toLocaleString()}</strong>
        <p style={{ marginTop: 14, lineHeight: 1.6, color: 'var(--text-muted)', fontSize: 13 }}>{data.suggestions.budgetAnalysis.promptText}</p>
      </Card>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 1fr)', gap: 18 }}>
      <Card hoverable={false}><h3>Recorded expenses</h3><p style={{ marginTop: 4, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>Latest operating costs by category</p>{data.expenses.map((expense: Expense) => <div key={expense.id} style={row}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}><div><strong>{expense.category}</strong><p style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 12 }}>{expense.description}</p></div><strong style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>NPR {Number(expense.amount).toLocaleString()}</strong></div></div>)}</Card>
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

interface Branch { id: string; name: string; }
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

interface AdmissionResult { studentId: string; invoiceId: string; status: string; admissionFee: number | string; }
interface IssuedCredentials { student: { email: string; temporaryPassword: string }; parent: { email: string; temporaryPassword: string }; }
interface GradeOption { id: string; name: string; admissionFee?: number | string; }
export function TenantAdmissionsPage() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]); const [grades, setGrades] = useState<GradeOption[]>([]);
  const [busy, setBusy] = useState(false); const [admission, setAdmission] = useState<AdmissionResult | null>(null); const [paid, setPaid] = useState(false); const [credentials, setCredentials] = useState<IssuedCredentials | null>(null);
  const [form, setForm] = useState({ branchId: '', gradeId: '', studentFirst: '', studentLast: '', studentEmail: '', studentPhone: '', parentFirst: '', parentLast: '', parentEmail: '', parentPhone: '' });
  useEffect(() => { void Promise.all([request<{ branches: Branch[] }>('/branches'), request<{ grades: GradeOption[] }>('/grades')]).then(([b, g]) => { setBranches(b.branches); setGrades(g.grades); setForm((old) => ({ ...old, branchId: b.branches[0]?.id ?? '', gradeId: g.grades[0]?.id ?? '' })); }).catch((next) => showToast(errorMessage(next), 'error')); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (form.studentEmail === form.parentEmail) return showToast('Student and parent emails must be different.', 'error'); setBusy(true);
    try {
      const result = await request<{ admission: AdmissionResult }>('/users/admissions', { method: 'POST', body: JSON.stringify({ branchId: form.branchId, gradeId: form.gradeId, student: { firstName: form.studentFirst, lastName: form.studentLast, email: form.studentEmail, phone: form.studentPhone }, parent: { firstName: form.parentFirst, lastName: form.parentLast, email: form.parentEmail, phone: form.parentPhone } }) });
      setAdmission(result.admission); showToast('Admission created. Accounts remain inactive until payment.', 'success');
    } catch (next) { showToast(errorMessage(next), 'error'); } finally { setBusy(false); }
  };
  const recordPayment = async () => { if (!admission || !window.confirm('Confirm the admission payment was received outside TMS?')) return; setBusy(true); try { await request(`/finances/invoices/${admission.invoiceId}/pay`, { method: 'POST', body: JSON.stringify({ transactionId: `ADMISSION-${Date.now()}` }) }); setPaid(true); showToast('Payment recorded. Credentials may now be issued.', 'success'); } catch (next) { showToast(errorMessage(next), 'error'); } finally { setBusy(false); } };
  const issue = async () => { if (!admission || !paid) return; setBusy(true); try { const result = await request<IssuedCredentials>(`/users/admissions/${admission.studentId}/issue-logins`, { method: 'POST' }); setCredentials(result); showToast('One-time credentials issued.', 'success'); } catch (next) { showToast(errorMessage(next), 'error'); } finally { setBusy(false); } };
  const acknowledge = () => { setCredentials(null); setAdmission(null); setPaid(false); setForm((old) => ({ ...old, studentFirst: '', studentLast: '', studentEmail: '', studentPhone: '', parentFirst: '', parentLast: '', parentEmail: '', parentPhone: '' })); };
  return <div style={{ display: 'grid', gap: 18 }}><Header title="Admissions" description="Create inactive student and parent accounts, record payment, then issue one-time credentials."/>
    {!admission ? <Card hoverable={false}><form onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 16 }}><div style={grid}><label>Branch<select style={input} value={form.branchId} onChange={(e) => setForm((old) => ({ ...old, branchId: e.target.value }))}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Grade<select style={input} value={form.gradeId} onChange={(e) => setForm((old) => ({ ...old, gradeId: e.target.value }))}>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label></div><h3>Student</h3><div style={grid}>{[['studentFirst','First name'],['studentLast','Last name'],['studentEmail','Email'],['studentPhone','Phone']].map(([key, text]) => <label key={key}>{text}<input required style={input} type={key.includes('Email') ? 'email' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}</div><h3>Parent / guardian</h3><div style={grid}>{[['parentFirst','First name'],['parentLast','Last name'],['parentEmail','Email'],['parentPhone','Phone']].map(([key, text]) => <label key={key}>{text}<input required style={input} type={key.includes('Email') ? 'email' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}/></label>)}</div><Button disabled={busy} type="submit">Create admission and invoice</Button></form></Card> :
    <Card hoverable={false}><h3>Admission progression</h3><div style={row}><StatusBadge variant="success">1 · Admission created</StatusBadge><p>Invoice: NPR {Number(admission.admissionFee).toLocaleString()} · Accounts inactive</p></div><div style={row}><StatusBadge variant={paid ? 'success' : 'warning'}>2 · Payment {paid ? 'recorded' : 'required'}</StatusBadge>{!paid ? <Button disabled={busy} onClick={() => void recordPayment()}>Record external payment</Button> : null}</div><div style={row}><StatusBadge variant={credentials ? 'success' : 'info'}>3 · Credentials</StatusBadge><Button disabled={busy || !paid || Boolean(credentials)} onClick={() => void issue()}>Issue one-time logins</Button></div>
    {credentials ? <div role="alert" style={{ padding: 16, background: 'rgba(245,158,11,.1)', borderRadius: 10 }}><strong>Copy now—these passwords are not stored in browser storage.</strong><p>Student: {credentials.student.email} · <code>{credentials.student.temporaryPassword}</code></p><p>Parent: {credentials.parent.email} · <code>{credentials.parent.temporaryPassword}</code></p><Button style={{ marginTop: 10 }} onClick={acknowledge}>I have delivered these securely</Button></div> : null}</Card>}
  </div>;
}
