import { useState } from 'react';
import { PageShell } from '../components/patterns/PageShell';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

interface Transaction {
  id: string;
  name: string;
  course: string;
  amount: string;
  status: 'success' | 'warning' | 'info';
  type: string;
  date: string;
}

export function StaffFinancePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'INV-2026-089', name: 'Aarav Sharma', course: 'Grade 10 Science', amount: 'NPR 4,500', status: 'success', type: 'NepalPay QR', date: '2026-07-20 11:30 AM' },
    { id: 'INV-2026-088', name: 'Mira Karki', course: 'Grade 8 Math', amount: 'NPR 3,200', status: 'success', type: 'Cash Receipt', date: '2026-07-20 10:15 AM' },
    { id: 'INV-2026-087', name: 'Rohan Thapa', course: 'Computer Science', amount: 'NPR 2,800', status: 'warning', type: 'Pending Bank Wire', date: '2026-07-19 04:45 PM' },
  ]);

  const [receiptModal, setReceiptModal] = useState<Transaction | null>(null);
  const [showNewCashModal, setShowNewCashModal] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [amount, setAmount] = useState('');
  const [course, setCourse] = useState('Grade 10 Science');

  const handleRecordCash = () => {
    if (!studentName.trim() || !amount.trim()) {
      showToast('Please enter student name and amount.', 'error');
      return;
    }
    const newTx: Transaction = {
      id: `INV-2026-0${90 + transactions.length}`,
      name: studentName.trim(),
      course,
      amount: `NPR ${Number(amount).toLocaleString()}`,
      status: 'success',
      type: 'Cash Receipt',
      date: 'Just Now',
    };
    setTransactions([newTx, ...transactions]);
    setShowNewCashModal(false);
    setStudentName('');
    setAmount('');
    showToast('Counter cash payment recorded & receipt printed.', 'success');
  };

  return (
    <PageShell
      title="Accountant Finance Panel"
      subtitle="Manage student fee collections, cash transactions, and daily revenue reconciliation."
      userRole={user?.role ?? 'ACCOUNTANT'}
      userName={user?.name ?? 'Accountant'}
      onLogout={logout}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', flex: 1, marginRight: '16px' }}>
          <KPICard title="Today's Collections" value="NPR 52,200" delta="+15% vs yesterday" />
          <KPICard title="Pending Invoices" value="41" delta="NPR 138,800 total" />
          <KPICard title="Petty Cash Balance" value="NPR 12,400" delta="5 receipts pending" />
        </div>
        <Button onClick={() => setShowNewCashModal(true)} style={{ height: '48px' }}>
          <span className="material-symbols-outlined" style={{ marginRight: '6px' }}>payments</span>
          Record Cash Payment
        </Button>
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--color-bg)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Recent Fee Transactions</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted-foreground)' }}>
              <th style={{ padding: '12px' }}>Invoice ID</th>
              <th style={{ padding: '12px' }}>Student Name</th>
              <th style={{ padding: '12px' }}>Course / Class</th>
              <th style={{ padding: '12px' }}>Amount</th>
              <th style={{ padding: '12px' }}>Payment Type</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '14px' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{tx.id}</td>
                <td style={{ padding: '12px' }}>{tx.name}</td>
                <td style={{ padding: '12px' }}>{tx.course}</td>
                <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{tx.amount}</td>
                <td style={{ padding: '12px' }}>{tx.type}</td>
                <td style={{ padding: '12px' }}>
                  <StatusBadge status={tx.status} />
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <Button variant="secondary" onClick={() => setReceiptModal(tx)} style={{ minHeight: '32px', height: '32px', padding: '4px 12px', fontSize: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>print</span>
                    Receipt
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Cash Payment Modal */}
      {showNewCashModal ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setShowNewCashModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#FFF', padding: '28px', borderRadius: '20px', zIndex: 1100, width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Record Counter Cash Payment</h3>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Student Name *</label>
                <input type="text" className="auth-input" placeholder="e.g. Aarav Karki" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Amount (NPR) *</label>
                <input type="number" className="auth-input" placeholder="e.g. 4500" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Course / Grade</label>
                <select className="auth-input" value={course} onChange={(e) => setCourse(e.target.value)}>
                  <option value="Grade 10 Science">Grade 10 Science</option>
                  <option value="Grade 8 Math">Grade 8 Math</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowNewCashModal(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button onClick={handleRecordCash} style={{ flex: 1 }}>Submit &amp; Print</Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Printable Receipt Modal */}
      {receiptModal ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setReceiptModal(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#FFF', padding: '32px', borderRadius: '20px', zIndex: 1100, width: '90%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>TMS OFFICIAL RECEIPT</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted-foreground)' }}>Baneshwor Main Center, Kathmandu</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-accent)' }}>receipt</span>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '13px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Receipt No:</span> <strong>{receiptModal.id}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Student Name:</span> <strong>{receiptModal.name}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Course:</span> <strong>{receiptModal.course}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Method:</span> <strong>{receiptModal.type}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date &amp; Time:</span> <strong>{receiptModal.date}</strong></div>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--color-border)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                <span>Amount Paid:</span> <span>{receiptModal.amount}</span>
              </div>
            </div>

            <Button onClick={() => { showToast('Receipt sent to printer!', 'success'); setReceiptModal(null); }} style={{ width: '100%' }}>
              <span className="material-symbols-outlined" style={{ marginRight: '6px' }}>print</span>
              Print Official Receipt
            </Button>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
