import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { errorMessage } from '../services/api/client';

type ResultState = 'checking' | 'success' | 'failed' | 'pending';

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const txnId = params.get('txnId') || '';
  const hinted = params.get('status')?.toUpperCase();
  const [state, setState] = useState<ResultState>(hinted === 'SUCCESS' ? 'success' : hinted === 'FAILED' ? 'failed' : 'checking');
  const [error, setError] = useState('');
  const feesPath = user?.role === 'PARENT' ? '/parent/fees' : '/student/fees';
  useEffect(() => {
    if (!txnId) { setState('failed'); setError('The payment reference is missing. Return to your invoice and try again.'); return; }
    let cancelled = false; let checks = 0; let timer = 0;
    const check = async () => { try { const result = await api.finances.getConnectIpsStatus(txnId); if (cancelled) return; if (result.status === 'SUCCESS') { setState('success'); return; } if (result.status === 'FAILED') { setState('failed'); return; } checks += 1; if (checks >= 8) { setState('pending'); return; } setState('checking'); timer = window.setTimeout(check, 2500); } catch (cause) { if (!cancelled) { setError(errorMessage(cause)); setState('pending'); } } };
    void check(); return () => { cancelled = true; window.clearTimeout(timer); };
  }, [txnId]);
  const content = state === 'success' ? { icon: 'check_circle', title: 'Payment successful', text: 'connectIPS confirmed your payment. The invoice is now marked paid.', action: 'View paid invoice' } : state === 'failed' ? { icon: 'cancel', title: 'Payment wasn’t completed', text: error || 'No money was confirmed for this attempt. You can retry connectIPS or choose QR payment.', action: 'Try another method' } : state === 'pending' ? { icon: 'schedule', title: 'Confirmation is taking longer', text: error || 'Your payment is not marked failed. We’ll keep reconciling it safely; check the invoice again shortly.', action: 'Check invoice' } : { icon: 'sync', title: 'Verifying your payment', text: 'Please keep this page open while we confirm the transaction with connectIPS.', action: '' };
  return <main className={`payment-result-page is-${state}`}><section aria-live="polite"><span className="material-symbols-outlined" aria-hidden="true">{content.icon}</span><span className="payment-checkout-eyebrow">CONNECTIPS PAYMENT</span><h1>{content.title}</h1><p>{content.text}</p>{state === 'checking' ? <div className="payment-result-progress" aria-label="Checking payment status" /> : <Link to={feesPath}>{content.action}<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link>}<small>Reference: {txnId || 'Unavailable'}</small></section></main>;
}
