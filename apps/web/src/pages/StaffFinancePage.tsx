import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/patterns/PageShell';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api, type AccountantWorkspace } from '../services/api';
import './staffFinance.css';

type Tab = 'overview' | 'petty-cash' | 'billing' | 'reports';
type PettyCash = AccountantWorkspace['pettyCash'][number];
type Invoice = AccountantWorkspace['invoices'][number];
type CashDialog = 'new' | PettyCash | null;

const accountantNavItems = [
  { section: 'FINANCE' as const, label: 'Overview', icon: 'space_dashboard', path: '/staff/finance#overview' },
  { section: 'FINANCE' as const, label: 'Petty cash', icon: 'account_balance_wallet', path: '/staff/finance#petty-cash' },
  { section: 'FINANCE' as const, label: 'Billing & invoices', icon: 'receipt_long', path: '/staff/finance#billing' },
  { section: 'FINANCE' as const, label: 'Reports', icon: 'query_stats', path: '/staff/finance#reports' },
];

const money = (value: number) => `NPR ${Number(value || 0).toLocaleString('en-NP')}`;
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-NP', { dateStyle: 'medium' }).format(new Date(value));
const cycleLabel = (invoice: Invoice) => `${dateLabel(invoice.billingCycleStart)} – ${dateLabel(invoice.billingCycleEnd)}`;
const lastAction = (item: PettyCash) => item.approvalChain.at(-1);
const needsRevision = (item: PettyCash) => item.status === 'PENDING' && lastAction(item)?.action === 'REVISION';
const cashStatusLabel = (item: PettyCash) => needsRevision(item) ? 'Revision requested' : ({
  PENDING: 'Awaiting Level 1',
  APPROVED_LEVEL1: 'Awaiting Level 2',
  REJECTED: 'Rejected',
  RELEASED: 'Awaiting receipt',
  RECEIPT_SUBMITTED: 'Receipt under review',
  CLOSED: 'Closed',
} as const)[item.status];
const invoiceStatus = (invoice: Invoice) => invoice.status === 'PAID' ? 'Paid' : invoice.overdue ? 'Overdue' : 'Due';
const statusTone = (label: string) => {
  if (label === 'Paid' || label === 'Closed') return 'success';
  if (label === 'Overdue' || label === 'Rejected') return 'error';
  if (label === 'Revision requested') return 'warning';
  if (label.includes('receipt')) return 'info';
  return 'neutral';
};

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

function StatusPill({ label }: { label: string }) {
  return <span className={`accountant-status is-${statusTone(label)}`}><span aria-hidden="true" />{label}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="accountant-empty"><Icon name="inbox" /><strong>{title}</strong><p>{description}</p></div>;
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
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
  return <div className="accountant-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={modalRef} className="accountant-modal" role="dialog" aria-modal="true" aria-labelledby="accountant-modal-title" aria-describedby="accountant-modal-description" tabIndex={-1}>
      <header><div><h2 id="accountant-modal-title">{title}</h2><p id="accountant-modal-description">{description}</p></div><button type="button" className="accountant-icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></header>
      {children}
    </div>
  </div>;
}

export function StaffFinancePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [workspace, setWorkspace] = useState<AccountantWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cashDialog, setCashDialog] = useState<CashDialog>(null);
  const [receiptDialog, setReceiptDialog] = useState<PettyCash | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null);
  const [selectedCash, setSelectedCash] = useState<PettyCash | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [reference, setReference] = useState('');
  const [query, setQuery] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.finances.getAccountantWorkspace();
      setWorkspace(data);
      setBranchId((current) => current || data.branches[0]?.id || '');
    } catch (error) {
      setWorkspace(null);
      setLoadError(error instanceof Error ? error.message : 'Unable to load branch finance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => {
    const section = location.hash.slice(1);
    if (['overview', 'petty-cash', 'billing', 'reports'].includes(section)) setTab(section as Tab);
  }, [location.hash]);

  const selectedStudentInvoices = useMemo(
    () => workspace?.invoices.filter((invoice) => invoice.studentId === selectedStudentId) ?? [],
    [selectedStudentId, workspace],
  );
  const filteredInvoices = useMemo(() => (workspace?.invoices ?? []).filter((invoice) => {
    const label = invoiceStatus(invoice).toUpperCase();
    const matchesText = `${invoice.id} ${invoice.studentName} ${invoice.branchName ?? ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (invoiceFilter === 'ALL' || label === invoiceFilter);
  }), [invoiceFilter, query, workspace]);
  const cap = workspace?.pettyCashCap ?? 0;
  const totalCap = cap * (workspace?.branches.length ?? 0);
  const committed = workspace?.pettyCashUsage.reduce((sum, item) => sum + item.committed, 0) ?? 0;
  const remaining = Math.max(0, totalCap - committed);
  const selectedBranchCommitted = workspace?.pettyCashUsage.find((item) => item.branchId === branchId)?.committed ?? 0;
  const selectedBranchRemaining = Math.max(0, cap - selectedBranchCommitted);
  const requestBudget = selectedBranchRemaining + (cashDialog && cashDialog !== 'new' ? cashDialog.amount : 0);
  const branchLabel = !workspace?.branches.length ? 'No assigned finance branch' : workspace.branches.length === 1 ? workspace.branches[0].name : `${workspace.branches.length} assigned branches`;

  const openCashDialog = (item: 'new' | PettyCash) => {
    setCashDialog(item);
    setBranchId(item === 'new' ? workspace?.branches[0]?.id ?? '' : item.branchId);
    setPurpose(item === 'new' ? '' : item.purpose);
    setAmount(item === 'new' ? '' : String(item.amount));
  };

  const submitCash = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!branchId || !purpose.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setSubmitting(true);
    try {
      const result = cashDialog === 'new'
        ? await api.finances.requestPettyCash({ branchId, purpose: purpose.trim(), amount: parsedAmount })
        : await api.finances.resubmitPettyCash(cashDialog!.id, { purpose: purpose.trim(), amount: parsedAmount });
      showToast(result.message, 'success');
      setCashDialog(null);
      await loadWorkspace();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Petty cash request failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    if (!receiptDialog || !/^https?:\/\/\S+$/i.test(receiptUrl.trim())) return;
    setSubmitting(true);
    try {
      const result = await api.finances.submitPettyCashReceipt(receiptDialog.id, receiptUrl.trim());
      showToast(result.message, 'success');
      setReceiptDialog(null);
      setReceiptUrl('');
      await loadWorkspace();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Receipt submission failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const confirmPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentDialog || !reference.trim()) return;
    setSubmitting(true);
    try {
      const result = await api.finances.payInvoice(paymentDialog.id, reference.trim());
      showToast(result.message, 'success');
      setPaymentDialog(null);
      setReference('');
      await loadWorkspace();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Payment confirmation failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const renderCashTable = (items: PettyCash[]) => items.length === 0
    ? <EmptyState title="No petty-cash records" description="New requests will appear here after they are stored." />
    : <div className="accountant-table-scroll"><table className="accountant-table"><thead><tr><th>Request</th><th>Branch</th><th>Purpose</th><th>Amount</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td className="is-reference"><button type="button" className="accountant-record-link" onClick={() => setSelectedCash(item)}>{item.id.slice(0, 8)}</button></td><td>{item.branchName}</td><td><button type="button" className="accountant-record-purpose" onClick={() => setSelectedCash(item)}>{item.purpose}</button>{needsRevision(item) && lastAction(item)?.comment && <small>{lastAction(item)?.comment}</small>}</td><td className="is-amount">{money(item.amount)}</td><td>{dateLabel(item.createdAt)}</td><td><StatusPill label={cashStatusLabel(item)} /></td><td className="is-actions">
        {needsRevision(item) && <button type="button" className="accountant-text-button" onClick={() => openCashDialog(item)}><Icon name="edit" />Revise</button>}
        {item.status === 'RELEASED' && <button type="button" className="accountant-text-button" onClick={() => { setReceiptDialog(item); setReceiptUrl(''); }}><Icon name="link" />Add receipt link</button>}
        {!needsRevision(item) && item.status !== 'RELEASED' && <button type="button" className="accountant-icon-button" aria-label={`View details for ${item.id}`} onClick={() => setSelectedCash(item)}><Icon name="chevron_right" /></button>}
      </td></tr>)}
    </tbody></table></div>;

  const body = loading ? <section className="accountant-panel"><EmptyState title="Loading finance workspace" description="Fetching current branch records and permissions." /></section>
    : loadError ? <section className="accountant-panel"><div className="accountant-empty"><Icon name="error" /><strong>Finance workspace unavailable</strong><p>{loadError}</p><button type="button" className="accountant-secondary-button" onClick={() => void loadWorkspace()}>Try again</button></div></section>
    : !workspace ? null : <>
      <section className="accountant-hero"><div><span className="accountant-eyebrow"><Icon name="account_balance_wallet" />{branchLabel}</span><h1>Finance control centre</h1><p>Reconcile branch collections and move petty cash through the recorded approval workflow.</p></div><button type="button" className="accountant-primary-button" disabled={!workspace.branches.length} onClick={() => openCashDialog('new')}><Icon name="add" />New petty cash request</button></section>

      {tab === 'overview' && <><section className="accountant-kpis" aria-label="Finance summary">
        <article><span className="is-success"><Icon name="payments" /></span><div><p>Collected</p><strong>{money(workspace.summary.collected)}</strong><small>Across permitted invoices</small></div></article>
        <article><span className="is-warning"><Icon name="pending_actions" /></span><div><p>Outstanding</p><strong>{money(workspace.summary.outstanding)}</strong><small>{money(workspace.summary.overdueAmount)} overdue</small></div></article>
        <article><span className="is-info"><Icon name="account_balance_wallet" /></span><div><p>Petty cash available</p><strong>{money(remaining)}</strong><small>{money(cap)} per branch this month</small></div></article>
        <article><span className="is-error"><Icon name="receipt" /></span><div><p>Open expense records</p><strong>{workspace.summary.openPettyCash}</strong><small>{workspace.summary.awaitingReceipt} awaiting receipt</small></div></article>
      </section><section className="accountant-panel"><header><div><h2>Recent petty cash activity</h2><p>Latest persisted records in your assigned scope.</p></div><button type="button" className="accountant-text-button" onClick={() => navigate('/staff/finance#petty-cash')}>View all<Icon name="arrow_forward" /></button></header>{renderCashTable(workspace.pettyCash.slice(0, 5))}</section></>}

      {tab === 'petty-cash' && <><section className="accountant-section-head"><div><span className="accountant-eyebrow">Controlled disbursements</span><h2>Petty cash requests</h2><p>Requests remain open until an administrator verifies the receipt and closes the record.</p></div><button type="button" className="accountant-primary-button" disabled={!workspace.branches.length} onClick={() => openCashDialog('new')}><Icon name="add" />New request</button></section><section className="accountant-cap-strip"><div><Icon name="policy" /><span>Monthly cap per branch</span><strong>{money(cap)}</strong></div><div><span>Committed in scope</span><strong>{money(committed)}</strong></div><div><span>Available in scope</span><strong>{money(remaining)}</strong></div><small>Rejected requests do not consume the monthly cap.</small></section><section className="accountant-panel">{renderCashTable(workspace.pettyCash)}</section></>}

      {tab === 'billing' && <><section className="accountant-section-head"><div><span className="accountant-eyebrow">Branch-scoped billing</span><h2>Billing & invoices</h2><p>Review persisted invoices and record a verified manual payment reference.</p></div></section><section className="accountant-toolbar"><label className="accountant-search" htmlFor="invoice-search"><span>Search invoices</span><div className="accountant-search-control"><Icon name="search" /><input id="invoice-search" type="search" autoComplete="off" placeholder="Student, branch, or invoice ID" value={query} onChange={(event) => setQuery(event.target.value)} /></div></label><label className="accountant-filter" htmlFor="invoice-status"><span>Payment status</span><select id="invoice-status" value={invoiceFilter} onChange={(event) => setInvoiceFilter(event.target.value)}><option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="DUE">Due</option><option value="OVERDUE">Overdue</option></select></label></section><section className="accountant-panel">
        {filteredInvoices.length === 0 ? <EmptyState title="No matching invoices" description={workspace.invoices.length ? 'Clear the search or choose another payment status.' : 'Invoices will appear after billing records are generated.'} /> : <div className="accountant-table-scroll"><table className="accountant-table accountant-invoice-table"><thead><tr><th>Invoice</th><th>Student</th><th>Branch</th><th>Cycle</th><th>Amount</th><th>Discount</th><th>Net payable</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td className="is-reference">{invoice.id.slice(0, 8)}</td><td><button type="button" className="accountant-student-link" onClick={() => setSelectedStudentId(invoice.studentId)}>{invoice.studentName}</button></td><td>{invoice.branchName ?? 'Unassigned'}</td><td>{cycleLabel(invoice)}</td><td className="is-amount">{money(invoice.amount)}</td><td>{invoice.discount ? money(invoice.discount) : '—'}</td><td className="is-amount">{money(invoice.netPayable)}</td><td><StatusPill label={invoiceStatus(invoice)} />{invoice.transactionId && <small>{invoice.transactionId}</small>}</td><td className="is-actions">{invoice.status !== 'PAID' && <button type="button" className="accountant-text-button is-emphasis" onClick={() => { setPaymentDialog(invoice); setReference(''); }}>Record payment</button>}</td></tr>)}</tbody></table></div>}
      </section></>}

      {tab === 'reports' && <><section className="accountant-section-head"><div><span className="accountant-eyebrow">Scoped reconciliation</span><h2>Finance report summary</h2><p>Figures include only records permitted by your signed branch assignments.</p></div></section><section className="accountant-grid"><article className="accountant-panel accountant-report-card"><span className="is-info"><Icon name="menu_book" /></span><div><h2>Ledger activity</h2><p>Persisted paid invoices, expenses, and settled payroll entries.</p><small>{workspace.reports.ledgerEntryCount} entries in scope</small></div></article><article className="accountant-panel accountant-report-card"><span className="is-warning"><Icon name="receipt_long" /></span><div><h2>Expense records</h2><p>Branch expense records included in the current report scope.</p><small>{workspace.reports.expenseCount} records</small></div></article></section><section className="accountant-panel accountant-readonly"><header><div><h2>Scoped P&amp;L</h2><p>Read-only summary calculated from live permitted records.</p></div><span className="accountant-locked"><Icon name="visibility" />Read only</span></header><dl><div><dt>Revenue</dt><dd>{money(workspace.reports.revenue)}</dd></div><div><dt>Operating costs</dt><dd>{money(workspace.reports.operatingCosts)}</dd></div><div><dt>Net margin</dt><dd className={workspace.reports.netMargin >= 0 ? 'is-positive' : ''}>{money(workspace.reports.netMargin)}</dd></div></dl></section></>}
    </>;

  return <PageShell title="Accountant Workspace" subtitle="Branch finance, billing and controlled petty cash." userRole={user?.role ?? 'ACCOUNTANT'} userName={user?.name ?? 'Signed-in user'} onLogout={logout} navItems={accountantNavItems}><div className="accountant-page">{body}</div>
    {cashDialog && <Modal title={cashDialog === 'new' ? 'New petty cash request' : `Revise ${cashDialog.id.slice(0, 8)}`} description="This writes to the two-level approval record; requesters cannot approve their own request." onClose={() => setCashDialog(null)}><form className="accountant-form" onSubmit={submitCash}><label htmlFor="cash-branch">Branch <span aria-hidden="true">*</span><select id="cash-branch" value={branchId} disabled={cashDialog !== 'new'} onChange={(event) => setBranchId(event.target.value)} required>{workspace?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><small>{money(requestBudget)} is available for this request within the branch's monthly cap.</small></label><label htmlFor="cash-amount">Amount (NPR) <span aria-hidden="true">*</span><input id="cash-amount" type="number" min="0.01" max={requestBudget || 0.01} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><label htmlFor="cash-purpose">Purpose <span aria-hidden="true">*</span><textarea id="cash-purpose" maxLength={1000} rows={4} value={purpose} onChange={(event) => setPurpose(event.target.value)} required /></label><footer><button type="button" className="accountant-secondary-button" onClick={() => setCashDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={submitting || !branchId || !purpose.trim() || Number(amount) <= 0 || Number(amount) > requestBudget}>{submitting ? 'Saving…' : cashDialog === 'new' ? 'Submit request' : 'Resubmit revision'}</button></footer></form></Modal>}
    {receiptDialog && <Modal title={`Submit receipt · ${receiptDialog.id.slice(0, 8)}`} description="Use a durable HTTPS link from approved document storage. The record stays open until administrator verification." onClose={() => setReceiptDialog(null)}><form className="accountant-form" onSubmit={submitReceipt}><div className="accountant-receipt-summary"><span><small>Purpose</small><strong>{receiptDialog.purpose}</strong></span><span><small>Released amount</small><strong>{money(receiptDialog.amount)}</strong></span></div><label htmlFor="receipt-url">Receipt URL <span aria-hidden="true">*</span><input id="receipt-url" type="url" maxLength={2000} placeholder="https://…" value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} required /><small>Direct uploads will be enabled with the production object-storage contract.</small></label><footer><button type="button" className="accountant-secondary-button" onClick={() => setReceiptDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={submitting || !/^https?:\/\/\S+$/i.test(receiptUrl.trim())}>{submitting ? 'Submitting…' : 'Submit receipt link'}</button></footer></form></Modal>}
    {paymentDialog && <Modal title="Record payment received" description={`Manual payment confirmation for ${paymentDialog.id.slice(0, 8)}.`} onClose={() => setPaymentDialog(null)}><form className="accountant-form" onSubmit={confirmPayment}><div className="accountant-receipt-summary"><span><small>Student</small><strong>{paymentDialog.studentName}</strong></span><span><small>Amount</small><strong>{money(paymentDialog.netPayable)}</strong></span></div><label htmlFor="payment-reference">Reference or receipt number <span aria-hidden="true">*</span><input id="payment-reference" type="text" maxLength={128} pattern="[A-Za-z0-9._/\-]+" autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} required /><small>The API stores this unique reference in the invoice audit record.</small></label><div className="accountant-warning-note"><Icon name="warning" /><span>Confirm only after matching the amount and payer in the bank or cash record.</span></div><footer><button type="button" className="accountant-secondary-button" onClick={() => setPaymentDialog(null)}>Cancel</button><button type="submit" className="accountant-primary-button" disabled={submitting || !reference.trim()}>{submitting ? 'Confirming…' : 'Confirm received'}</button></footer></form></Modal>}
    {selectedCash && <Modal title={`Petty cash request · ${selectedCash.id.slice(0, 8)}`} description="Persisted request, approval, and receipt details." onClose={() => setSelectedCash(null)}><div className="accountant-cash-details"><section className="accountant-cash-summary"><div><small>Status</small><StatusPill label={cashStatusLabel(selectedCash)} /></div><div><small>Submitted</small><strong>{dateLabel(selectedCash.createdAt)}</strong></div><div><small>Total requested</small><strong>{money(selectedCash.amount)}</strong></div></section><section className="accountant-detail-section"><h3>Description</h3><p>{selectedCash.purpose}</p></section><section className="accountant-detail-section"><h3>Approval history</h3>{selectedCash.approvalChain.length ? <ol className="accountant-approval-steps">{selectedCash.approvalChain.map((entry, index) => <li className="is-complete" key={`${entry.timestamp}-${index}`}><Icon name="check_circle" /><span><strong>{entry.action ?? 'Recorded action'}</strong><small>{entry.role ?? 'System'}{entry.timestamp ? ` · ${dateLabel(entry.timestamp)}` : ''}{entry.comment ? ` · ${entry.comment}` : ''}</small></span></li>)}</ol> : <p>No approval actions recorded.</p>}</section>{selectedCash.receiptProofUrl && <section className="accountant-detail-section"><h3>Receipt</h3><a href={selectedCash.receiptProofUrl} target="_blank" rel="noreferrer">Open submitted proof</a></section>}<footer><button type="button" className="accountant-secondary-button" onClick={() => setSelectedCash(null)}>Close</button></footer></div></Modal>}
    {selectedStudentId && <Modal title={`${selectedStudentInvoices[0]?.studentName ?? 'Student'} · Billing history`} description="All invoices currently returned in your permitted scope." onClose={() => setSelectedStudentId(null)}><div className="accountant-history"><div className="accountant-table-scroll"><table className="accountant-table accountant-history-table"><thead><tr><th>Invoice</th><th>Cycle</th><th>Payable</th><th>Payment reference</th><th>Status</th></tr></thead><tbody>{selectedStudentInvoices.map((invoice) => <tr key={invoice.id}><td className="is-reference">{invoice.id.slice(0, 8)}</td><td>{cycleLabel(invoice)}</td><td className="is-amount">{money(invoice.netPayable)}</td><td>{invoice.transactionId ?? '—'}</td><td><StatusPill label={invoiceStatus(invoice)} /></td></tr>)}</tbody></table></div><footer><button type="button" className="accountant-secondary-button" onClick={() => setSelectedStudentId(null)}>Close</button></footer></div></Modal>}
  </PageShell>;
}
