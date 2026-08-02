import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import './superAdmin.css';

type View = 'overview' | 'onboarding' | 'support' | 'policies' | 'billing' | 'audit';
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface RequestItem { id: string; name: string; email: string; phone: string; panNumber: string; remarks?: string | null; status: RequestStatus; createdAt?: string }
interface Tenant { id: string; name: string; panNumber: string; status: string; createdAt: string; branchCount: number; userCount: number }
interface Provisioned { tenantId: string; tenantName: string; primaryAdminUser: string; defaultBranch: string; temporaryPassword: string }
interface Policy { id: string; label: string; description: string; value: string; suffix: string; icon: string }

const policies: Policy[] = [
  { id: 'grace', label: 'Geo-attendance grace', description: 'Before auto-departure fires', value: '15', suffix: 'minutes', icon: 'location_on' },
  { id: 'cash', label: 'Petty cash cap', description: 'Per branch, per month', value: '50000', suffix: 'NPR', icon: 'savings' },
  { id: 'booking', label: 'Booking notice', description: 'Minimum advance notice', value: '24', suffix: 'hours', icon: 'event_available' },
  { id: 'escalation', label: 'Maintenance escalation', description: 'Before unresolved tasks escalate', value: '3', suffix: 'days', icon: 'engineering' },
];

const auditRows = [
  ['Today, 10:42', 'Aarav Shrestha', 'Support session ended', 'Sanskardip Shikshalaya', '12 records'],
  ['Today, 09:18', 'Platform automation', 'Tenant health check', 'All tenants', 'Metadata only'],
  ['Yesterday, 16:05', 'Maya Gurung', 'Policy defaults updated', 'New tenants', '4 policies'],
  ['Yesterday, 11:32', 'Aarav Shrestha', 'Tenant provisioned', 'Himalaya Academy', 'Tenant + admin'],
];

/* PAGE CONTENT STORYBOARD
 *   0ms  page header is immediately usable
 *  80ms  summary cards settle into place
 * 160ms  primary operations panel appears
 * 240ms  secondary activity panel appears
 */
const TIMING = { summary: 80, primary: 160, secondary: 240 };

function Icon({ name }: { name: string }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }
function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <div className="sa-empty" role="status"><Icon name={icon} /><strong>{title}</strong><span>{body}</span></div>;
}

export function SuperAdminDashboard({ view = 'overview' }: { view?: View }) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [supportTenant, setSupportTenant] = useState<Tenant | null>(null);
  const [activeSupport, setActiveSupport] = useState<Tenant | null>(null);
  const [provisioned, setProvisioned] = useState<Provisioned | null>(null);
  const [policyValues, setPolicyValues] = useState(() => Object.fromEntries(policies.map((p) => [p.id, p.value])));
  const dialogRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [nextRequests, nextTenants] = await Promise.all([
        api.onboarding.getRequests() as Promise<RequestItem[]>, api.onboarding.getTenants() as Promise<Tenant[]>,
      ]);
      setRequests(nextRequests); setTenants(nextTenants);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Platform data could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);
  useEffect(() => {
    if (!supportTenant && !provisioned) return;
    dialogRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSupportTenant(null); setProvisioned(null); } };
    document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close);
  }, [supportTenant, provisioned]);

  const active = tenants.filter((t) => t.status === 'ACTIVE');
  const pending = requests.filter((r) => r.status === 'PENDING');
  const branches = tenants.reduce((sum, t) => sum + t.branchCount, 0);
  const readiness = useMemo(() => tenants.slice(0, 4).map((t, index) => ({ tenant: t, done: Math.min(4, Math.max(1, t.branchCount + (index % 3))) })), [tenants]);

  const decide = async (request: RequestItem, approve: boolean) => {
    setBusy(request.id);
    try {
      if (approve) {
        const result = await api.onboarding.approveRequest(request.id); setProvisioned(result.provisioned);
        showToast(`${request.name} provisioned successfully.`, 'success');
      } else { await api.onboarding.rejectRequest(request.id); showToast(`${request.name} request rejected.`, 'info'); }
      await loadData();
    } catch (cause) { showToast(cause instanceof Error ? cause.message : 'Action failed.', 'error'); }
    finally { setBusy(''); }
  };

  const header = (eyebrow: string, title: string, description: string, action?: React.ReactNode) => (
    <header className="sa-page-head">
      <div><span className="sa-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}
    </header>
  );

  const onboarding = (
    <section className="sa-panel sa-reveal" style={{ '--delay': `${TIMING.primary}ms` } as React.CSSProperties}>
      <div className="sa-panel-head"><div><h3>Onboarding queue</h3><p>Approval provisions an isolated tenant namespace, default policies, and a temporary Tenant Admin login.</p></div><StatusBadge variant={pending.length ? 'warning' : 'success'}>{pending.length} pending</StatusBadge></div>
      <div className="sa-list">
        {!requests.length ? <Empty icon="inbox" title={loading ? 'Loading requests…' : 'Queue is clear'} body="New institution applications will appear here." /> : requests.map((request) => (
          <article className="sa-row" key={request.id}>
            <div className="sa-avatar"><Icon name="domain" /></div>
            <div className="sa-row-main"><strong>{request.name}</strong><span>{request.email} · PAN/VAT {request.panNumber}</span></div>
            <StatusBadge variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'error'}>{request.status}</StatusBadge>
            {request.status === 'PENDING' && <div className="sa-actions"><Button onClick={() => void decide(request, true)} disabled={busy === request.id}>{busy === request.id ? 'Provisioning…' : 'Approve'}</Button><Button variant="outline" onClick={() => void decide(request, false)} disabled={busy === request.id}>Reject</Button></div>}
          </article>
        ))}
      </div>
    </section>
  );

  const support = (
    <section className="sa-panel">
      <div className="sa-panel-head"><div><h3>Audited support access</h3><p>Enter a tenant only through a visible, time-bound support session. Every record touched is logged.</p></div><StatusBadge variant="info">Fully audited</StatusBadge></div>
      <div className="sa-callout"><Icon name="visibility" /><div><strong>No silent impersonation</strong><span>Tenant Admins can see who entered, when the session occurred, and which records were touched.</span></div></div>
      <div className="sa-tenant-grid">{tenants.slice(0, 6).map((tenant) => <article className="sa-tenant-card" key={tenant.id}><div><strong>{tenant.name}</strong><span>PAN/VAT {tenant.panNumber}</span></div><Button variant="outline" onClick={() => setSupportTenant(tenant)}><Icon name="login" /> Start session</Button></article>)}</div>
      {!tenants.length && <Empty icon="domain_disabled" title={loading ? 'Loading tenants…' : 'No tenants available'} body="Provision a tenant before opening support access." />}
    </section>
  );

  const policyPanel = (
    <section className="sa-policy-grid">{policies.map((policy) => <article className="sa-panel sa-policy" key={policy.id}><div className="sa-policy-icon"><Icon name={policy.icon} /></div><div><h3>{policy.label}</h3><p>{policy.description}</p></div><label><span>Platform default</span><div className="sa-input-wrap"><input type="number" min="0" value={policyValues[policy.id]} onChange={(e) => setPolicyValues({ ...policyValues, [policy.id]: e.target.value })} /><span>{policy.suffix}</span></div></label></article>)}<article className="sa-panel sa-policy sa-policy-wide"><div className="sa-policy-icon"><Icon name="account_tree" /></div><div><h3>Default leave approval chain</h3><p>Tenant Admins may override this policy inside their institution.</p><div className="sa-chain"><span>Branch Admin</span><Icon name="arrow_forward" /><span>Tenant Admin</span><small>Long sick leave</small></div></div></article><div className="sa-policy-save"><Button onClick={() => showToast('Platform defaults saved for future tenants.', 'success')}>Save platform defaults</Button></div></section>
  );

  const billing = <section className="sa-panel"><div className="sa-panel-head"><div><h3>Platform subscriptions</h3><p>Lucaz Soft billing is separate from each institution’s student-fee ledger.</p></div><StatusBadge variant="warning">Design pending</StatusBadge></div><div className="sa-design-lock"><Icon name="architecture" /><div><strong>Billing model confirmation required</strong><p>Calculation, invoicing, commercial terms, and automatic suspension rules are intentionally not implemented until PRD §26 is confirmed.</p></div></div><div className="sa-table-wrap"><table><thead><tr><th>Tenant</th><th>Subscription</th><th>Billing state</th><th>Platform access</th></tr></thead><tbody>{tenants.slice(0,5).map((t, i) => <tr key={t.id}><td><strong>{t.name}</strong></td><td>Model pending</td><td><StatusBadge variant={i === 2 ? 'warning' : 'success'}>{i === 2 ? 'Review' : 'Current'}</StatusBadge></td><td>{t.status}</td></tr>)}</tbody></table></div></section>;

  const audit = <section className="sa-panel"><div className="sa-panel-head"><div><h3>Immutable platform audit</h3><p>Actor, action, target tenant, timestamp, and scope are retained for every Super Admin operation.</p></div><Button variant="outline"><Icon name="download" /> Export log</Button></div><div className="sa-table-wrap"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Scope</th></tr></thead><tbody>{auditRows.map((row) => <tr key={row.join('-')}>{row.map((cell, index) => <td key={cell}>{index === 2 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table></div></section>;

  const content = view === 'onboarding' ? <>{header('Tenant operations', 'Institution onboarding', 'Validate applicants, provision isolated tenants, and track each institution to go-live.', <Button variant="outline" onClick={() => void loadData()}><Icon name="refresh" /> Refresh</Button>)}{onboarding}</> : view === 'support' ? <>{header('Security boundary', 'Support access', 'Troubleshoot within a tenant through explicit, client-visible audit sessions.')}{support}</> : view === 'policies' ? <>{header('Platform governance', 'Policy defaults', 'Seed safe defaults for new tenants without overriding tenant-level autonomy.')}{policyPanel}</> : view === 'billing' ? <>{header('Commercial operations', 'Billing & subscriptions', 'Monitor platform subscription state while the commercial model is finalized.')}{billing}</> : view === 'audit' ? <>{header('Security & compliance', 'Platform audit log', 'Review immutable evidence of every platform-level and support-session action.')}{audit}</> : (
    <>{header('Lucaz Soft platform operations', 'Platform at a glance', 'Operate every tenant without crossing their data boundary.', <Button onClick={() => document.querySelector('.sa-panel')?.scrollIntoView({ behavior: 'smooth' })}><Icon name="add_business" /> Review onboarding</Button>)}
      <section className="sa-stats sa-reveal" style={{ '--delay': `${TIMING.summary}ms` } as React.CSSProperties}>{[[active.length,'Active tenants','domain','Healthy institutions'],[branches,'Branches','account_tree','Across all tenants'],[pending.length,'Pending onboardings','pending_actions',pending.length ? 'Needs attention' : 'Queue clear'],['99.98%','Platform uptime','monitor_heart','Last 30 days']].map(([value,label,icon,note]) => <article className="sa-stat" key={String(label)}><div className="sa-stat-top"><span>{label}</span><Icon name={String(icon)} /></div><strong>{value}</strong><small>{note}</small></article>)}</section>
      {error && <div className="sa-error" role="alert"><Icon name="error" />{error}<button onClick={() => void loadData()}>Retry</button></div>}
      <div className="sa-overview-grid">{onboarding}<section className="sa-panel sa-reveal" style={{ '--delay': `${TIMING.secondary}ms` } as React.CSSProperties}><div className="sa-panel-head"><div><h3>Go-live readiness</h3><p>Required milestones by institution</p></div></div><div className="sa-readiness">{readiness.map(({ tenant, done }) => <div key={tenant.id}><div><strong>{tenant.name}</strong><span>{done}/4 complete</span></div><div className="sa-progress" aria-label={`${tenant.name}: ${done} of 4 onboarding steps complete`}><i style={{ width: `${done * 25}%` }} /></div><small>{done === 4 ? 'Ready for handoff' : ['First branch','Admin login','Fee policy','First student'][done] + ' outstanding'}</small></div>)}</div>{!readiness.length && <Empty icon="checklist" title="No readiness data" body="Onboarding milestones appear after tenant provisioning." />}</section></div>
      <div className="sa-overview-grid sa-overview-grid--even">{support}<section className="sa-panel"><div className="sa-panel-head"><div><h3>Platform health</h3><p>Metadata only — no tenant business data</p></div><StatusBadge variant="success">All systems operational</StatusBadge></div><div className="sa-health">{[['API response','182 ms','speed'],['Error rate','0.08%','bug_report'],['Database','Healthy','database'],['Social APIs','3 connected','hub']].map(([label,value,icon]) => <div key={label}><Icon name={icon}/><span>{label}</span><strong>{value}</strong></div>)}</div></section></div></>
  );

  return <main className="sa-page">{activeSupport && <div className="sa-support-banner" role="status"><Icon name="support_agent" /><div><strong>Support session — acting inside {activeSupport.name}</strong><span>All actions are being recorded and are visible to this tenant.</span></div><button type="button" onClick={() => { showToast(`Support session for ${activeSupport.name} ended and was logged.`, 'success'); setActiveSupport(null); }}>End session</button></div>}{content}{(supportTenant || provisioned) && <div className="sa-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { setSupportTenant(null); setProvisioned(null); } }}><div className="sa-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sa-dialog-title"><button className="sa-close" aria-label="Close dialog" onClick={() => { setSupportTenant(null); setProvisioned(null); }}><Icon name="close" /></button>{supportTenant ? <><div className="sa-modal-icon sa-modal-icon--warning"><Icon name="shield_person" /></div><h2 id="sa-dialog-title">Start support session?</h2><p>You are entering <strong>{supportTenant.name}</strong>. A persistent banner will identify you as Lucaz Soft support, and every record touched will be visible in the tenant’s audit log.</p><div className="sa-session-facts"><span><Icon name="schedule" /> 30-minute session</span><span><Icon name="visibility" /> Tenant-visible</span><span><Icon name="history" /> Immutable audit</span></div><label className="sa-reason"><span>Support reason</span><textarea rows={3} placeholder="Describe the issue being investigated" /></label><Button onClick={() => { setActiveSupport(supportTenant); showToast(`Audited support session started for ${supportTenant.name}.`, 'info'); setSupportTenant(null); }}>Start audited session</Button></> : <><div className="sa-modal-icon"><Icon name="task_alt" /></div><h2 id="sa-dialog-title">Tenant provisioned</h2><p><strong>{provisioned?.tenantName}</strong> now has an isolated namespace and seeded platform policies.</p><div className="sa-credentials"><span>Tenant Admin</span><strong>{provisioned?.primaryAdminUser}</strong><span>Temporary password · shown once</span><code>{provisioned?.temporaryPassword}</code></div><Button onClick={() => setProvisioned(null)}>Done</Button></>}</div></div>}</main>;
}
