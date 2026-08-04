import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  items?: CashItem[];
}

interface CashItem {
  id: string;
  name: string;
  quantity: string;
  unitAmount: string;
}

interface Invoice {
  id: string;
  student: string;
  grade: string;
  cycle: string;
  gross: number;
  discount: number;
  discountType?: string;
  status: InvoiceStatus;
  paymentMethod?: string;
  reference?: string;
}

const MONTHLY_CAP = 35_000;
const accountantNavItems = [
  { section: 'FINANCE' as const, label: 'Overview', icon: 'space_dashboard', path: '/staff/finance#overview' },
  { section: 'FINANCE' as const, label: 'Petty cash', icon: 'account_balance_wallet', path: '/staff/finance#petty-cash' },
  { section: 'FINANCE' as const, label: 'Billing & invoices', icon: 'receipt_long', path: '/staff/finance#billing' },
  { section: 'FINANCE' as const, label: 'Reports', icon: 'query_stats', path: '/staff/finance#reports' },
];

const initialCash: PettyCash[] = [
  { id: 'PC-2026-071', purpose: 'Printer toner and A4 paper', amount: 6_800, status: 'RELEASED', submitted: '28 Jul 2026' },
  { id: 'PC-2026-069', purpose: 'Emergency plumbing repair', amount: 4_500, status: 'REVISION_REQUESTED', submitted: '26 Jul 2026', reviewer: 'Sushil Adhikari · Branch Admin', remarks: 'Please attach the vendor estimate and separate material from labour cost.' },
  { id: 'PC-2026-067', purpose: 'Exam answer sheets', amount: 7_200, status: 'APPROVED_LEVEL1', submitted: '24 Jul 2026' },
  { id: 'PC-2026-064', purpose: 'Internet router replacement', amount: 5_300, status: 'RECEIPT_SUBMITTED', submitted: '20 Jul 2026', receipt: 'router-receipt.pdf' },
  { id: 'PC-2026-059', purpose: 'Classroom first-aid refill', amount: 3_200, status: 'CLOSED', submitted: '14 Jul 2026', receipt: 'first-aid.jpg' },
];

const initialInvoices: Invoice[] = [
  { id: 'INV-2026-089', student: 'Aarav Sharma', grade: 'Grade 10 · Science', cycle: 'Shrawan 2083', gross: 4_800, discount: 300, discountType: 'Scholarship', status: 'PAID', paymentMethod: 'Nepal Pay', reference: 'NP-7281046' },
  { id: 'INV-2026-088', student: 'Mira Karki', grade: 'Grade 8 · Mathematics', cycle: 'Shrawan 2083', gross: 3_400, discount: 200, discountType: 'Sibling', status: 'PAID', paymentMethod: 'Cash', reference: 'CR-2083-0198' },
  { id: 'INV-2026-087', student: 'Rohan Thapa', grade: 'Grade 9 · Computer', cycle: 'Shrawan 2083', gross: 2_800, discount: 0, status: 'VERIFY_PAYMENT', paymentMethod: 'Nepal Pay' },
  { id: 'INV-2026-083', student: 'Saanvi Shrestha', grade: 'Grade 7 · General', cycle: 'Shrawan 2083', gross: 4_200, discount: 0, status: 'DUE' },
  { id: 'INV-2026-078', student: 'Niraj Rai', grade: 'Grade 10 · Management', cycle: 'Ashadh 2083', gross: 5_100, discount: 0, status: 'OVERDUE' },
];

const pastInvoices: Invoice[] = [
  { id: 'INV-2026-061', student: 'Aarav Sharma', grade: 'Grade 10 · Science', cycle: 'Ashadh 2083', gross: 4_800, discount: 300, discountType: 'Scholarship', status: 'PAID', paymentMethod: 'Nepal Pay', reference: 'NP-7148201' },
  { id: 'INV-2026-035', student: 'Aarav Sharma', grade: 'Grade 10 · Science', cycle: 'Jestha 2083', gross: 4_800, discount: 0, status: 'PAID', paymentMethod: 'Cash', reference: 'CR-2083-0141' },
  { id: 'INV-2026-060', student: 'Mira Karki', grade: 'Grade 8 · Mathematics', cycle: 'Ashadh 2083', gross: 3_400, discount: 200, discountType: 'Sibling', status: 'PAID', paymentMethod: 'Cash', reference: 'CR-2083-0165' },
  { id: 'INV-2026-058', student: 'Rohan Thapa', grade: 'Grade 9 · Computer', cycle: 'Ashadh 2083', gross: 2_800, discount: 0, status: 'PAID', paymentMethod: 'Nepal Pay', reference: 'NP-7093342' },
  { id: 'INV-2026-054', student: 'Saanvi Shrestha', grade: 'Grade 7 · General', cycle: 'Ashadh 2083', gross: 4_200, discount: 0, status: 'PAID', paymentMethod: 'Cash', reference: 'CR-2083-0152' },
  { id: 'INV-2026-050', student: 'Niraj Rai', grade: 'Grade 10 · Management', cycle: 'Jestha 2083', gross: 5_100, discount: 250, discountType: 'Flat', status: 'PAID', paymentMethod: 'Bank transfer', reference: 'BT-2083-0087' },
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>(() => {
    const section = location.hash.slice(1);
    return ['overview', 'petty-cash', 'billing', 'reports'].includes(section) ? section as Tab : 'overview';
  });
  const [cash, setCash] = useState(initialCash);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [cashDialog, setCashDialog] = useState<PettyCash | 'new' | null>(null);
  const [selectedCash, setSelectedCash] = useState<PettyCash | null>(null);
  const [receiptDialog, setReceiptDialog] = useState<PettyCash | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null);
  const [discountDialog, setDiscountDialog] = useState<Invoice | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [cashItems, setCashItems] = useState<CashItem[]>([{ id: crypto.randomUUID(), name: '', quantity: '1', unitAmount: '' }]);
  const [attachment, setAttachment] = useState('');
  const [reference, setReference] = useState('');
  const [discountType, setDiscountType] = useState('Flat');
  const [discountValue, setDiscountValue] = useState('');
  const [query, setQuery] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');

  const committedSpend = cash.filter((item) => !['REVISION_REQUESTED'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const remaining = Math.max(0, MONTHLY_CAP - committedSpend);
  const requestedAmount = cashItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitAmount) || 0), 0);
  const amountOverCap = requestedAmount > remaining;
  const itemsComplete = cashItems.length > 0 && cashItems.every((item) => item.name.trim() && Number(item.quantity) > 0 && Number(item.unitAmount) > 0);
  const openCash = cash.filter((item) => item.status !== 'CLOSED').length;
  const awaitingReceipt = cash.filter((item) => item.status === 'RELEASED').length;
  const collected = invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.gross - invoice.discount, 0);
  const outstanding = invoices.filter((invoice) => invoice.status !== 'PAID').reduce((sum, invoice) => sum + invoice.gross - invoice.discount, 0);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const matchesQuery = `${invoice.id} ${invoice.student} ${invoice.grade}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (invoiceFilter === 'ALL' || invoice.status === invoiceFilter);
  }), [invoices, invoiceFilter, query]);
  const studentHistory = useMemo(() => [...invoices, ...pastInvoices].filter((invoice) => invoice.student === selectedStudent), [invoices, selectedStudent]);

  useEffect(() => {
    const section = location.hash.slice(1);
    if (['overview', 'petty-cash', 'billing', 'reports'].includes(section)) setTab(section as Tab);
  }, [location.hash]);

  const selectTab = (nextTab: Tab) => navigate(`/staff/finance#${nextTab}`);

  const openCashDialog = (item: PettyCash | 'new') => {
    setCashDialog(item);
    setPurpose(item === 'new' ? '' : item.purpose);
    setCashItems(item === 'new'
      ? [{ id: crypto.randomUUID(), name: '', quantity: '1', unitAmount: '' }]
      : item.items?.map((line) => ({ ...line, id: crypto.randomUUID() })) ?? [{ id: crypto.randomUUID(), name: item.purpose, quantity: '1', unitAmount: String(item.amount) }]);
    setAttachment('');
  };

  const submitCash = (event: FormEvent) => {
    event.preventDefault();
    if (!purpose.trim() || !itemsComplete || requestedAmount <= 0 || amountOverCap) return;
    if (cashDialog !== 'new' && cashDialog?.status === 'REVISION_REQUESTED' && !attachment) {
      showToast('Attach the supporting estimate requested by the reviewer.', 'error');
      return;
    }
    if (cashDialog === 'new') {
      setCash((items) => [{ id: `PC-2026-${String(72 + items.length).padStart(3, '0')}`, purpose: purpose.trim(), items: cashItems, amount: requestedAmount, status: 'PENDING', submitted: '30 Jul 2026' }, ...items]);
      showToast('Request submitted for Level 1 approval.', 'success');
    } else if (cashDialog) {
      setCash((items) => items.map((item) => item.id === cashDialog.id ? { ...item, purpose: purpose.trim(), items: cashItems, amount: requestedAmount, status: 'PENDING', remarks: undefined, reviewer: undefined } : item));
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
            <td className="is-reference"><button type="button" className="accountant-record-link" onClick={() => setSelectedCash(item)}>{item.id}</button></td><td><button type="button" className="accountant-record-purpose" onClick={() => setSelectedCash(item)}>{item.purpose}</button>{item.remarks && <small>{item.remarks}</small>}</td>
            <td className="is-amount">{money(item.amount)}</td><td>{item.submitted}</td><td><StatusPill status={item.status} /></td>
            <td className="is-actions">
              {item.status === 'REVISION_REQUESTED' && <button type="button" className="accountant-text-button" onClick={() => openCashDialog(item)}><Icon name="edit" />Revise</button>}
              {item.status === 'RELEASED' && <button type="button" className="accountant-text-button" onClick={() => { setReceiptDialog(item); setAttachment(''); }}><Icon name="upload_file" />Add receipt</button>}
              {item.status === 'RECEIPT_SUBMITTED' && <span className="accountant-locked"><Icon name="lock" />Admin closes</span>}
              {!['REVISION_REQUESTED', 'RELEASED', 'RECEIPT_SUBMITTED'].includes(item.status) && <button type="button" className="accountant-icon-button" aria-label={`View all details for ${item.id}`} onClick={() => setSelectedCash(item)}><Icon name="chevron_right" /></button>}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <PageShell title="Accountant Workspace" subtitle="Branch finance, billing and controlled petty cash." userRole={user?.role ?? 'ACCOUNTANT'} userName={user?.name ?? 'Anita Shrestha'} onLogout={logout} navItems={accountantNavItems}>
      <div className="accountant-page">
        <section className="accountant-hero">
          <div>
            <span className="accountant-eyebrow"><Icon name="account_balance_wallet" />Baneshwor Main Branch</span>
            <h1>Finance control centre</h1>
            <p>Reconcile collections, manage invoices and move petty cash through two-step approval.</p>
          </div>
          <button type="button" className="accountant-primary-button" onClick={() => openCashDialog('new')}><Icon name="add" />New petty cash request</button>
        </section>

        {tab === 'overview' && <>
          <section className="accountant-kpis" aria-label="Finance summary">
            <article><span className="is-success"><Icon name="payments" /></span><div><p>Collected this cycle</p><strong>{money(collected)}</strong><small>2 settled invoices</small></div></article>
            <article><span className="is-warning"><Icon name="pending_actions" /></span><div><p>Outstanding</p><strong>{money(outstanding)}</strong><small>3 invoices need attention</small></div></article>
            <article><span className="is-info"><Icon name="account_balance_wallet" /></span><div><p>Monthly petty cash</p><strong>{money(remaining)}</strong><small>{money(MONTHLY_CAP)} cap · resets 1 Aug</small></div></article>
            <article><span className="is-error"><Icon name="receipt" /></span><div><p>Open expense records</p><strong>{openCash}</strong><small>{awaitingReceipt} awaiting receipt</small></div></article>
          </section>
          <section className="accountant-grid">
            <article className="accountant-panel accountant-open-work">
              <header><div><h2>Open work</h2><p>Records that need your next action stay visible here.</p></div><button type="button" className="accountant-text-button" onClick={() => selectTab('petty-cash')}>View all<Icon name="arrow_forward" /></button></header>
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
          <section className="accountant-section-head"><div><span className="accountant-eyebrow">Shrawan 2083 billing cycle</span><h2>Billing & invoices</h2><p>Review student billing, apply approved discounts and verify payment status.</p></div></section>
          <section className="accountant-toolbar">
            <label className="accountant-search" htmlFor="invoice-search"><span>Search invoices</span><div className="accountant-search-control"><Icon name="search" /><input id="invoice-search" type="search" autoComplete="off" placeholder="Student name or invoice number" value={query} onChange={(event) => setQuery(event.target.value)} /></div></label>
            <label className="accountant-filter" htmlFor="invoice-status"><span>Payment status</span><select id="invoice-status" value={invoiceFilter} onChange={(event) => setInvoiceFilter(event.target.value)}><option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="DUE">Due</option><option value="OVERDUE">Overdue</option><option value="VERIFY_PAYMENT">Needs verification</option></select></label>
          </section>
          <section className="accountant-panel">
            <div className="accountant-table-scroll"><table className="accountant-table accountant-invoice-table"><thead><tr><th>Invoice</th><th>Student</th><th>Cycle</th><th>Gross</th><th>Discount</th><th>Net payable</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td className="is-reference">{invoice.id}</td><td><button type="button" className="accountant-student-link" onClick={() => setSelectedStudent(invoice.student)}>{invoice.student}</button><small>{invoice.grade}</small></td><td>{invoice.cycle}</td><td className="is-amount">{money(invoice.gross)}</td><td><span className={invoice.discount ? 'is-discount' : ''}>{invoice.discount ? `− ${money(invoice.discount)}` : '—'}</span>{invoice.discountType && <small>{invoice.discountType}</small>}</td><td className="is-amount">{money(invoice.gross - invoice.discount)}</td><td><StatusPill status={invoice.status} />{invoice.reference && <small>{invoice.reference}</small>}</td><td className="is-actions">{invoice.status !== 'PAID' && <button type="button" className="accountant-text-button" onClick={() => { setDiscountDialog(invoice); setDiscountValue(''); }}>Apply discount</button>}{invoice.status === 'VERIFY_PAYMENT' && <button type="button" className="accountant-text-button is-emphasis" onClick={() => { setPaymentDialog(invoice); setReference(''); }}>Confirm payment</button>}</td></tr>)}</tbody></table></div>
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
          <fieldset className="accountant-line-items"><legend>Required items <span aria-hidden="true">*</span></legend><p>List each item exactly as it should appear for approval.</p>
            <div className="accountant-line-heading" aria-hidden="true"><span>Item name</span><span>Qty</span><span>Amount each</span><span>Total</span><span /></div>
            {cashItems.map((item, index) => { const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitAmount) || 0); return <div className="accountant-line-item" key={item.id}>
              <label htmlFor={`cash-item-${item.id}`}><span className="accountant-mobile-label">Item name</span><input id={`cash-item-${item.id}`} type="text" autoComplete="off" placeholder="e.g. A4 paper ream" value={item.name} onChange={(event) => setCashItems((items) => items.map((line) => line.id === item.id ? { ...line, name: event.target.value } : line))} required /></label>
              <label htmlFor={`cash-quantity-${item.id}`}><span className="accountant-mobile-label">Quantity</span><input id={`cash-quantity-${item.id}`} type="text" inputMode="numeric" autoComplete="off" value={item.quantity} onChange={(event) => setCashItems((items) => items.map((line) => line.id === item.id ? { ...line, quantity: event.target.value.replace(/\D/g, '') } : line))} required /></label>
              <label htmlFor={`cash-unit-${item.id}`}><span className="accountant-mobile-label">Amount each</span><input id={`cash-unit-${item.id}`} type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={item.unitAmount} onChange={(event) => setCashItems((items) => items.map((line) => line.id === item.id ? { ...line, unitAmount: event.target.value.replace(/[^\d.]/g, '') } : line))} required /></label>
              <output aria-label={`Total for item ${index + 1}`}>{money(lineTotal)}</output>
              <button type="button" className="accountant-icon-button" aria-label={`Remove item ${index + 1}`} disabled={cashItems.length === 1} onClick={() => setCashItems((items) => items.filter((line) => line.id !== item.id))}><Icon name="delete" /></button>
            </div>; })}
            <button type="button" className="accountant-add-line" onClick={() => setCashItems((items) => [...items, { id: crypto.randomUUID(), name: '', quantity: '1', unitAmount: '' }])}><Icon name="add" />Add another item</button>
          </fieldset>
          <div className="accountant-request-total"><span>Request total</span><strong>{money(requestedAmount)}</strong><small>{amountOverCap ? `Exceeds the remaining cap by ${money(requestedAmount - remaining)}` : `${money(remaining)} remains in this month’s cap.`}</small></div>
          <label htmlFor="cash-purpose">Description <span aria-hidden="true">*</span><textarea id="cash-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} placeholder="Explain why these items are needed and when they are required." required aria-describedby="cash-purpose-help" /><small id="cash-purpose-help">Give both approvers enough context to make a decision.</small></label>
          {cashDialog !== 'new' && <label htmlFor="cash-support">Supporting document <span aria-hidden="true">*</span><input id="cash-support" type="file" accept=".pdf,image/*" required onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? '')} /><small>PDF, JPG or PNG · requested by the reviewer.</small></label>}
          <div className="accountant-approval-route"><Icon name="account_tree" /><div><strong>Approval route</strong><p>Branch Admin · Level 1 <Icon name="arrow_forward" /> Tenant Admin · Level 2 <Icon name="arrow_forward" /> Funds released</p></div></div>
          <footer><button type="button" className="accountant-secondary-button" onClick={() => setCashDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!purpose.trim() || !itemsComplete || requestedAmount <= 0 || amountOverCap}>{cashDialog === 'new' ? 'Submit request' : 'Resubmit revision'}<Icon name="arrow_forward" /></button></footer>
        </form>
      </Modal>}

      {receiptDialog && <Modal title={`Submit receipt · ${receiptDialog.id}`} description="The record stays open until an administrator verifies the proof and closes it." onClose={() => setReceiptDialog(null)}>
        <form className="accountant-form" onSubmit={submitReceipt}><div className="accountant-receipt-summary"><span><small>Purpose</small><strong>{receiptDialog.purpose}</strong></span><span><small>Released amount</small><strong>{money(receiptDialog.amount)}</strong></span></div><label htmlFor="receipt-file">Receipt or proof of spend <span aria-hidden="true">*</span><input id="receipt-file" type="file" accept=".pdf,image/*" required onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? '')} /><small>PDF, JPG or PNG. Keep supplier details and totals readable.</small></label><div className="accountant-policy-note"><Icon name="info" /><span>You can submit proof, but only a Branch or Tenant Admin can verify and close this record.</span></div><footer><button type="button" className="accountant-secondary-button" onClick={() => setReceiptDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!attachment}>Submit receipt</button></footer></form>
      </Modal>}

      {selectedCash && <Modal title={`Petty cash request · ${selectedCash.id}`} description="Complete request, approval and receipt information for this record." onClose={() => setSelectedCash(null)}>
        <div className="accountant-cash-details">
          <section className="accountant-cash-summary" aria-label="Petty cash request summary"><div><small>Status</small><StatusPill status={selectedCash.status} /></div><div><small>Submitted</small><strong>{selectedCash.submitted}</strong></div><div><small>Total requested</small><strong>{money(selectedCash.amount)}</strong></div></section>
          <section className="accountant-detail-section"><h3>Description</h3><p>{selectedCash.purpose}</p></section>
          <section className="accountant-detail-section"><h3>Required items</h3><div className="accountant-table-scroll"><table className="accountant-table accountant-cash-items-table"><thead><tr><th>Item</th><th>Quantity</th><th>Amount each</th><th>Line total</th></tr></thead><tbody>{(selectedCash.items?.length ? selectedCash.items : [{ id: 'legacy', name: selectedCash.purpose, quantity: '1', unitAmount: String(selectedCash.amount) }]).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.quantity}</td><td className="is-amount">{money(Number(item.unitAmount) || 0)}</td><td className="is-amount">{money((Number(item.quantity) || 0) * (Number(item.unitAmount) || 0))}</td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Request total</th><td className="is-amount">{money(selectedCash.amount)}</td></tr></tfoot></table></div></section>
          <section className="accountant-detail-grid"><div><h3>Approval progress</h3><ol className="accountant-approval-steps"><li className="is-complete"><Icon name="check_circle" /><span><strong>Request submitted</strong><small>Accountant · {selectedCash.submitted}</small></span></li><li className={['APPROVED_LEVEL1', 'RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'].includes(selectedCash.status) ? 'is-complete' : ''}><Icon name={['APPROVED_LEVEL1', 'RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'].includes(selectedCash.status) ? 'check_circle' : 'pending'} /><span><strong>Branch Admin review</strong><small>{selectedCash.reviewer ?? 'Level 1 approval'}</small></span></li><li className={['RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'].includes(selectedCash.status) ? 'is-complete' : ''}><Icon name={['RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'].includes(selectedCash.status) ? 'check_circle' : 'pending'} /><span><strong>Tenant Admin release</strong><small>Level 2 approval and fund release</small></span></li><li className={selectedCash.status === 'CLOSED' ? 'is-complete' : ''}><Icon name={selectedCash.status === 'CLOSED' ? 'check_circle' : 'pending'} /><span><strong>Receipt verification</strong><small>{selectedCash.receipt ?? 'Receipt not yet verified'}</small></span></li></ol></div><div><h3>Record information</h3><dl className="accountant-detail-list"><div><dt>Request ID</dt><dd>{selectedCash.id}</dd></div><div><dt>Receipt</dt><dd>{selectedCash.receipt ?? 'Not submitted'}</dd></div><div><dt>Reviewer note</dt><dd>{selectedCash.remarks ?? 'No reviewer notes'}</dd></div><div><dt>Next action</dt><dd>{selectedCash.status === 'REVISION_REQUESTED' ? 'Revise and resubmit request' : selectedCash.status === 'RELEASED' ? 'Submit spending receipt' : selectedCash.status === 'RECEIPT_SUBMITTED' ? 'Await administrator verification' : selectedCash.status === 'CLOSED' ? 'No action · record closed' : 'Await administrator approval'}</dd></div></dl></div></section>
          <footer><button type="button" className="accountant-secondary-button" onClick={() => setSelectedCash(null)}>Close</button>{selectedCash.status === 'REVISION_REQUESTED' && <button type="button" className="accountant-primary-button" onClick={() => { setSelectedCash(null); openCashDialog(selectedCash); }}><Icon name="edit" />Revise request</button>}{selectedCash.status === 'RELEASED' && <button type="button" className="accountant-primary-button" onClick={() => { setReceiptDialog(selectedCash); setSelectedCash(null); setAttachment(''); }}><Icon name="upload_file" />Add receipt</button>}</footer>
        </div>
      </Modal>}

      {paymentDialog && <Modal title="Confirm payment received" description={`Manual fallback for ${paymentDialog.id} after Nepal Pay confirmation failed.`} onClose={() => setPaymentDialog(null)}>
        <form className="accountant-form" onSubmit={confirmPayment}><div className="accountant-receipt-summary"><span><small>Student</small><strong>{paymentDialog.student}</strong></span><span><small>Amount</small><strong>{money(paymentDialog.gross - paymentDialog.discount)}</strong></span></div><label htmlFor="payment-reference">Reference or receipt number <span aria-hidden="true">*</span><input id="payment-reference" type="text" autoComplete="off" spellCheck={false} placeholder="e.g. NP-7281046" value={reference} onChange={(event) => setReference(event.target.value)} required /><small>This reference is stored in the audit trail.</small></label><div className="accountant-warning-note"><Icon name="warning" /><span>Confirm only after matching the amount and payer in the bank or Nepal Pay record. Financial confirmations are not optimistic and cannot be silently undone.</span></div><footer><button type="button" className="accountant-secondary-button" onClick={() => setPaymentDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!reference.trim()}>Confirm received</button></footer></form>
      </Modal>}

      {selectedStudent && <Modal title={`${selectedStudent} · Billing history`} description="Complete current and past billing information for this student." onClose={() => setSelectedStudent(null)}>
        <div className="accountant-history">
          <section className="accountant-history-summary" aria-label="Student billing summary"><div><small>Total billed</small><strong>{money(studentHistory.reduce((sum, invoice) => sum + invoice.gross, 0))}</strong></div><div><small>Total discounts</small><strong>{money(studentHistory.reduce((sum, invoice) => sum + invoice.discount, 0))}</strong></div><div><small>Outstanding</small><strong>{money(studentHistory.filter((invoice) => invoice.status !== 'PAID').reduce((sum, invoice) => sum + invoice.gross - invoice.discount, 0))}</strong></div></section>
          <div className="accountant-table-scroll"><table className="accountant-table accountant-history-table"><thead><tr><th>Invoice</th><th>Billing cycle</th><th>Gross</th><th>Discount</th><th>Payable</th><th>Payment details</th><th>Status</th></tr></thead><tbody>{studentHistory.map((invoice) => <tr key={invoice.id}><td className="is-reference">{invoice.id}</td><td>{invoice.cycle}</td><td className="is-amount">{money(invoice.gross)}</td><td>{invoice.discount ? <><span className="is-discount">− {money(invoice.discount)}</span><small>{invoice.discountType}</small></> : '—'}</td><td className="is-amount">{money(invoice.gross - invoice.discount)}</td><td>{invoice.paymentMethod ?? 'Not paid'}{invoice.reference && <small>{invoice.reference}</small>}</td><td><StatusPill status={invoice.status} /></td></tr>)}</tbody></table></div>
          <footer><button type="button" className="accountant-secondary-button" onClick={() => setSelectedStudent(null)}>Close</button></footer>
        </div>
      </Modal>}

      {discountDialog && <Modal title="Apply invoice discount" description={`Use a Tenant Admin-approved discount type for ${discountDialog.student}.`} onClose={() => setDiscountDialog(null)}>
        <form className="accountant-form" onSubmit={applyDiscount}><label htmlFor="discount-type">Discount type<select id="discount-type" value={discountType} onChange={(event) => setDiscountType(event.target.value)}><option>Flat</option><option>Percentage</option><option>Sibling</option><option>Scholarship</option></select><small>Only configured policy types are available.</small></label><label htmlFor="discount-value">{discountType === 'Percentage' ? 'Percentage' : 'Amount (NPR)'} <span aria-hidden="true">*</span><input id="discount-value" type="text" inputMode="decimal" autoComplete="off" value={discountValue} onChange={(event) => setDiscountValue(event.target.value.replace(/[^\d.]/g, ''))} required /><small>{discountType === 'Percentage' ? 'Policy allows up to 20%.' : `Cannot exceed ${money(discountDialog.gross)}.`}</small></label><footer><button type="button" className="accountant-secondary-button" onClick={() => setDiscountDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={!discountValue}>Apply discount</button></footer></form>
      </Modal>}
    </PageShell>
  );
}
