import { useState } from 'react';
import { PageShell } from '../components/patterns/PageShell';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  time: string;
  status: 'info' | 'success' | 'warning';
}

export function StaffReceptionPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [visitors, setVisitors] = useState<Visitor[]>([
    { id: '1', name: 'Hari Prasad Sharma', phone: '9841234567', purpose: 'Student Admission Inquiry', time: '10:15 AM', status: 'info' },
    { id: '2', name: 'Sita Devi Karki', phone: '9801987654', purpose: 'Parent Meeting with Teacher', time: '11:00 AM', status: 'success' },
    { id: '3', name: 'Ram Kumar KC', phone: '9851002233', purpose: 'Fee Payment Inquiry', time: '11:30 AM', status: 'warning' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('Admission Inquiry');

  const handleAddVisitor = () => {
    if (!visitorName.trim() || !phone.trim()) {
      showToast('Please provide visitor name and phone number.', 'error');
      return;
    }
    const newVisitor: Visitor = {
      id: String(Date.now()),
      name: visitorName.trim(),
      phone: phone.trim(),
      purpose,
      time: 'Just Now',
      status: 'info',
    };
    setVisitors([newVisitor, ...visitors]);
    setShowModal(false);
    setVisitorName('');
    setPhone('');
    showToast('Visitor check-in logged successfully.', 'success');
  };

  return (
    <PageShell
      title="Reception Dashboard"
      subtitle="Visitor log, inquiry management, and front-desk student check-ins."
      userRole={user?.role ?? 'RECEPTIONIST'}
      userName={user?.name ?? 'Receptionist'}
      onLogout={logout}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', flex: 1, marginRight: '16px' }}>
          <KPICard title="Visitors Today" value={String(visitors.length + 15)} delta="5 pending inquiries" />
          <KPICard title="Active Classrooms" value="12 / 14" delta="2 rooms free for study" />
          <KPICard title="Walk-in Admissions" value="4" delta="Today's total" />
        </div>
        <Button onClick={() => setShowModal(true)} style={{ height: '48px' }}>
          <span className="material-symbols-outlined" style={{ marginRight: '6px' }}>person_add</span>
          Check-in New Visitor
        </Button>
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--color-bg)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Front-Desk Visitor Log</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted-foreground)' }}>
              <th style={{ padding: '12px' }}>Visitor Name</th>
              <th style={{ padding: '12px' }}>Contact Phone</th>
              <th style={{ padding: '12px' }}>Purpose of Visit</th>
              <th style={{ padding: '12px' }}>Check-in Time</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '14px' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{v.name}</td>
                <td style={{ padding: '12px' }}>{v.phone}</td>
                <td style={{ padding: '12px' }}>{v.purpose}</td>
                <td style={{ padding: '12px' }}>{v.time}</td>
                <td style={{ padding: '12px' }}>
                  <StatusBadge status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Check-in Modal */}
      {showModal ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setShowModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#FFF', padding: '28px', borderRadius: '20px', zIndex: 1100, width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Visitor Check-in</h3>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" className="auth-input" placeholder="e.g. Ramesh Thapa" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Phone Number *</label>
                <input type="tel" className="auth-input" placeholder="e.g. 9841000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Purpose of Visit</label>
                <select className="auth-input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="Admission Inquiry">Admission Inquiry</option>
                  <option value="Parent Teacher Meeting">Parent Teacher Meeting</option>
                  <option value="Fee Payment Inquiry">Fee Payment Inquiry</option>
                  <option value="Vendor / Delivery">Vendor / Delivery</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button onClick={handleAddVisitor} style={{ flex: 1 }}>Complete Check-in</Button>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
