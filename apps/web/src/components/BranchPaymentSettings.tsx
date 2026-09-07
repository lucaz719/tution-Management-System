import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';
import { paymentSettingsApi as api, paymentSettingsError, validateQRConfig, type PaymentSettings, type QRConfig } from '../services/payment-settings';
import './branch-payment-settings.css';

const fields = [
  ['accountName', 'Account name', 1, 100],
  ['accountNumber', 'Account number', 5, 20],
  ['bankName', 'Bank name', 1, 100],
] as const;
export function SourceBadge({ source }: { source?: PaymentSettings['source'] }) {
  return <span className="payment-source">{source === 'branch' ? 'Branch custom' : 'Using tenant defaults'}</span>;
}
function QRPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return failed ? <p role="status">QR preview unavailable. Upload the image again.</p>
    : <img className="payment-qr-preview" src={url} onError={() => setFailed(true)} alt="Payment QR preview" width={220} height={220} />;
}
export function BranchPaymentSettings({ branchId, onSaved }: { branchId: string; onSaved?: () => void }) {
  const { user, isTenantAdmin } = useAuth();
  const editable = isTenantAdmin();
  const allowed = editable || Boolean(user?.roles?.some(role => role.roleName === 'Branch Admin' && role.branchId === branchId));
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [form, setForm] = useState<QRConfig | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof QRConfig, string>>>({});
  const [challenge, setChallenge] = useState<{ challengeId: string; destination: string; action: 'save' | 'reset'; config: QRConfig | null } | null>(null);
  const [code, setCode] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setSettings(null); setForm(null); setError(''); setFieldErrors({}); setChallenge(null); setCode('');
    if (allowed) api.getPaymentSettings(branchId).then(config => {
      if (!active) return;
      setSettings(config);
      setForm({ ...config, staticQrEnabled: config.source === 'branch' && config.staticQrEnabled });
    }).catch(cause => { if (active) setError(paymentSettingsError(cause)); });
    return () => { active = false; };
  }, [branchId, allowed, revision]);
  if (!allowed) return <p role="alert">Insufficient permissions.</p>;
  const save = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!editable || !form || busy || challenge) return;
    if (event) {
      const errors = validateQRConfig(form);
      setFieldErrors(errors);
      const first = Object.keys(errors)[0];
      if (first) { (event.currentTarget.elements.namedItem(first) as HTMLInputElement | null)?.focus(); return; }
    }
    setBusy(true); setError('');
    try {
      const config: QRConfig | null = event ? { staticQrEnabled: form.staticQrEnabled, staticQrImageUrl: form.staticQrImageUrl?.trim() || null, accountName: form.accountName?.trim() || null, accountNumber: form.accountNumber?.trim() || null, bankName: form.bankName?.trim() || null, instructions: form.instructions?.trim() || null } : null;
      const action = event ? 'save' : 'reset';
      const result = await api.requestVerification(branchId, action, config);
      setChallenge({ ...result, action, config }); setCode('');

    } catch (cause) { setError(paymentSettingsError(cause)); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!challenge || busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      const verification = { challengeId: challenge.challengeId, code };
      if (challenge.action === 'save') await api.updateBranchPaymentSettings(branchId, challenge.config!, verification);
      else await api.deleteBranchPaymentSettings(branchId, verification);
      setChallenge(null); setCode('');
      showToast('Payment settings updated successfully', 'success');
      setRevision(value => value + 1); onSaved?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Verification failed.'); }
    finally { setBusy(false); }
  };
  const upload = (file?: File) => {
    if (!file || !form) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_000_000) { setFieldErrors({ staticQrImageUrl: 'Choose a PNG, JPEG, or WebP image under 1 MB.' }); return; }
    const reader = new FileReader();
    reader.onload = () => { setForm({ ...form, staticQrImageUrl: String(reader.result) }); setFieldErrors({}); };
    reader.onerror = () => setError('Could not read this image. Try again.');
    reader.readAsDataURL(file);
  };
  return <Card hoverable={false} style={{ background: 'var(--color-surface)', color: 'var(--color-text)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}><section className="branch-payment-settings">
    <h2>Payment settings</h2>
    {settings && <SourceBadge source={settings.source} />}
    {!editable && <p>Contact tenant admin to update QR settings.</p>}
    {error && <div role="alert"><p>{error}</p>{!settings && <Button onClick={() => setRevision(value => value + 1)}>Retry</Button>}</div>}
    {!settings && !error && <div className="payment-settings-skeleton" aria-busy="true" aria-label="Loading payment settings" />}
    {settings && form && <form onSubmit={save} noValidate>
      <fieldset disabled={!editable || busy || Boolean(challenge)}>
        <legend>Branch QR configuration</legend>
        <label className="payment-toggle"><input type="checkbox" checked={form.staticQrEnabled} onChange={event => setForm({ ...form, staticQrEnabled: event.target.checked })} />Use custom static QR</label>
        <p>Turn off custom QR to use tenant defaults. ConnectIPS uses tenant settings.</p>
        {editable && form.staticQrEnabled && <label>QR image (required)
          <input name="staticQrImageUrl" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => upload(event.target.files?.[0])} aria-invalid={Boolean(fieldErrors.staticQrImageUrl)} />
          <small>Upload or replace the QR image. PNG, JPEG, or WebP, under 1 MB.</small>
          {fieldErrors.staticQrImageUrl && <span role="alert">{fieldErrors.staticQrImageUrl}</span>}
        </label>}
        {(form.staticQrEnabled || !editable) && fields.map(([key, label, min, max]) => <label key={key}>{label}{editable ? ' (required)' : ''}
          <input name={key} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `${branchId}-${key}-error` : undefined} type="text" autoComplete="off" required={form.staticQrEnabled} minLength={min} maxLength={max} value={(editable ? form[key] : settings[key]) ?? ''} onChange={event => setForm({ ...form, [key]: event.target.value })} />
          {fieldErrors[key] && <span id={`${branchId}-${key}-error`} role="alert">{fieldErrors[key]}</span>}
        </label>)}
        {(form.staticQrEnabled || !editable) && <label>Instructions (optional)<textarea name="instructions" maxLength={500} aria-invalid={Boolean(fieldErrors.instructions)} value={(editable ? form.instructions : settings.instructions) ?? ''} onChange={event => setForm({ ...form, instructions: event.target.value })} />{fieldErrors.instructions && <span role="alert">{fieldErrors.instructions}</span>}</label>}
      </fieldset>
      {(form.staticQrEnabled || !editable || settings.source === 'tenant_default') && (form.staticQrEnabled ? form.staticQrImageUrl : settings.staticQrImageUrl)?.match(/^(https:\/\/|data:image\/)/) && <QRPreview url={(form.staticQrEnabled ? form.staticQrImageUrl : settings.staticQrImageUrl)!} />}
      {!form.staticQrEnabled && editable && <p>{settings.source === 'branch' ? 'Save changes to use tenant defaults.' : `Tenant default static QR: ${settings.staticQrEnabled ? 'Enabled' : 'Disabled'}.`}</p>}
      {editable && !challenge && <div className="payment-settings-actions"><Button type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : 'Verify and save'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void save()}>Reset to tenant defaults</Button></div>}
      {editable && challenge && <section aria-label="SMS verification">
        <p>Enter the six-digit code sent to {challenge.destination} to {challenge.action === 'reset' ? 'reset to tenant defaults' : 'save these payment settings'}. It expires in five minutes.</p>
        <label>SMS code<input autoFocus autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} disabled={busy} /></label>
        <div className="payment-settings-actions"><Button type="button" disabled={busy || code.length !== 6} onClick={() => void confirm()}>Confirm changes</Button><Button type="button" variant="outline" disabled={busy} onClick={() => { setChallenge(null); setCode(''); }}>Cancel verification</Button></div>
      </section>}
    </form>}
  </section></Card>;
}
