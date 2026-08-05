import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TimetableList, type TimetableListItem } from '../components/ui/TimetableList';
import { api } from '../services/api';

interface PettyCashRequest {
  id: string;
  amount: number;
  purpose: string;
  status: 'PENDING' | 'APPROVED_LEVEL1';
  branch?: string;
}

interface ResourceLogItem {
  id: string;
  label: string;
  detail: string;
  state: 'Logged' | 'Pending' | 'Overdue';
}

const todaysTimetable: TimetableListItem[] = [
  { id: 'tt-1', time: '07:30', title: 'Grade 8 Mathematics', room: 'Room 204', detail: 'Rina Karki', status: 'Scheduled', statusVariant: 'info' },
  { id: 'tt-2', time: '09:00', title: 'Science Lab Batch A', room: 'Lab 2', detail: 'Sanjay Rai', status: 'In Progress', statusVariant: 'gold' },
  { id: 'tt-3', time: '11:15', title: 'English Foundation', room: 'Room 112', detail: 'Sarita Limbu', status: 'Completed', statusVariant: 'success' },
  { id: 'tt-4', time: '13:30', title: 'Bridge Course Session', room: 'Room 301', detail: 'Aakash Bista', status: 'Cancelled', statusVariant: 'error' },
];

const resourceLogItems: ResourceLogItem[] = [
  { id: 'log-1', label: 'Classroom Sanitization', detail: 'All classrooms before first bell', state: 'Logged' },
  { id: 'log-2', label: 'Generator Fuel Check', detail: 'Utility room checklist', state: 'Pending' },
  { id: 'log-3', label: 'Science Lab Closure', detail: 'End-of-day signoff', state: 'Overdue' },
  { id: 'log-4', label: 'Library Asset Register', detail: 'New shipment intake', state: 'Logged' },
];

function getPettyCashVariant(status: PettyCashRequest['status']) {
  return status === 'PENDING' ? 'warning' : 'success';
}

function getIndicatorColor(state: ResourceLogItem['state']) {
  if (state === 'Logged') {
    return 'var(--color-success)';
  }
  if (state === 'Pending') {
    return 'var(--color-warning)';
  }
  return 'var(--color-error)';
}

export function BranchAdminDashboard() {
  const [pettyCashRequests, setPettyCashRequests] = useState<PettyCashRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBranchData = async () => {
    setIsLoading(true);

    try {
      const pettyCash = await api.finances.getPettyCash() as PettyCashRequest[];
      setPettyCashRequests(pettyCash);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('API error, using local mocks:', message);
      setPettyCashRequests([
        { id: 'pc-101', amount: 4500, purpose: 'Classroom Whiteboards', status: 'PENDING', branch: 'Baneshwor Branch' },
        { id: 'pc-102', amount: 1500, purpose: 'Science Lab Beakers', status: 'PENDING', branch: 'Baneshwor Branch' },
      ]);
    } finally {
      window.setTimeout(() => setIsLoading(false), 700);
    }
  };

  useEffect(() => {
    void loadBranchData();
  }, []);

  const handleL1Approve = async (id: string) => {
    try {
      await api.finances.approvePettyCash(id, 'APPROVE_L1');
      await loadBranchData();
    } catch {
      setPettyCashRequests((previous) =>
        previous.map((request) => (request.id === id ? { ...request, status: 'APPROVED_LEVEL1' } : request))
      );
    }
  };

  const navigate = useNavigate();

  const QuickAccessItem = ({ icon, label, path }: { icon: string, label: string, path: string }) => (
    <div 
      onClick={() => navigate(path)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#F8FAFC' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-primary)' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', textAlign: 'center' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card hoverable={false} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Baneshwor Branch Control Panel</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>Attendance, timetable, fee, and operations status for today.</p>
          </div>
          <Button variant="outline" onClick={() => void loadBranchData()} disabled={isLoading} style={{ height: '40px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Sync Branch
          </Button>
        </div>
      </Card>

      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '16px' }}>Quick Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
          <QuickAccessItem icon="groups" label="Students" path="/branch/students" />
          <QuickAccessItem icon="badge" label="Teachers" path="/branch/teachers" />
          <QuickAccessItem icon="event_available" label="Attendance" path="/branch/attendance" />
          <QuickAccessItem icon="assignment" label="Homework" path="/branch/homework" />
          <QuickAccessItem icon="analytics" label="Results" path="/branch/results" />
          <QuickAccessItem icon="payments" label="Fee & Billing" path="/branch/fees" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <Card hoverable={false} style={{ padding: '22px', minHeight: '166px' }}>
          <p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Teacher Attendance Today</p>
          <ProgressRing percent={92} color="var(--color-accent)" label="Present" loading={isLoading} />
        </Card>
        <Card hoverable={false} style={{ padding: '22px', minHeight: '166px' }}>
          <p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Student Attendance Today</p>
          <ProgressRing percent={87} color="var(--color-primary)" label="Present" loading={isLoading} />
        </Card>
        <KPICard title="Blocked Students" value="18" delta="3 overrides today" icon="block" loading={isLoading} accentColor="var(--color-warning)" />
        <KPICard title="Pending Fee Invoices" value="12" delta="₹28,400 outstanding" icon="receipt_long" loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Today's Timetable</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Time-ordered classroom activity across the branch.</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/branch/timetables')} style={{ padding: '8px', minHeight: 'unset' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
            </Button>
          </div>
          <TimetableList items={todaysTimetable} />
        </Card>

        <Card hoverable={false}>
          <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Resource Log Status</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Daily operational checklist with log health indicators.</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/branch/resource-logs')} style={{ padding: '8px', minHeight: 'unset' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resourceLogItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF' }}>
                <div>
                  <div style={{ color: 'var(--color-text)', fontSize: '14px', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px' }}>{item.detail}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Array.from({ length: 3 }, (_, index) => (
                      <span key={`${item.id}-${index}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: getIndicatorColor(item.state), opacity: 1 - index * 0.2 }} />
                    ))}
                  </div>
                  <StatusBadge variant={item.state === 'Logged' ? 'success' : item.state === 'Pending' ? 'warning' : 'error'}>{item.state}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Petty Cash Level 1 Approvals Queue</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Existing finance workflow preserved.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusBadge variant="info">{pettyCashRequests.length} requests</StatusBadge>
            <Button variant="ghost" onClick={() => navigate('/branch/petty-cash')} style={{ padding: '8px', minHeight: 'unset' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pettyCashRequests.length === 0 ? (
            <p style={{ color: 'rgba(44, 62, 80, 0.64)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No active petty cash requests.</p>
          ) : (
            pettyCashRequests.map((request) => (
              <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>{request.purpose}</p>
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(44, 62, 80, 0.68)' }}>ID: {request.id} · Amount: NPR {request.amount.toLocaleString()} · Branch: {request.branch ?? 'Baneshwor'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge variant={getPettyCashVariant(request.status)}>{request.status}</StatusBadge>
                  {request.status === 'PENDING' ? (
                    <Button variant="outline" onClick={() => void handleL1Approve(request.id)} style={{ minHeight: '36px', height: '36px', padding: '8px 16px', borderColor: 'rgba(21, 96, 189, 0.18)' }}>
                      Approve L1
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
