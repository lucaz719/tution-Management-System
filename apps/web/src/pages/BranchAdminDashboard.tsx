import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TimetableList, type TimetableListItem } from '../components/ui/TimetableList';
import { useToast } from '../components/ui/Toast';
import { api, type BranchAdminDashboardData } from '../services/api';

const money = (value: number) => `NPR ${Number(value || 0).toLocaleString('en-NP')}`;

function sessionStatus(status: string): Pick<TimetableListItem, 'status' | 'statusVariant'> {
  if (status === 'PRESENT_CONFIRMED') return { status: 'Completed', statusVariant: 'success' };
  if (status === 'PARTIAL_PRESENCE') return { status: 'Partial', statusVariant: 'gold' };
  if (status === 'ABSENT') return { status: 'Absent', statusVariant: 'error' };
  if (status === 'UNSCHEDULED_PRESENCE') return { status: 'Unscheduled', statusVariant: 'warning' };
  return { status: 'Update pending', statusVariant: 'info' };
}

function resourcePresentation(item: BranchAdminDashboardData['resources'][number]) {
  if (item.status === 'COMPLETED') return { label: 'Logged', variant: 'success' as const, color: 'var(--color-success)' };
  if (item.actionRequired) return { label: 'Action required', variant: 'error' as const, color: 'var(--color-error)' };
  return { label: item.status === 'IN_PROGRESS' ? 'In progress' : 'Pending', variant: 'warning' as const, color: 'var(--color-warning)' };
}

function Empty({ children }: { children: string }) {
  return <p style={{ color: 'rgba(44, 62, 80, 0.64)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>{children}</p>;
}

export function BranchAdminDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState<BranchAdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState('');
  const navigate = useNavigate();

  // Mock data for the new widgets
  const activeStudentsByCourse = [
    { course: 'Grade 10 Science', students: 45 },
    { course: 'Grade 10 Math', students: 42 },
    { course: 'Grade 12 Physics', students: 30 },
    { course: 'IELTS Prep', students: 15 },
  ];

  const staffPerformance = [
    { name: 'Sanjay Rai', role: 'Teacher', score: 92 },
    { name: 'Aisha Tamang', role: 'Accountant', score: 88 },
    { name: 'Bikash Thapa', role: 'Admin', score: 95 },
  ];

  const pendingApprovals = [
    { id: 'PC-102', type: 'Petty Cash', desc: 'Office supplies', requester: 'Aisha', status: 'Pending L1' },
    { id: 'LR-50', type: 'Leave', desc: 'Casual Leave (1 day)', requester: 'Sanjay', status: 'Pending' },
    { id: 'EC-05', type: 'Exit Clearance', desc: 'Return of library books', requester: 'Student: Rina', status: 'Pending' }
  ];

  const escalatedTasks = [
    { id: 'MT-01', issue: 'Projector broken in Room 302', duration: 'Overdue by 2 days', assignedTo: 'Maintenance Team' }
  ];

  const loadBranchData = useCallback(async (branchId?: string) => {
    setIsLoading(true);
    setError('');
    try {
      setData(await api.branchAdmin.getDashboard(branchId));
    } catch (loadError: any) {
      // If 404 (no branch assigned) or 403, show demo data so the dashboard still renders
      if (loadError?.status === 404 || loadError?.status === 403) {
        setData({
          branches: [{ id: 'demo', name: 'Demo Branch' }],
          selectedBranch: { id: 'demo', name: 'Demo Branch' },
          generatedAt: new Date().toISOString(),
          metrics: {
            teacherAttendance: { present: 4, total: 6, rate: 67 },
            studentAttendance: { present: 38, total: 45, rate: 84 },
            blockedStudents: 2,
            pendingInvoices: 5,
            outstandingAmount: 25000,
            pendingAppointments: 0,
          },
          timetable: [],
          resources: [],
          pettyCash: [],
          appointments: [],
        });
      } else {
        setData(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this branch dashboard.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadBranchData(); }, [loadBranchData]);

  const timetable = useMemo<TimetableListItem[]>(() => (data?.timetable ?? []).map((item) => ({
    id: item.id,
    time: item.time ? new Intl.DateTimeFormat('en-NP', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.time)) : 'Not checked in',
    title: item.title,
    room: item.room,
    detail: item.detail,
    ...sessionStatus(item.status),
  })), [data]);

  const handleApprove = async (id: string, type: string) => {
    setApprovingId(id);
    try {
      // Mock API call based on type
      await new Promise(resolve => setTimeout(resolve, 800));
      showToast(`${type} approved successfully.`, 'success');
      // In a real app, this would refresh the data
    } catch (approvalError) {
      showToast(approvalError instanceof Error ? approvalError.message : 'Approval failed.', 'error');
    } finally {
      setApprovingId('');
    }
  };

  const QuickAccessItem = ({ icon, label, path }: { icon: string, label: string, path: string }) => (
    <div 
      onClick={() => navigate(path)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#F8FAFC' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-primary)' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', textAlign: 'center' }}>{label}</span>
    </div>
  );

  if (error) {
    return <Card hoverable={false}><Empty>{error}</Empty><div style={{ display: 'flex', justifyContent: 'center' }}><Button variant="outline" onClick={() => void loadBranchData()}>Try again</Button></div></Card>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <Card hoverable={false} style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>{data?.selectedBranch.name ?? 'Branch'} Control Panel</h3>
          <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>Live attendance, timetable, fee, and operations status for today.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
          {data && data.branches.length > 1 && (
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>Branch
              <select value={data.selectedBranch.id} onChange={(event) => void loadBranchData(event.target.value)} disabled={isLoading}>
                {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
          )}
          <Button variant="outline" onClick={() => void loadBranchData(data?.selectedBranch.id)} disabled={isLoading} style={{ height: '40px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Sync Branch
          </Button>
        </div>
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
        <QuickAccessItem icon="event" label="Appointments" path="/branch/appointments" />
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
      <Card hoverable onClick={() => navigate('/branch/attendance')} style={{ padding: '22px', minHeight: '166px', position: 'relative' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '20px', color: 'var(--text-muted)' }}>open_in_new</span>
        <p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Teacher Attendance Today</p>
        <ProgressRing percent={data?.metrics.teacherAttendance.rate ?? 0} color="var(--color-accent)" label={data?.metrics.teacherAttendance.rate === null ? 'No staff' : `${data?.metrics.teacherAttendance.present ?? 0}/${data?.metrics.teacherAttendance.total ?? 0} present`} loading={isLoading} />
      </Card>
      <Card hoverable onClick={() => navigate('/branch/attendance')} style={{ padding: '22px', minHeight: '166px', position: 'relative' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '20px', color: 'var(--text-muted)' }}>open_in_new</span>
        <p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Student Attendance Today</p>
        <ProgressRing percent={data?.metrics.studentAttendance.rate ?? 0} color="var(--color-primary)" label={data?.metrics.studentAttendance.rate === null ? 'No marks' : `${data?.metrics.studentAttendance.present ?? 0}/${data?.metrics.studentAttendance.total ?? 0} present`} loading={isLoading} />
      </Card>
      <KPICard title="Blocked Students" value={String(data?.metrics.blockedStudents ?? 0)} delta="Active blocked enrollments" icon="block" loading={isLoading} accentColor="var(--color-warning)" onClick={() => navigate('/branch/students')}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '20px', color: 'var(--text-muted)' }}>open_in_new</span>
      </KPICard>
      <KPICard title="Pending Fee Invoices" value={String(data?.metrics.pendingInvoices ?? 0)} delta={`${money(data?.metrics.outstandingAmount ?? 0)} outstanding`} icon="receipt_long" loading={isLoading} onClick={() => navigate('/branch/fees')}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '20px', color: 'var(--text-muted)' }}>open_in_new</span>
      </KPICard>
      <KPICard title="Pending Appointments" value={String(data?.metrics.pendingAppointments ?? 0)} delta="Parent requests awaiting your response" icon="event_pending" loading={isLoading} accentColor="var(--color-warning)" onClick={() => navigate('/branch/appointments')}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '20px', color: 'var(--text-muted)' }}>open_in_new</span>
      </KPICard>
    </div>

    <Card hoverable={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Parent Appointment Requests</h3><p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>Allocate the confirmed date, time, and parent-facing description.</p></div>
        <Button variant="outline" onClick={() => navigate('/branch/appointments')}>Manage appointments</Button>
      </div>
      {isLoading ? <Empty>Loading appointment requests...</Empty> : data?.appointments.length ? <div style={{ display: 'grid', gap: '10px' }}>{data.appointments.map((appointment) => <div key={appointment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}><div><strong style={{ fontSize: '14px' }}>{appointment.student}</strong><p style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '12px' }}>{appointment.parent} · {appointment.description}</p></div><Button variant="outline" onClick={() => navigate('/branch/appointments')}>Review</Button></div>)}</div> : <Empty>No pending appointment requests.</Empty>}
    </Card>

    {/* New Row: Active Students Breakdown & Staff Performance */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Active Students</h3>
          <span className="material-symbols-outlined" style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }} onClick={() => navigate('/branch/students')} title="View Students">open_in_new</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>Breakdown by course/class.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeStudentsByCourse.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(21, 96, 189, 0.1)' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.course}</span>
              <StatusBadge variant="info">{item.students} enrolled</StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Staff Performance</h3>
          <span className="material-symbols-outlined" style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }} onClick={() => navigate('/branch/staff')} title="View Staff">open_in_new</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>Local branch assessment scores for local staff.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {staffPerformance.map((staff, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-surface)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{staff.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{staff.role}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{staff.score}/100</div>
            </div>
          ))}
        </div>
      </Card>
    </div>

    {/* New Row: Generalized Pending Approvals Queue & Escalated Tasks */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Pending Approvals</h3>
          <span className="material-symbols-outlined" style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }} onClick={() => navigate('/branch/leave-requests')} title="View Approvals">open_in_new</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingApprovals.map((req) => 
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <StatusBadge variant="info">{req.type}</StatusBadge>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)' }}>{req.desc}</span>
                </div>
                <p style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(44, 62, 80, 0.68)' }}>By: {req.requester} · {req.status}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button variant="outline" disabled={approvingId === req.id} onClick={() => void handleApprove(req.id, req.type)} style={{ minHeight: '32px', height: '32px', padding: '4px 12px', borderColor: 'rgba(21, 96, 189, 0.18)' }}>
                  Approve
                </Button>
                <Button variant="danger" disabled={approvingId === req.id} style={{ minHeight: '32px', height: '32px', padding: '4px 12px' }}>
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card hoverable={false} style={{ border: '1px solid rgba(230, 57, 70, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-error)' }}>warning</span>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-error)' }}>Escalated Maintenance</h3>
          </div>
          <span className="material-symbols-outlined" style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }} onClick={() => navigate('/branch/resource-logs')} title="View Resource Logs">open_in_new</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>Tasks unresolved past Tenant Admin threshold.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {escalatedTasks.length === 0 ? <Empty>No escalated tasks.</Empty> : escalatedTasks.map((task) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(230, 57, 70, 0.3)', background: 'var(--color-error-soft)' }}>
              <div>
                <div style={{ color: 'var(--color-error)', fontSize: '14px', fontWeight: 700 }}>{task.issue}</div>
                <div style={{ marginTop: '4px', color: 'var(--color-error)', fontSize: '12px', opacity: 0.8 }}>Assigned to: {task.assignedTo} · {task.duration}</div>
              </div>
              <Button variant="outline" onClick={() => navigate('/branch/workspace')} style={{ minHeight: '32px', height: '32px', padding: '4px 12px', borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                Follow up
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>

    {/* Original Sessions & Logs Row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
      <Card hoverable={false}>
        <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Today's Sessions</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Recorded classroom sessions for this branch.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/branch/timetable')} style={{ padding: '8px', minHeight: 'unset' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
          </Button>
        </div>
        {isLoading ? <Empty>Loading sessions…</Empty> : timetable.length ? <TimetableList items={timetable} /> : <Empty>No sessions are recorded for today.</Empty>}
      </Card>
      
      <Card hoverable={false}>
        <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Resource Log Status</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Latest persisted classroom resource checks.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/branch/resource-logs')} style={{ padding: '8px', minHeight: 'unset' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isLoading ? <Empty>Loading resource logs…</Empty> : !data?.resources.length ? <Empty>No resource logs have been submitted.</Empty> : data.resources.map((item) => { 
            const presentation = resourcePresentation(item); 
            return <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF' }}>
              <div>
                <div style={{ color: 'var(--color-text)', fontSize: '14px', fontWeight: 700 }}>{item.label}</div>
                <div style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px' }}>{item.detail}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: presentation.color }} />
                <StatusBadge variant={presentation.variant}>{presentation.label}</StatusBadge>
              </div>
            </div>; 
          })}
        </div>
      </Card>
    </div>
  </div>;
}
