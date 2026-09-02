import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { request, errorMessage } from '../services/api/client';

type PaymentSettings = {
  connectIpsEnabled: boolean;
  connectIpsServerReady: boolean;
  connectIpsServerEnvironment: 'STAGING' | 'LIVE';
  staticQrEnabled: boolean;
  staticQrImageUrl: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  instructions: string;
  successReturnUrl: string;
  failureReturnUrl: string;
};

const initial: PaymentSettings = { connectIpsEnabled: false, connectIpsServerReady: false, connectIpsServerEnvironment: 'STAGING', staticQrEnabled: false, staticQrImageUrl: '', accountName: '', accountNumber: '', bankName: '', instructions: '', successReturnUrl: '', failureReturnUrl: '' };

export function TenantPaymentsPage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const load = async () => {
    setLoading(true); setError('');
    try { setForm(await request<PaymentSettings>('/finances/payment-settings')); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const saved = await request<PaymentSettings>('/finances/payment-settings', { method: 'PUT', body: JSON.stringify({ connectIpsEnabled: form.connectIpsEnabled, staticQrEnabled: form.staticQrEnabled, staticQrImageUrl: form.staticQrImageUrl, accountName: form.accountName, accountNumber: form.accountNumber, bankName: form.bankName, instructions: form.instructions }) });
      setForm((current) => ({ ...current, ...saved })); setNotice('Payment settings saved.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  if (loading) return <main className="payments-page"><div className="payments-skeleton" aria-label="Loading payment settings" aria-busy="true" /></main>;
  if (error && !form.successReturnUrl) return <main className="payments-page"><div className="payments-error" role="alert"><strong>Payment settings could not load</strong><p>{error}</p><Button onClick={() => void load()}>Try again</Button></div></main>;
  return <main className="payments-page">
    <header className="payments-header"><div><span className="payments-eyebrow">FINANCE CONTROL</span><h1>Payments</h1><p>Choose how families pay and keep provider handoff settings ready for staging and production.</p></div><StatusBadge variant={form.connectIpsServerReady ? 'success' : 'warning'}>{form.connectIpsServerReady ? 'Server credentials ready' : 'Credentials required'}</StatusBadge></header>
    {error ? <p className="payments-alert is-error" role="alert">{error}</p> : null}{notice ? <p className="payments-alert" role="status">{notice}</p> : null}
    <form onSubmit={submit} className="payments-layout">
      <section className="payments-card payments-provider"><div className="payments-card-head"><span className="material-symbols-outlined" aria-hidden="true">bolt</span><div><h2>connectIPS online payment</h2><p>Redirect the payer to connectIPS, then validate the result on the server before marking an invoice paid.</p></div><label className="payments-switch"><input type="checkbox" checked={form.connectIpsEnabled} onChange={(event) => update('connectIpsEnabled', event.target.checked)} /><span>Enable</span></label></div>
        <div className="payments-environment"><span>Deployment environment</span><StatusBadge variant={form.connectIpsServerEnvironment === 'LIVE' ? 'success' : 'info'}>{form.connectIpsServerEnvironment === 'LIVE' ? 'Live / production' : 'Staging / UAT'}</StatusBadge><small>Controlled by this project container and cannot be changed from the admin panel.</small></div>
        <div className="payments-callout"><span className="material-symbols-outlined" aria-hidden="true">lock</span><p>Merchant keys and certificates stay in server environment variables. This panel never exposes secrets to the browser.</p></div>
        <div className="payments-endpoints"><label>Success return URL<input readOnly value={form.successReturnUrl} onFocus={(event) => event.currentTarget.select()} /></label><label>Failure return URL<input readOnly value={form.failureReturnUrl} onFocus={(event) => event.currentTarget.select()} /></label><small>Give these exact URLs to connectIPS for the selected deployment. A success redirect is always revalidated server-to-server.</small></div>
      </section>
      <section className="payments-card"><div className="payments-card-head"><span className="material-symbols-outlined" aria-hidden="true">qr_code_2</span><div><h2>Static QR + manual verification</h2><p>Offer a fallback QR and bank-transfer instructions when online checkout is unavailable.</p></div><label className="payments-switch"><input type="checkbox" checked={form.staticQrEnabled} onChange={(event) => update('staticQrEnabled', event.target.checked)} /><span>Enable</span></label></div>
        <div className="payments-form-grid" aria-disabled={!form.staticQrEnabled}><label className="is-wide">Static QR image URL<input type="url" inputMode="url" autoComplete="url" disabled={!form.staticQrEnabled} required={form.staticQrEnabled} placeholder="https://…/payment-qr.png" value={form.staticQrImageUrl} onChange={(event) => update('staticQrImageUrl', event.target.value)} /></label><label>Account name<input disabled={!form.staticQrEnabled} autoComplete="organization" value={form.accountName} onChange={(event) => update('accountName', event.target.value)} /></label><label>Account number<input disabled={!form.staticQrEnabled} inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(event) => update('accountNumber', event.target.value)} /></label><label className="is-wide">Bank / wallet name<input disabled={!form.staticQrEnabled} autoComplete="organization" value={form.bankName} onChange={(event) => update('bankName', event.target.value)} /></label><label className="is-wide">Payment instructions<textarea disabled={!form.staticQrEnabled} rows={3} value={form.instructions} onChange={(event) => update('instructions', event.target.value)} placeholder="Ask the payer to upload a receipt and include the invoice reference." /></label></div>
      </section>
      <footer className="payments-actions"><p>At least one payment method should remain enabled for unpaid invoices.</p><Button type="submit" disabled={saving || (!form.connectIpsEnabled && !form.staticQrEnabled)}>{saving ? 'Saving…' : 'Save payment settings'}</Button></footer>
    </form>
  </main>;
}
