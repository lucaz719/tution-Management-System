import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const loadBranchData = useCallback(async (branchId?: string) => {
    setIsLoading(true);
    setError('');
    try {
      setData(await api.branchAdmin.getDashboard(branchId));
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this branch dashboard.');
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

  const handleL1Approve = async (id: string) => {
    if (!data) return;
    setApprovingId(id);
    try {
      const result = await api.finances.approvePettyCash(id, 'APPROVE_L1');
      showToast(result.message, 'success');
      await loadBranchData(data.selectedBranch.id);
    } catch (approvalError) {
      showToast(approvalError instanceof Error ? approvalError.message : 'Approval failed.', 'error');
    } finally {
      setApprovingId('');
    }
  };

  if (error) {
    return <Card hoverable={false}><Empty>{error}</Empty><div style={{ display: 'flex', justifyContent: 'center' }}><Button variant="outline" onClick={() => void loadBranchData()}>Try again</Button></div></Card>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    <Card hoverable={false} style={{ padding: '18px 20px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}><div><h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>{data?.selectedBranch.name ?? 'Branch'} Control Panel</h3><p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>Live attendance, timetable, fee, and operations status for today.</p></div><div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>{data && data.branches.length > 1 && <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>Branch<select value={data.selectedBranch.id} onChange={(event) => void loadBranchData(event.target.value)} disabled={isLoading}>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}<Button variant="outline" onClick={() => void loadBranchData(data?.selectedBranch.id)} disabled={isLoading} style={{ height: '40px' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>Sync Branch</Button></div></div></Card>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
      <Card hoverable={false} style={{ padding: '22px', minHeight: '166px' }}><p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Teacher Attendance Today</p><ProgressRing percent={data?.metrics.teacherAttendance.rate ?? 0} color="var(--color-accent)" label={data?.metrics.teacherAttendance.rate === null ? 'No staff' : `${data?.metrics.teacherAttendance.present ?? 0}/${data?.metrics.teacherAttendance.total ?? 0} present`} loading={isLoading} /></Card>
      <Card hoverable={false} style={{ padding: '22px', minHeight: '166px' }}><p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Student Attendance Today</p><ProgressRing percent={data?.metrics.studentAttendance.rate ?? 0} color="var(--color-primary)" label={data?.metrics.studentAttendance.rate === null ? 'No marks' : `${data?.metrics.studentAttendance.present ?? 0}/${data?.metrics.studentAttendance.total ?? 0} present`} loading={isLoading} /></Card>
      <KPICard title="Blocked Students" value={String(data?.metrics.blockedStudents ?? 0)} delta="Active blocked enrollments" icon="block" loading={isLoading} accentColor="var(--color-warning)" />
      <KPICard title="Pending Fee Invoices" value={String(data?.metrics.pendingInvoices ?? 0)} delta={`${money(data?.metrics.outstandingAmount ?? 0)} outstanding`} icon="receipt_long" loading={isLoading} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
      <Card hoverable={false}><div style={{ marginBottom: '18px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Today's Sessions</h3><p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Recorded classroom sessions for this branch.</p></div>{isLoading ? <Empty>Loading sessions…</Empty> : timetable.length ? <TimetableList items={timetable} /> : <Empty>No sessions are recorded for today.</Empty>}</Card>
      <Card hoverable={false}><div style={{ marginBottom: '18px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Resource Log Status</h3><p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Latest persisted classroom resource checks.</p></div><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{isLoading ? <Empty>Loading resource logs…</Empty> : !data?.resources.length ? <Empty>No resource logs have been submitted.</Empty> : data.resources.map((item) => { const presentation = resourcePresentation(item); return <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF' }}><div><div style={{ color: 'var(--color-text)', fontSize: '14px', fontWeight: 700 }}>{item.label}</div><div style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px' }}>{item.detail}</div></div><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: presentation.color }} /><StatusBadge variant={presentation.variant}>{presentation.label}</StatusBadge></div></div>; })}</div></Card>
    </div>

    <Card hoverable={false}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}><div><h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Petty Cash Level 1 Approval Queue</h3><p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Only pending requests for the selected branch are shown.</p></div><StatusBadge variant="info">{data?.pettyCash.length ?? 0} requests</StatusBadge></div><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{isLoading ? <Empty>Loading approvals…</Empty> : !data?.pettyCash.length ? <Empty>No pending petty cash requests.</Empty> : data.pettyCash.map((request) => <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}><div><p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>{request.purpose}</p><p style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(44, 62, 80, 0.68)' }}>ID: {request.id.slice(0, 8)} · Amount: {money(request.amount)}</p></div><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><StatusBadge variant="warning">Pending</StatusBadge><Button variant="outline" disabled={approvingId === request.id} onClick={() => void handleL1Approve(request.id)} style={{ minHeight: '36px', height: '36px', padding: '8px 16px', borderColor: 'rgba(21, 96, 189, 0.18)' }}>{approvingId === request.id ? 'Approving…' : 'Approve L1'}</Button></div></div>)}</div></Card>
  </div>;
}
