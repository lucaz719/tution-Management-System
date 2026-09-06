import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import './superAdmin.css';

interface TenantSummary { id: string; name: string; status: string; branchCount: number; userCount: number }
interface Provisioned { tenantId: string; tenantName: string; primaryAdminUser: string; primaryAdminName: string; defaultBranch: string; temporaryPassword: string }
interface FormState { institutionName: string; panNumber: string; adminFirstName: string; adminLastName: string; adminEmail: string; adminPhone: string; branchName: string; branchAddress: string; latitude: string; longitude: string; confirmed: boolean }
const initialForm: FormState = { institutionName: '', panNumber: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '', branchName: '', branchAddress: '', latitude: '', longitude: '', confirmed: false };

function Icon({ name }: { name: string }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

export function SuperAdminDashboard() {
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [registryError, setRegistryError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [provisioned, setProvisioned] = useState<Provisioned | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const loadTenants = async () => {
    setLoadingTenants(true); setRegistryError('');
    try { setTenants(await api.onboarding.getTenants() as TenantSummary[]); }
    catch (cause) { setRegistryError(cause instanceof Error ? cause.message : 'Created tenants could not be loaded.'); }
    finally { setLoadingTenants(false); }
  };
  useEffect(() => { void loadTenants(); }, []);
  useEffect(() => {
    if (!provisioned) return;
    dialogRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setProvisioned(null); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [provisioned]);

  const update = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError('');
    if (!form.confirmed) { setFormError('Confirm that this person will receive full tenant-wide control.'); return; }
    setSubmitting(true);
    try {
      const result = await api.onboarding.provisionTenant({
        institutionName: form.institutionName.trim(), panNumber: form.panNumber.trim(), adminFirstName: form.adminFirstName.trim(), adminLastName: form.adminLastName.trim(),
        adminEmail: form.adminEmail.trim(), adminPhone: form.adminPhone.trim(), branchName: form.branchName.trim(), branchAddress: form.branchAddress.trim(),
        latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined,
      });
      setProvisioned(result.provisioned); setForm(initialForm);
      showToast(`${result.provisioned.tenantName} and its Tenant Admin were created.`, 'success');
      await loadTenants();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Tenant creation failed. Review the details and retry.'); }
    finally { setSubmitting(false); }
  };
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); showToast(`${label} copied.`, 'success'); }
    catch { showToast(`Could not copy ${label.toLowerCase()}. Select and copy it manually.`, 'error'); }
  };

  return <main className="sa-page">
    <header className="sa-page-head"><div><span className="sa-eyebrow">Development bootstrap</span><h2>Create the client workspace</h2><p>Create one institution, its first branch, and the Tenant Admin who will control the application.</p></div><StatusBadge variant="warning">Temporary operator access</StatusBadge></header>
    <div className="sa-bootstrap-grid">
      <form className="sa-panel sa-provision-form" onSubmit={submit} aria-busy={submitting}>
        <div className="sa-panel-head"><div><h3>Tenant and administrator</h3><p>All required records are created together. Nothing is saved until you confirm.</p></div></div>
        {formError && <div className="sa-error" role="alert"><Icon name="error" /><span>{formError}</span></div>}
        <fieldset><legend><span>1</span> Institution details</legend><div className="sa-form-grid">
          <label><span>Institution name <b>*</b></span><input required autoComplete="organization" value={form.institutionName} onChange={update('institutionName')} placeholder="Himalaya Learning Center" /></label>
          <label><span>PAN/VAT number <b>*</b></span><input required inputMode="numeric" autoComplete="off" spellCheck={false} value={form.panNumber} onChange={update('panNumber')} placeholder="123456789" /></label>
        </div></fieldset>
        <fieldset><legend><span>2</span> Tenant Admin identity</legend><p className="sa-fieldset-help">This person receives full tenant-wide control. Use the client's real identity, not the institution name.</p><div className="sa-form-grid">
          <label><span>First name <b>*</b></span><input required autoComplete="given-name" spellCheck={false} value={form.adminFirstName} onChange={update('adminFirstName')} placeholder="Aarav" /></label>
          <label><span>Last name <b>*</b></span><input required autoComplete="family-name" spellCheck={false} value={form.adminLastName} onChange={update('adminLastName')} placeholder="Shrestha" /></label>
          <label><span>Email <b>*</b></span><input required type="email" autoComplete="email" spellCheck={false} value={form.adminEmail} onChange={update('adminEmail')} placeholder="admin@example.com" /></label>
          <label><span>Phone <b>*</b></span><input required type="tel" inputMode="tel" autoComplete="tel" value={form.adminPhone} onChange={update('adminPhone')} placeholder="98XXXXXXXX" /></label>
        </div></fieldset>
        <fieldset><legend><span>3</span> First branch</legend><div className="sa-form-grid">
          <label><span>Branch name <b>*</b></span><input required autoComplete="organization" value={form.branchName} onChange={update('branchName')} placeholder="Main Center" /></label>
          <label><span>Branch address <b>*</b></span><input required autoComplete="street-address" value={form.branchAddress} onChange={update('branchAddress')} placeholder="Baneshwor, Kathmandu" /></label>
          <label><span>Latitude <small>(optional)</small></span><input inputMode="decimal" value={form.latitude} onChange={update('latitude')} placeholder="27.6915" /></label>
          <label><span>Longitude <small>(optional)</small></span><input inputMode="decimal" value={form.longitude} onChange={update('longitude')} placeholder="85.3422" /></label>
        </div></fieldset>
        <label className="sa-confirm"><input type="checkbox" checked={form.confirmed} onChange={update('confirmed')} /><span><strong>I confirm this is the client's sole Tenant Admin.</strong><small>This account can manage every branch, user, academic record, and tenant setting.</small></span></label>
        <div className="sa-submit-row"><p><Icon name="lock" /> Credentials are generated securely and displayed once.</p><Button type="submit" disabled={!form.confirmed || submitting} aria-busy={submitting || undefined}>{submitting ? 'Creating workspace…' : 'Create tenant and admin'}</Button></div>
      </form>
      <aside className="sa-panel sa-registry" aria-live="polite">
        <div className="sa-panel-head"><div><h3>Created tenants</h3><p>Read-only confirmation of completed provisioning.</p></div><Button variant="ghost" onClick={() => void loadTenants()} disabled={loadingTenants} aria-label="Refresh created tenants"><Icon name="refresh" /></Button></div>
        {registryError ? <div className="sa-error" role="alert"><Icon name="error" /><span>{registryError}</span><button type="button" onClick={() => void loadTenants()}>Retry</button></div> : null}
        {loadingTenants ? <div className="sa-skeleton-list" aria-label="Loading created tenants">{[0,1,2].map((item) => <i key={item} />)}</div> : tenants.length ? <div className="sa-tenant-list">{tenants.map((tenant) => <article key={tenant.id}><div><strong>{tenant.name}</strong><span>{tenant.branchCount} branch · {tenant.userCount} user</span></div><StatusBadge variant={tenant.status === 'ACTIVE' ? 'success' : 'warning'}>{tenant.status}</StatusBadge></article>)}</div> : <div className="sa-empty"><Icon name="domain_add" /><strong>No tenant created yet</strong><span>Complete the form to create the client workspace.</span></div>}
        <div className="sa-shutdown-note"><Icon name="power_settings_new" /><div><strong>Production handoff</strong><span>After the client signs in successfully, disable <code>PLATFORM_ADMIN_ENABLED</code> and revoke the bootstrap Super Admin account.</span></div></div>
      </aside>
    </div>
    {provisioned && <div className="sa-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProvisioned(null); }}><div className="sa-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sa-dialog-title">
      <button className="sa-close" type="button" aria-label="Close credential handoff" onClick={() => setProvisioned(null)}><Icon name="close" /></button><div className="sa-modal-icon"><Icon name="task_alt" /></div><h2 id="sa-dialog-title">Workspace created</h2><p>{provisioned.tenantName} and {provisioned.primaryAdminName}'s Tenant Admin account are ready.</p>
      <div className="sa-credentials"><div><span>Tenant Admin email</span><code>{provisioned.primaryAdminUser}</code><button type="button" onClick={() => void copy('Email', provisioned.primaryAdminUser)}><Icon name="content_copy" /> Copy</button></div><div><span>Temporary password · shown once</span><code>{provisioned.temporaryPassword}</code><button type="button" onClick={() => void copy('Password', provisioned.temporaryPassword)}><Icon name="content_copy" /> Copy</button></div></div>
      <div className="sa-handoff"><Icon name="warning" /><span>Store these credentials securely and send them directly to the client. Closing this dialog permanently hides the password.</span></div><Button onClick={() => setProvisioned(null)}>I stored the credentials</Button>
    </div></div>}
  </main>;
}
