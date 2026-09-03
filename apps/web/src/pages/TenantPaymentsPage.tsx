import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { request, errorMessage } from '../services/api/client';
import { api } from '../services/api';

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
  const [submissions, setSubmissions] = useState<Awaited<ReturnType<typeof api.finances.getManualPayments>>['attempts']>([]);
  const [reviewing, setReviewing] = useState('');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const update = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const load = async () => {
    setLoading(true); setError('');
    try { const [settings, manual] = await Promise.all([request<PaymentSettings>('/finances/payment-settings'), api.finances.getManualPayments()]); setForm(settings); setSubmissions(manual.attempts); }
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
  const decide = async (id: string, decision: 'APPROVE' | 'REJECT') => { setReviewing(id); setError(''); setNotice(''); try { const result = await api.finances.decideManualPayment(id, decision, remarks[id] || ''); setNotice(result.message); const manual = await api.finances.getManualPayments(); setSubmissions(manual.attempts); } catch (cause) { setError(errorMessage(cause)); } finally { setReviewing(''); } };
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
      <section className="payments-card payments-review"><div className="payments-card-head"><span className="material-symbols-outlined" aria-hidden="true">fact_check</span><div><h2>Receipt verification</h2><p>Match the reference, amount, student, and receipt before changing an invoice.</p></div><StatusBadge variant={submissions.some((item) => item.status === 'PENDING') ? 'warning' : 'success'}>{submissions.filter((item) => item.status === 'PENDING').length} pending</StatusBadge></div>{submissions.length ? <div className="payments-review-list">{submissions.map((item) => <article key={item.id}><a href={item.receiptProof} target="_blank" rel="noreferrer"><img src={item.receiptProof} width="96" height="96" alt={`Receipt submitted by ${item.studentName}`} /></a><div><strong>{item.studentName}</strong><span>NPR {item.amount.toLocaleString('en-NP')} · {item.referenceId}</span><small>Invoice {item.invoiceId.slice(0, 8).toUpperCase()} · submitted {new Date(item.createdAt).toLocaleString('en-NP')}</small>{item.reviewRemarks ? <p>{item.reviewRemarks}</p> : null}</div><StatusBadge variant={item.status === 'SUCCESS' ? 'success' : item.status === 'FAILED' ? 'error' : 'warning'}>{item.status === 'SUCCESS' ? 'Approved' : item.status === 'FAILED' ? 'Rejected' : 'Awaiting review'}</StatusBadge>{item.status === 'PENDING' ? <div className="payments-review-actions"><label htmlFor={`review-${item.id}`}>Review note<input id={`review-${item.id}`} value={remarks[item.id] || ''} maxLength={500} onChange={(event) => setRemarks((current) => ({ ...current, [item.id]: event.target.value }))} /></label><Button type="button" disabled={reviewing === item.id} onClick={() => void decide(item.id, 'APPROVE')}>Approve payment</Button><Button type="button" variant="danger" disabled={reviewing === item.id || !(remarks[item.id] || '').trim()} onClick={() => void decide(item.id, 'REJECT')}>Reject</Button></div> : null}</article>)}</div> : <div className="payments-review-empty" role="status"><span className="material-symbols-outlined" aria-hidden="true">task_alt</span><strong>No receipt submissions yet</strong><p>QR payments awaiting verification will appear here.</p></div>}</section>
      <footer className="payments-actions"><p>At least one payment method should remain enabled for unpaid invoices.</p><Button type="submit" disabled={saving || (!form.connectIpsEnabled && !form.staticQrEnabled)}>{saving ? 'Saving…' : 'Save payment settings'}</Button></footer>
    </form>
  </main>;
}
