import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { PageShell } from '../components/patterns/PageShell';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import './staffFinance.css';

type Tab = 'overview' | 'petty-cash' | 'billing' | 'reports';
type CashStatus = 'PENDING' | 'APPROVED_LEVEL1' | 'REVISION_REQUESTED' | 'RELEASED' | 'RECEIPT_SUBMITTED' | 'CLOSED';
type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE' | 'VERIFY_PAYMENT';

interface PettyCash {
  id: string;
  purpose: string;
  amount: number;
  status: CashStatus;
  submitted: string;
  reviewer?: string;
  remarks?: string;
  receipt?: string;
}

interface Invoice {
  id: string;
  student: string;
  grade: string;
  cycle: string;
  gross: number;
  discount: number;
  discountType?: string;
  fine: number;
  status: InvoiceStatus;
  paymentMethod?: string;
  reference?: string;
}

const MONTHLY_CAP = 35_000;

const initialCash: PettyCash[] = [
  { id: 'PC-2026-071', purpose: 'Printer toner and A4 paper', amount: 6_800, status: 'RELEASED', submitted: '28 Jul 2026' },
  { id: 'PC-2026-069', purpose: 'Emergency plumbing repair', amount: 4_500, status: 'REVISION_REQUESTED', submitted: '26 Jul 2026', reviewer: 'Sushil Adhikari · Branch Admin', remarks: 'Please attach the vendor estimate and separate material from labour cost.' },
  { id: 'PC-2026-067', purpose: 'Exam answer sheets', amount: 7_200, status: 'APPROVED_LEVEL1', submitted: '24 Jul 2026' },
  { id: 'PC-2026-064', purpose: 'Internet router replacement', amount: 5_300, status: 'RECEIPT_SUBMITTED', submitted: '20 Jul 2026', receipt: 'router-receipt.pdf' },
  { id: 'PC-2026-059', purpose: 'Classroom first-aid refill', amount: 3_200, status: 'CLOSED', submitted: '14 Jul 2026', receipt: 'first-aid.jpg' },
];

const initialInvoices: Invoice[] = [
  { id: 'INV-2026-089', student: 'Aarav Sharma', grade: 'Grade 10 · Science', cycle: 'Shrawan 2083', gross: 4_800, discount: 300, discountType: 'Scholarship', fine: 0, status: 'PAID', paymentMethod: 'Nepal Pay', reference: 'NP-7281046' },
  { id: 'INV-2026-088', student: 'Mira Karki', grade: 'Grade 8 · Mathematics', cycle: 'Shrawan 2083', gross: 3_400, discount: 200, discountType: 'Sibling', fine: 0, status: 'PAID', paymentMethod: 'Cash', reference: 'CR-2083-0198' },
  { id: 'INV-2026-087', student: 'Rohan Thapa', grade: 'Grade 9 · Computer', cycle: 'Shrawan 2083', gross: 2_800, discount: 0, fine: 100, status: 'VERIFY_PAYMENT', paymentMethod: 'Nepal Pay' },
  { id: 'INV-2026-083', student: 'Saanvi Shrestha', grade: 'Grade 7 · General', cycle: 'Shrawan 2083', gross: 4_200, discount: 0, fine: 0, status: 'DUE' },
  { id: 'INV-2026-078', student: 'Niraj Rai', grade: 'Grade 10 · Management', cycle: 'Ashadh 2083', gross: 5_100, discount: 0, fine: 250, status: 'OVERDUE' },
];

const money = (value: number) => `NPR ${value.toLocaleString('en-NP')}`;
const statusLabel: Record<CashStatus | InvoiceStatus, string> = {
  PENDING: 'Awaiting Level 1',
  APPROVED_LEVEL1: 'Awaiting Level 2',
  REVISION_REQUESTED: 'Revision requested',
  RELEASED: 'Awaiting receipt',
  RECEIPT_SUBMITTED: 'Receipt under review',
  CLOSED: 'Closed',
  PAID: 'Paid',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  VERIFY_PAYMENT: 'Needs verification',
};
const tone = (status: CashStatus | InvoiceStatus) => {
  if (status === 'PAID' || status === 'CLOSED') return 'success';
  if (status === 'OVERDUE') return 'error';
  if (status === 'REVISION_REQUESTED' || status === 'VERIFY_PAYMENT') return 'warning';
  if (status === 'RELEASED' || status === 'RECEIPT_SUBMITTED') return 'info';
  return 'neutral';
};

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

function StatusPill({ status }: { status: CashStatus | InvoiceStatus }) {
  return <span className={`accountant-status is-${tone(status)}`}><span aria-hidden="true" />{statusLabel[status]}</span>;
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !modalRef.current) return;
      const elements = modalRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  return (
    <div className="accountant-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={modalRef} className="accountant-modal" role="dialog" aria-modal="true" aria-labelledby="accountant-modal-title" aria-describedby="accountant-modal-description" tabIndex={-1}>
        <header>
          <div><h2 id="accountant-modal-title">{title}</h2><p id="accountant-modal-description">{description}</p></div>
          <button type="button" className="accountant-icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function StaffFinancePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [cash, setCash] = useState(initialCash);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [cashDialog, setCashDialog] = useState<PettyCash | 'new' | null>(null);
  const [receiptDialog, setReceiptDialog] = useState<PettyCash | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null);
  const [discountDialog, setDiscountDialog] = useState<Invoice | null>(null);
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [attachment, setAttachment] = useState('');
  const [reference, setReference] = useState('');
  const [discountType, setDiscountType] = useState('Flat');
  const [discountValue, setDiscountValue] = useState('');
  const [query, setQuery] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');

  const committedSpend = cash.filter((item) => !['REVISION_REQUESTED'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const remaining = Math.max(0, MONTHLY_CAP - committedSpend);
  const requestedAmount = Number(amount.replace(/,/g, '')) || 0;
  const amountOverCap = requestedAmount > remaining;
  const openCash = cash.filter((item) => item.status !== 'CLOSED').length;
  const awaitingReceipt = cash.filter((item) => item.status === 'RELEASED').length;
  const collected = invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.gross - invoice.discount + invoice.fine, 0);
  const outstanding = invoices.filter((invoice) => invoice.status !== 'PAID').reduce((sum, invoice) => sum + invoice.gross - invoice.discount + invoice.fine, 0);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const matchesQuery = `${invoice.id} ${invoice.student} ${invoice.grade}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (invoiceFilter === 'ALL' || invoice.status === invoiceFilter);
  }), [invoices, invoiceFilter, query]);

  const openCashDialog = (item: PettyCash | 'new') => {
    setCashDialog(item);
    setPurpose(item === 'new' ? '' : item.purpose);
    setAmount(item === 'new' ? '' : String(item.amount));
    setAttachment('');
  };

  const submitCash = (event: FormEvent) => {
    event.preventDefault();
    if (!purpose.trim() || requestedAmount <= 0 || amountOverCap) return;
    if (cashDialog !== 'new' && cashDialog?.status === 'REVISION_REQUESTED' && !attachment) {
      showToast('Attach the supporting estimate requested by the reviewer.', 'error');
      return;
    }
    if (cashDialog === 'new') {
      setCash((items) => [{ id: `PC-2026-${String(72 + items.length).padStart(3, '0')}`, purpose: purpose.trim(), amount: requestedAmount, status: 'PENDING', submitted: '30 Jul 2026' }, ...items]);
      showToast('Request submitted for Level 1 approval.', 'success');
    } else if (cashDialog) {
      setCash((items) => items.map((item) => item.id === cashDialog.id ? { ...item, purpose: purpose.trim(), amount: requestedAmount, status: 'PENDING', remarks: undefined, reviewer: undefined } : item));
      showToast('Revised request resubmitted on the same record.', 'success');
    }
    setCashDialog(null);
  };

  const submitReceipt = (event: FormEvent) => {
    event.preventDefault();
    if (!receiptDialog || !attachment) return;
    setCash((items) => items.map((item) => item.id === receiptDialog.id ? { ...item, receipt: attachment, status: 'RECEIPT_SUBMITTED' } : item));
    setReceiptDialog(null);
    setAttachment('');
    showToast('Receipt submitted for administrator verification.', 'success');
  };

  const confirmPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!paymentDialog || !reference.trim()) return;
    setInvoices((items) => items.map((item) => item.id === paymentDialog.id ? { ...item, status: 'PAID', reference: reference.trim(), paymentMethod: 'Manual confirmation' } : item));
    setPaymentDialog(null);
    setReference('');
    showToast('Payment confirmed with an auditable reference.', 'success');
  };

  const applyDiscount = (event: FormEvent) => {
    event.preventDefault();
    if (!discountDialog) return;
    const raw = Number(discountValue);
    if (!Number.isFinite(raw) || raw <= 0) return;
    const calculated = discountType === 'Percentage' ? Math.round(discountDialog.gross * Math.min(raw, 20) / 100) : Math.min(raw, discountDialog.gross);
    setInvoices((items) => items.map((item) => item.id === discountDialog.id ? { ...item, discount: calculated, discountType } : item));
    setDiscountDialog(null);
    setDiscountValue('');
    showToast(`${discountType} discount applied within policy.`, 'success');
  };

  const exportFile = (format: 'CSV' | 'PDF') => showToast(`${format} export prepared for Baneshwor branch.`, 'success');

  const renderCashTable = (items: PettyCash[]) => (
    <div className="accountant-table-scroll">
      <table className="accountant-table">
        <thead><tr><th>Request</th><th>Purpose</th><th>Amount</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{items.map((item) => (
          <tr key={item.id}>
            <td className="is-reference">{item.id}</td><td><strong>{item.purpose}</strong>{item.remarks && <small>{item.remarks}</small>}</td>
            <td className="is-amount">{money(item.amount)}</td><td>{item.submitted}</td><td><StatusPill status={item.status} /></td>
            <td className="is-actions">
              {item.status === 'REVISION_REQUESTED' && <button type="button" className="accountant-text-button" onClick={() => openCashDialog(item)}><Icon name="edit" />Revise</button>}
              {item.status === 'RELEASED' && <button type="button" className="accountant-text-button" onClick={() => { setReceiptDialog(item); setAttachment(''); }}><Icon name="upload_file" />Add receipt</button>}
              {item.status === 'RECEIPT_SUBMITTED' && <span className="accountant-locked"><Icon name="lock" />Admin closes</span>}
              {!['REVISION_REQUESTED', 'RELEASED', 'RECEIPT_SUBMITTED'].includes(item.status) && <button type="button" className="accountant-icon-button" aria-label={`View ${item.id}`}><Icon name="chevron_right" /></button>}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <PageShell title="Accountant Workspace" subtitle="Branch finance, billing and controlled petty cash." userRole={user?.role ?? 'ACCOUNTANT'} userName={user?.name ?? 'Anita Shrestha'} onLogout={logout}>
      <div className="accountant-page">
        <section className="accountant-hero">
          <div>
            <span className="accountant-eyebrow"><Icon name="account_balance_wallet" />Baneshwor Main Branch</span>
            <h1>Finance control centre</h1>
            <p>Reconcile collections, manage invoices and move petty cash through two-step approval.</p>
          </div>
          <button type="button" className="accountant-primary-button" onClick={() => openCashDialog('new')}><Icon name="add" />New petty cash request</button>
        </section>

        <nav className="accountant-tabs" aria-label="Accountant finance sections">
          {([
            ['overview', 'Overview', 'space_dashboard'],
            ['petty-cash', 'Petty cash', 'account_balance_wallet'],
            ['billing', 'Billing & invoices', 'receipt_long'],
            ['reports', 'Reports', 'query_stats'],
          ] as const).map(([value, label, iconName]) => <button key={value} type="button" aria-current={tab === value ? 'page' : undefined} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}><Icon name={iconName} />{label}</button>)}
        </nav>

        {tab === 'overview' && <>
          <section className="accountant-kpis" aria-label="Finance summary">
            <article><span className="is-success"><Icon name="payments" /></span><div><p>Collected this cycle</p><strong>{money(collected)}</strong><small>2 settled invoices</small></div></article>
            <article><span className="is-warning"><Icon name="pending_actions" /></span><div><p>Outstanding</p><strong>{money(outstanding)}</strong><small>3 invoices need attention</small></div></article>
            <article><span className="is-info"><Icon name="account_balance_wallet" /></span><div><p>Monthly petty cash</p><strong>{money(remaining)}</strong><small>{money(MONTHLY_CAP)} cap · resets 1 Aug</small></div></article>
            <article><span className="is-error"><Icon name="receipt" /></span><div><p>Open expense records</p><strong>{openCash}</strong><small>{awaitingReceipt} awaiting receipt</small></div></article>
          </section>
          <section className="accountant-grid">
            <article className="accountant-panel accountant-open-work">
              <header><div><h2>Open work</h2><p>Records that need your next action stay visible here.</p></div><button type="button" className="accountant-text-button" onClick={() => setTab('petty-cash')}>View all<Icon name="arrow_forward" /></button></header>
              <div className="accountant-work-list">
                <button type="button" onClick={() => openCashDialog(initialCash[1])}><span className="is-warning"><Icon name="edit_note" /></span><div><strong>Revision requested</strong><small>PC-2026-069 · Add vendor estimate</small></div><Icon name="chevron_right" /></button>
                <button type="button" onClick={() => { setReceiptDialog(cash[0]); setAttachment(''); }}><span className="is-info"><Icon name="upload_file" /></span><div><strong>Receipt needed</strong><small>PC-2026-071 · Funds released</small></div><Icon name="chevron_right" /></button>
                <button type="button" onClick={() => { setPaymentDialog(invoices[2]); setReference(''); }}><span className="is-warning"><Icon name="sync_problem" /></span><div><strong>Payment needs confirmation</strong><small>INV-2026-087 · Nepal Pay webhook missing</small></div><Icon name="chevron_right" /></button>
              </div>
            </article>
            <article className="accountant-panel accountant-cap-card">
              <header><div><h2>July spending control</h2><p>Cap consumption across active requests.</p></div><span className="accountant-safe-badge"><Icon name="verified_user" />Within policy</span></header>
              <div className="accountant-cap-figure"><strong>{Math.round(committedSpend / MONTHLY_CAP * 100)}%</strong><span>of monthly cap committed</span></div>
              <div className="accountant-progress" role="progressbar" aria-label="Monthly petty cash cap used" aria-valuenow={committedSpend} aria-valuemin={0} aria-valuemax={MONTHLY_CAP}><span style={{ width: `${Math.min(100, committedSpend / MONTHLY_CAP * 100)}%` }} /></div>
              <dl><div><dt>Committed</dt><dd>{money(committedSpend)}</dd></div><div><dt>Available</dt><dd>{money(remaining)}</dd></div></dl>
              <p className="accountant-policy-note"><Icon name="shield_lock" />Every rupee still requires Branch Admin and Tenant Admin approval.</p>
            </article>
          </section>
          <section className="accountant-panel">
            <header><div><h2>Recent petty cash activity</h2><p>Latest records for Baneshwor Main Branch.</p></div></header>
            {renderCashTable(cash.slice(0, 4))}
          </section>
        </>}

        {tab === 'petty-cash' && <>
          <section className="accountant-section-head"><div><span className="accountant-eyebrow">Controlled disbursements</span><h2>Petty cash requests</h2><p>Requests remain open until an administrator verifies the receipt and closes the record.</p></div><button type="button" className="accountant-primary-button" onClick={() => openCashDialog('new')}><Icon name="add" />New request</button></section>
          <section className="accountant-cap-strip"><div><Icon name="calendar_month" /><span>July 2026 cap</span><strong>{money(MONTHLY_CAP)}</strong></div><div><span>Committed</span><strong>{money(committedSpend)}</strong></div><div><span>Remaining</span><strong>{money(remaining)}</strong></div><small>Resets automatically on 1 August</small></section>
          <section className="accountant-panel"><header><div><h2>Branch requests</h2><p>Approval actions are intentionally unavailable to requesters.</p></div><span className="accountant-locked"><Icon name="lock" />No self-approval</span></header>{renderCashTable(cash)}</section>
        </>}

        {tab === 'billing' && <>
          <section className="accountant-section-head"><div><span className="accountant-eyebrow">Shrawan 2083 billing cycle</span><h2>Billing & invoices</h2><p>Manage branch invoices, policy discounts, fines and Nepal Pay status.</p></div></section>
          <section className="accountant-toolbar">
            <label className="accountant-search"><span className="sr-only">Search invoices</span><Icon name="search" /><input type="search" placeholder="Search student or invoice…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label><span className="sr-only">Filter by payment status</span><select value={invoiceFilter} onChange={(event) => setInvoiceFilter(event.target.value)}><option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="DUE">Due</option><option value="OVERDUE">Overdue</option><option value="VERIFY_PAYMENT">Needs verification</option></select></label>
          </section>
          <section className="accountant-panel">
            <div className="accountant-table-scroll"><table className="accountant-table accountant-invoice-table"><thead><tr><th>Invoice</th><th>Student</th><th>Cycle</th><th>Gross</th><th>Adjustments</th><th>Net payable</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td className="is-reference">{invoice.id}</td><td><strong>{invoice.student}</strong><small>{invoice.grade}</small></td><td>{invoice.cycle}</td><td className="is-amount">{money(invoice.gross)}</td><td><span className={invoice.discount ? 'is-discount' : ''}>{invoice.discount ? `− ${money(invoice.discount)}` : '—'}</span>{invoice.fine > 0 && <small className="is-fine">+ {money(invoice.fine)} fine</small>}</td><td className="is-amount">{money(invoice.gross - invoice.discount + invoice.fine)}</td><td><StatusPill status={invoice.status} />{invoice.reference && <small>{invoice.reference}</small>}</td><td className="is-actions"><button type="button" className="accountant-icon-button" aria-label={`More actions for ${invoice.id}`}><Icon name="more_vert" /></button>{invoice.status !== 'PAID' && <button type="button" className="accountant-text-button" onClick={() => { setDiscountDialog(invoice); setDiscountValue(''); }}>Discount</button>}{invoice.status === 'VERIFY_PAYMENT' && <button type="button" className="accountant-text-button is-emphasis" onClick={() => { setPaymentDialog(invoice); setReference(''); }}>Confirm payment</button>}</td></tr>)}</tbody></table></div>
            {filteredInvoices.length === 0 && <div className="accountant-empty"><Icon name="search_off" /><strong>No matching invoices</strong><p>Clear the search or choose another payment status.</p><button type="button" className="accountant-secondary-button" onClick={() => { setQuery(''); setInvoiceFilter('ALL'); }}>Clear filters</button></div>}
          </section>
        </>}

        {tab === 'reports' && <>
          <section className="accountant-section-head"><div><span className="accountant-eyebrow">Branch reconciliation</span><h2>Ledger & expense reports</h2><p>Double-entry records are branch-scoped. Consolidated tenant figures remain read-only.</p></div></section>
          <section className="accountant-grid">
            <article className="accountant-panel accountant-report-card"><span className="is-info"><Icon name="menu_book" /></span><div><h2>Double-entry ledger</h2><p>Debit and credit entries for Baneshwor Main Branch through 30 July 2026.</p><small>128 entries · Last posted today, 11:32</small></div><div className="accountant-report-actions"><button type="button" className="accountant-secondary-button" onClick={() => exportFile('CSV')}><Icon name="download" />CSV</button><button type="button" className="accountant-secondary-button" onClick={() => exportFile('PDF')}><Icon name="picture_as_pdf" />PDF</button></div></article>
            <article className="accountant-panel accountant-report-card"><span className="is-warning"><Icon name="receipt_long" /></span><div><h2>Expense records</h2><p>Released petty cash and verified branch expense documentation.</p><small>18 records · {money(27_000)} this month</small></div><div className="accountant-report-actions"><button type="button" className="accountant-secondary-button" onClick={() => exportFile('CSV')}><Icon name="download" />CSV</button><button type="button" className="accountant-secondary-button" onClick={() => exportFile('PDF')}><Icon name="picture_as_pdf" />PDF</button></div></article>
          </section>
          <section className="accountant-panel accountant-readonly"><header><div><h2>Consolidated tenant P&amp;L</h2><p>Reference view only · broader access requires Tenant Admin permission.</p></div><span className="accountant-locked"><Icon name="visibility" />Read only</span></header><dl><div><dt>Revenue</dt><dd>{money(1_284_500)}</dd></div><div><dt>Operating costs</dt><dd>{money(824_300)}</dd></div><div><dt>Net margin</dt><dd className="is-positive">{money(460_200)}</dd></div></dl></section>
        </>}
      </div>

      {cashDialog && <Modal title={cashDialog === 'new' ? 'New petty cash request' : `Revise ${cashDialog.id}`} description={cashDialog === 'new' ? 'Submission starts the two-level approval workflow.' : 'Edit and resubmit the same record with the requested evidence.'} onClose={() => setCashDialog(null)}>
        <form className="accountant-form" onSubmit={submitCash}>
          {cashDialog !== 'new' && cashDialog.remarks && <div className="accountant-review-note"><Icon name="rate_review" /><div><strong>{cashDialog.reviewer}</strong><p>{cashDialog.remarks}</p></div></div>}
          <label htmlFor="cash-purpose">Purpose <span aria-hidden="true">*</span><textarea id="cash-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} required aria-describedby="cash-purpose-help" /><small id="cash-purpose-help">Be specific enough for both approvers to review.</small></label>
          <label htmlFor="cash-amount">Amount (NPR) <span aria-hidden="true">*</span><input id="cash-amount" type="text" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} required aria-invalid={amountOverCap || undefined} aria-describedby={amountOverCap ? 'cash-amount-error' : 'cash-amount-help'} />{amountOverCap ? <small id="cash-amount-error" className="accountant-field-error" role="alert">This request exceeds the remaining cap by {money(requestedAmount - remaining)}. Reduce the amount to submit.</small> : <small id="cash-amount-help">{money(remaining)} remains in this month’s cap.</small>}</label>
          {cashDialog !== 'new' && <label htmlFor="cash-support">Supporting document <span aria-hidden="true">*</span><input id="cash-support" type="file" accept=".pdf,image/*" required onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? '')} /><small>PDF, JPG or PNG · requested by the reviewer.</small></label>}
          <div className="accountant-approval-route"><Icon name="account_tree" /><div><strong>Approval route</strong><p>Branch Admin · Level 1 <Icon name="arrow_forward" /> Tenant Admin · Level 2 <Icon name="arrow_forward" /> Funds released</p></div></div>
          <footer><button type="button" className="accountant-secondary-button" onClick={() => setCashDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!purpose.trim() || requestedAmount <= 0 || amountOverCap}>{cashDialog === 'new' ? 'Submit request' : 'Resubmit revision'}<Icon name="arrow_forward" /></button></footer>
        </form>
      </Modal>}

      {receiptDialog && <Modal title={`Submit receipt · ${receiptDialog.id}`} description="The record stays open until an administrator verifies the proof and closes it." onClose={() => setReceiptDialog(null)}>
        <form className="accountant-form" onSubmit={submitReceipt}><div className="accountant-receipt-summary"><span><small>Purpose</small><strong>{receiptDialog.purpose}</strong></span><span><small>Released amount</small><strong>{money(receiptDialog.amount)}</strong></span></div><label htmlFor="receipt-file">Receipt or proof of spend <span aria-hidden="true">*</span><input id="receipt-file" type="file" accept=".pdf,image/*" required onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? '')} /><small>PDF, JPG or PNG. Keep supplier details and totals readable.</small></label><div className="accountant-policy-note"><Icon name="info" /><span>You can submit proof, but only a Branch or Tenant Admin can verify and close this record.</span></div><footer><button type="button" className="accountant-secondary-button" onClick={() => setReceiptDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!attachment}>Submit receipt</button></footer></form>
      </Modal>}

      {paymentDialog && <Modal title="Confirm payment received" description={`Manual fallback for ${paymentDialog.id} after Nepal Pay confirmation failed.`} onClose={() => setPaymentDialog(null)}>
        <form className="accountant-form" onSubmit={confirmPayment}><div className="accountant-receipt-summary"><span><small>Student</small><strong>{paymentDialog.student}</strong></span><span><small>Amount</small><strong>{money(paymentDialog.gross - paymentDialog.discount + paymentDialog.fine)}</strong></span></div><label htmlFor="payment-reference">Reference or receipt number <span aria-hidden="true">*</span><input id="payment-reference" type="text" autoComplete="off" spellCheck={false} placeholder="e.g. NP-7281046" value={reference} onChange={(event) => setReference(event.target.value)} required /><small>This reference is stored in the audit trail.</small></label><div className="accountant-warning-note"><Icon name="warning" /><span>Confirm only after matching the amount and payer in the bank or Nepal Pay record. Financial confirmations are not optimistic and cannot be silently undone.</span></div><footer><button type="button" className="accountant-secondary-button" onClick={() => setPaymentDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!reference.trim()}>Confirm received</button></footer></form>
      </Modal>}

      {discountDialog && <Modal title="Apply invoice discount" description={`Use a Tenant Admin-approved discount type for ${discountDialog.student}.`} onClose={() => setDiscountDialog(null)}>
        <form className="accountant-form" onSubmit={applyDiscount}><label htmlFor="discount-type">Discount type<select id="discount-type" value={discountType} onChange={(event) => setDiscountType(event.target.value)}><option>Flat</option><option>Percentage</option><option>Sibling</option><option>Scholarship</option></select><small>Only configured policy types are available.</small></label><label htmlFor="discount-value">{discountType === 'Percentage' ? 'Percentage' : 'Amount (NPR)'} <span aria-hidden="true">*</span><input id="discount-value" type="text" inputMode="decimal" autoComplete="off" value={discountValue} onChange={(event) => setDiscountValue(event.target.value.replace(/[^\d.]/g, ''))} required /><small>{discountType === 'Percentage' ? 'Policy allows up to 20%.' : `Cannot exceed ${money(discountDialog.gross)}.`}</small></label><footer><button type="button" className="accountant-secondary-button" onClick={() => setDiscountDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!discountValue}>Apply discount</button></footer></form>
      </Modal>}
    </PageShell>
  );
}
