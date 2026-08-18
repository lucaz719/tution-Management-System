import { useEffect, useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SharedBillingWorkspace } from '../components/finance/SharedBillingWorkspace';
import { api, type BranchAppointment } from '../services/api';
import './staffFinance.css';

function CalendarGrid({ onDateClick, events }: { onDateClick: (date: Date) => void; events: Record<string, string> }) {
  const [visibleMonth, setVisibleMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  
  const monthCells = useMemo(() => {
    const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
    return Array.from({ length: 42 }, (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - firstWeekday + 1));
  }, [visibleMonth]);

  const moveMonth = (amount: number) => setVisibleMonth(m => new Date(m.getFullYear(), m.getMonth() + amount, 1));
  
  const today = new Date();
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{visibleMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" style={{ minHeight: '32px', height: '32px', padding: '0 8px' }} onClick={() => moveMonth(-1)}>&larr;</Button>
          <Button variant="outline" style={{ minHeight: '32px', height: '32px', padding: '0 12px' }} onClick={() => setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
          <Button variant="outline" style={{ minHeight: '32px', height: '32px', padding: '0 8px' }} onClick={() => moveMonth(1)}>&rarr;</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
        ))}
        {monthCells.map((date) => {
          // Adjust to local date string to avoid timezone shift on ISO string
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          const hasEvent = !!events[dateStr];
          const isOutside = date.getMonth() !== visibleMonth.getMonth();
          const isToday = date.toDateString() === today.toDateString();
          
          return (
            <div
              key={date.toISOString()}
              onClick={() => onDateClick(date)}
              style={{
                padding: '12px 4px', textAlign: 'center', border: `1px solid ${isToday ? 'var(--color-primary)' : 'var(--border)'}`,
                borderRadius: '8px', cursor: 'pointer', background: hasEvent ? 'var(--color-primary-soft, #e6f0fa)' : isOutside ? 'var(--color-surface)' : '#fff',
                color: hasEvent ? 'var(--color-primary)' : isOutside ? 'var(--text-muted)' : 'var(--text)', fontWeight: hasEvent || isToday ? 700 : 400,
                opacity: isOutside ? 0.6 : 1
              }}
            >
              <div style={{ fontSize: '14px' }}>{date.getDate()}</div>
              {hasEvent && <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--color-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>{events[dateStr]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const field = { width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border, rgba(21,96,189,.2))', background: 'var(--color-surface, #fff)', color: 'var(--color-text)' } as const;
const label = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' } as const;
const form = { display: 'grid', gap: 16 } as const;

function Page({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 20 }}>
    <header><h1 style={{ fontSize: 24, color: 'var(--color-text)' }}>{title}</h1><p style={{ marginTop: 6, color: 'var(--color-text-muted, rgba(44,62,80,.7))' }}>{description}</p></header>
    {children}
  </main>;
}

function Feedback({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null;
  return <div role="status" style={{ padding: 12, borderRadius: 10, background: error ? 'var(--color-error-soft, #fff0f0)' : 'var(--color-success-soft, #eaf8f0)', color: error ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 700 }}>{error || message}</div>;
}

function useAction() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>, success: string) => { setBusy(true); setError(''); setMessage(''); try { await action(); setMessage(success); } catch (cause) { setError(cause instanceof Error ? cause.message : 'The action could not be completed. Try again.'); } finally { setBusy(false); } };
  return { busy, message, error, run };
}

function LeaveRequestsView() {
  const action = useAction(); 
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reason, setReason] = useState(''); 
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  
  // Mock pending requests
  const pendingLeaves = [
    { id: 'LR-101', requester: 'Sanjay Rai', date: '2026-08-10', type: 'Casual Leave', reason: 'Family function' },
    { id: 'LR-102', requester: 'Aisha Tamang', date: '2026-08-12', type: 'Sick Leave', reason: 'Fever and cold' }
  ];

  const submit = (event: FormEvent) => { 
    event.preventDefault(); 
    if (decision === 'REJECT' && !reason.trim()) return; 
    
    const apiCall = api.branchAdmin.decideLeave(selectedRequest.id, decision, reason);
    const successMessage = decision === 'APPROVE' ? 'Leave approved (Level 1). Forwarded to Tenant Admin for final decision.' : 'Leave request rejected.';
    
    void action.run(async () => {
      await apiCall;
      setSelectedRequest(null);
      setReason('');
    }, successMessage); 
  };
  
  const reasonMissing = decision === 'REJECT' && !reason.trim();
  
  return <Page title="Leave Approvals" description="Branch Admin gives first-level approval/rejection, then it forwards to Tenant Admin for final.">
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
      {/* List of requests */}
      <Card hoverable={false} style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Pending Requests</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingLeaves.map(req => (
            <div 
              key={req.id} 
              onClick={() => setSelectedRequest(req)}
              style={{ padding: '12px', border: `1px solid ${selectedRequest?.id === req.id ? 'var(--color-primary)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', background: selectedRequest?.id === req.id ? 'var(--color-primary-soft)' : 'var(--color-surface)' }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{req.requester}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.type}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.date}</div>
            </div>
          ))}
          {pendingLeaves.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No pending requests.</p>}
        </div>
      </Card>

      {/* Detail & Action Form */}
      <div>
        {selectedRequest ? (
          <Card hoverable={false}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Request Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Requester</div>
                <div style={{ fontWeight: 600 }}>{selectedRequest.requester}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date Requested</div>
                <div style={{ fontWeight: 600 }}>{selectedRequest.date}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Leave Type</div>
                <div style={{ fontWeight: 600 }}>{selectedRequest.type}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reason</div>
                <div style={{ fontWeight: 600 }}>{selectedRequest.reason}</div>
              </div>
            </div>

            <form onSubmit={submit} style={form} aria-busy={action.busy}>
              <label style={label} htmlFor="approval-decision">Decision<select id="approval-decision" value={decision} onChange={e => setDecision(e.target.value as 'APPROVE' | 'REJECT')} style={field}><option value="APPROVE">Approve</option><option value="REJECT">Reject</option></select></label>
              <label style={label} htmlFor="approval-reason">Admin Note {decision === 'REJECT' ? '(required for rejection)' : '(optional)'}<textarea id="approval-reason" value={reason} onChange={e => setReason(e.target.value)} aria-invalid={reasonMissing || undefined} aria-describedby={reasonMissing ? 'approval-reason-error' : undefined} style={{ ...field, minHeight: 84 }} />{reasonMissing && <span id="approval-reason-error" style={{ color: 'var(--color-error)', fontWeight: 600 }}>Enter a reason before rejecting this request.</span>}</label>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy || reasonMissing}>{action.busy ? 'Saving decision…' : 'Save decision'}</Button>
            </form>
          </Card>
        ) : (
          <Card hoverable={false} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>touch_app</span>
              <p style={{ marginTop: '8px' }}>Select a request from the list to review</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  </Page>;
}

function PettyCashView() {
  const action = useAction(); 
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reason, setReason] = useState(''); 
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  
  const pendingPettyCash = [
    { id: 'PC-201', requester: 'Rina Karki', amount: 5000, purpose: 'Stationery supplies', date: '2026-08-05' },
    { id: 'PC-202', requester: 'Bikash Thapa', amount: 12000, purpose: 'Projector repair', date: '2026-08-06' }
  ];

  // Mock monthly limit for branch admin
  const monthlyLimit = 50000;
  const currentUsage = 45000;
  const availableLimit = monthlyLimit - currentUsage;
  const requestAmount = selectedRequest?.amount || 0;
  const isOutOfLimit = requestAmount > availableLimit;

  const submit = (event: FormEvent) => { 
    event.preventDefault(); 
    if (decision === 'REJECT' && !reason.trim()) return; 
    
    let successMessage = '';
    let apiCall: Promise<unknown>;
    
    if (decision === 'APPROVE') {
      if (isOutOfLimit) {
        apiCall = api.finances.approvePettyCash(selectedRequest.id, 'APPROVE_L1', reason);
        successMessage = 'Out of limit: Request forwarded to Tenant Admin for approval.';
      } else {
        apiCall = api.finances.approvePettyCash(selectedRequest.id, 'APPROVE_L2', reason);
        successMessage = 'Petty cash approved and granted (within monthly limit).';
      }
    } else {
      apiCall = api.finances.decidePettyCash(selectedRequest.id, 'REJECT', reason);
      successMessage = 'Petty cash request rejected.';
    }
    
    void action.run(async () => {
      await apiCall;
      setSelectedRequest(null);
      setReason('');
    }, successMessage); 
  };
  
  const reasonMissing = decision === 'REJECT' && !reason.trim();
  
  return <Page title="Petty Cash Approvals" description="Manage petty cash requests. If within limit, grant directly. If out of limit, forward to Tenant Admin.">
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
      {/* List of requests */}
      <Card hoverable={false} style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Pending Requests</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingPettyCash.map(req => (
            <div 
              key={req.id} 
              onClick={() => setSelectedRequest(req)}
              style={{ padding: '12px', border: `1px solid ${selectedRequest?.id === req.id ? 'var(--color-primary)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', background: selectedRequest?.id === req.id ? 'var(--color-primary-soft)' : 'var(--color-surface)' }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{req.requester}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NPR {req.amount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.date}</div>
            </div>
          ))}
          {pendingPettyCash.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No pending requests.</p>}
        </div>
      </Card>

      {/* Detail & Action Form */}
      <div>
        {selectedRequest ? (
          <>
            <Card hoverable={false} style={{ marginBottom: '16px', background: isOutOfLimit && requestAmount > 0 ? 'var(--color-warning-soft)' : '#fff' }}>
              <h3 style={{ fontSize: '16px' }}>Monthly Limit Status</h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Available Limit:</span> <strong style={{ color: 'var(--color-success)' }}>NPR {availableLimit.toLocaleString()}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Used:</span> NPR {currentUsage.toLocaleString()}</div>
              </div>
              {isOutOfLimit && requestAmount > 0 && (
                <div style={{ marginTop: '12px', color: 'var(--color-warning)', fontWeight: 600 }}>
                  ⚠️ Requested amount exceeds available limit. Approving will forward the request to the Tenant Admin.
                </div>
              )}
            </Card>
            
            <Card hoverable={false}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Request Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Requester</div>
                  <div style={{ fontWeight: 600 }}>{selectedRequest.requester}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date Requested</div>
                  <div style={{ fontWeight: 600 }}>{selectedRequest.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>NPR {requestAmount.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Purpose</div>
                  <div style={{ fontWeight: 600 }}>{selectedRequest.purpose}</div>
                </div>
              </div>

              <form onSubmit={submit} style={form} aria-busy={action.busy}>
                <label style={label} htmlFor="approval-decision">Decision<select id="approval-decision" value={decision} onChange={e => setDecision(e.target.value as 'APPROVE' | 'REJECT')} style={field}><option value="APPROVE">Approve</option><option value="REJECT">Reject</option></select></label>
                <label style={label} htmlFor="approval-reason">Admin Note {decision === 'REJECT' ? '(required for rejection)' : '(optional)'}<textarea id="approval-reason" value={reason} onChange={e => setReason(e.target.value)} aria-invalid={reasonMissing || undefined} aria-describedby={reasonMissing ? 'approval-reason-error' : undefined} style={{ ...field, minHeight: 84 }} />{reasonMissing && <span id="approval-reason-error" style={{ color: 'var(--color-error)', fontWeight: 600 }}>Enter a reason before rejecting this request.</span>}</label>
                <Feedback message={action.message} error={action.error} />
                <Button type="submit" disabled={action.busy || reasonMissing}>{action.busy ? 'Saving decision…' : 'Save decision'}</Button>
              </form>
            </Card>
          </>
        ) : (
          <Card hoverable={false} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>touch_app</span>
              <p style={{ marginTop: '8px' }}>Select a request from the list to review</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  </Page>;
}

function StudentExceptions() {
  const action = useAction(); const [mode, setMode] = useState<'departure' | 'remark' | 'fee'>('departure'); const [studentId, setStudentId] = useState(''); const [branchId, setBranchId] = useState(''); const [text, setText] = useState(''); const [collector, setCollector] = useState(''); const [parentVisible, setParentVisible] = useState(false); const [scope, setScope] = useState<'ONE_SESSION' | 'ONE_DAY'>('ONE_SESSION');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!text.trim()) return; const request = mode === 'departure' ? api.branchAdmin.emergencyDeparture({ studentId, branchId, reason: text, collectedBy: collector, departureTime: new Date().toISOString() }) : mode === 'remark' ? api.branchAdmin.addRemark({ studentId, subject: 'Administrative remark', message: text, parentVisible }) : api.branchAdmin.grantFeeOverride({ studentId, branchId, scope, reason: text }); void action.run(() => request, mode === 'departure' ? 'Departure permanently recorded and the parent notification was sent.' : mode === 'remark' ? 'Remark saved with your identity and timestamp.' : 'Temporary access granted and added to fee-status history.'); };
  return <Page title="Student exceptions" description="Record attributable exceptions. Fee-block access remains scoped and never becomes a permanent unblock."><Card hoverable={false}><form onSubmit={submit} style={form} aria-busy={action.busy}>
    <label style={label} htmlFor="exception-type">Action<select id="exception-type" value={mode} onChange={e => setMode(e.target.value as 'departure' | 'remark' | 'fee')} style={field}><option value="departure">Emergency departure</option><option value="fee">Temporary fee access</option><option value="remark">Administrative remark</option></select></label>
    <label style={label} htmlFor="exception-student">Student ID (required)<input id="exception-student" required value={studentId} onChange={e => setStudentId(e.target.value)} style={field} /></label>
    {mode !== 'remark' && <label style={label} htmlFor="exception-branch">Branch ID (required)<input id="exception-branch" required value={branchId} onChange={e => setBranchId(e.target.value)} style={field} /></label>}
    {mode === 'departure' && <label style={label} htmlFor="exception-collector">Collected by (optional)<input id="exception-collector" value={collector} onChange={e => setCollector(e.target.value)} autoComplete="name" style={field} /></label>}
    {mode === 'fee' && <label style={label} htmlFor="override-scope">Access scope<select id="override-scope" value={scope} onChange={e => setScope(e.target.value as 'ONE_SESSION' | 'ONE_DAY')} style={field}><option value="ONE_SESSION">One session</option><option value="ONE_DAY">One day</option></select></label>}
    <label style={label} htmlFor="exception-reason">{mode === 'departure' ? 'Departure reason' : mode === 'fee' ? 'Override reason' : 'Remark'} (required)<textarea id="exception-reason" required value={text} onChange={e => setText(e.target.value)} style={{ ...field, minHeight: 96 }} /></label>
    {mode === 'remark' && <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}><input type="checkbox" checked={parentVisible} onChange={e => setParentVisible(e.target.checked)} />Visible to parents</label>}
    <Feedback message={action.message} error={action.error} /><Button type="submit" disabled={action.busy || !studentId.trim() || !text.trim()}>{action.busy ? 'Recording…' : mode === 'departure' ? 'Record and notify parent' : mode === 'fee' ? 'Grant temporary access' : 'Save remark'}</Button>
  </form></Card><Card hoverable={false}><h2 style={{ fontSize: 18 }}>Fee override safeguards</h2><p style={{ marginTop: 8, color: 'var(--color-text-muted, rgba(44,62,80,.7))' }}>Every override records its reason, scope, expiry, and granting admin in visible fee-status history.</p><StatusBadge variant="info">Permanent unblock unavailable</StatusBadge></Card></Page>;
}

function PersonalizedClassesView() {
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers' | 'students' | 'editClass'>('classes');
  const action = useAction();
  
  const [classes, setClasses] = useState([
    { id: 'c1', name: 'Advanced Physics Tutoring (1:1)', teacher: 'Sanjay Rai', student: 'Aakash Bista', fee: 'NPR 10,000 / month' }
  ]);
  const [editingClass, setEditingClass] = useState<any>(null);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this personalized class?')) {
      setClasses(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEdit = (c: any) => {
    setEditingClass(c);
    setActiveTab('editClass');
  };

  const handleCreate = () => {
    setEditingClass(null);
    setActiveTab('editClass');
  };

  const submitClass = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 600));
      if (editingClass?.id) {
        setClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, ...editingClass } : c));
      } else {
        setClasses(prev => [...prev, { ...editingClass, id: `c${Date.now()}` }]);
      }
      setActiveTab('classes');
    }, `Class ${editingClass?.id ? 'updated' : 'created'} successfully.`);
  };

  return (
    <Page title="Personalized Classes" description="Manage 1:1 or small-group classes. Manage their specific teachers and students here.">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <Button variant={activeTab === 'classes' || activeTab === 'editClass' ? 'primary' : 'outline'} onClick={() => setActiveTab('classes')}>Classes</Button>
        <Button variant={activeTab === 'teachers' ? 'primary' : 'outline'} onClick={() => setActiveTab('teachers')}>Manage Teachers</Button>
        <Button variant={activeTab === 'students' ? 'primary' : 'outline'} onClick={() => setActiveTab('students')}>Manage Students</Button>
      </div>
      <Card hoverable={false}>
        {activeTab === 'classes' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Active Classes</h2>
              <Button onClick={handleCreate}>Create Class</Button>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {classes.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--color-surface)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{c.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Teacher: {c.teacher} | Student: {c.student}</div>
                    <div style={{ color: 'var(--color-primary)', fontSize: '13px', marginTop: '4px', fontWeight: 600 }}>{c.fee}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="outline" onClick={() => handleEdit(c)}>Edit</Button>
                    <Button variant="outline" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => handleDelete(c.id)}>Delete</Button>
                  </div>
                </div>
              ))}
              {classes.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active personalized classes.</p>}
            </div>
          </div>
        ) : activeTab === 'editClass' ? (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px' }}>{editingClass?.id ? 'Edit Class' : 'Create New Class'}</h2>
              <Button variant="outline" onClick={() => setActiveTab('classes')}>Cancel</Button>
            </div>
            <form onSubmit={submitClass} style={form} aria-busy={action.busy}>
              <label style={label}>Class Name<input required style={field} value={editingClass?.name || ''} onChange={e => setEditingClass({ ...editingClass, name: e.target.value })} placeholder="e.g. Advanced Physics (1:1)" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Assign Teacher
                  <select required style={field} value={editingClass?.teacher || ''} onChange={e => setEditingClass({ ...editingClass, teacher: e.target.value })}>
                    <option value="" disabled>Select a teacher</option>
                    <option value="Sanjay Rai">Sanjay Rai</option>
                    <option value="Rina Karki">Rina Karki</option>
                    <option value="Bikash Thapa">Bikash Thapa</option>
                  </select>
                </label>
                <label style={label}>Assign Student
                  <select required style={field} value={editingClass?.student || ''} onChange={e => setEditingClass({ ...editingClass, student: e.target.value })}>
                    <option value="" disabled>Select a student</option>
                    <option value="Aakash Bista">Aakash Bista</option>
                    <option value="Priya Gurung">Priya Gurung</option>
                    <option value="Rohan Sharma">Rohan Sharma</option>
                  </select>
                </label>
              </div>
              <label style={label}>Monthly Fee<input required style={field} value={editingClass?.fee || ''} onChange={e => setEditingClass({ ...editingClass, fee: e.target.value })} placeholder="e.g. NPR 10,000 / month" /></label>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy} style={{ width: 'fit-content' }}>
                {action.busy ? 'Saving...' : 'Save Class'}
              </Button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', textTransform: 'capitalize' }}>Personalized Class {activeTab}</h2>
              <Button>Add {activeTab.slice(0, -1)}</Button>
            </div>
            <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Add specific details for {activeTab} participating in personalized classes. This is separate from the main directory.
            </p>
            <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Contact</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 8px' }}>{activeTab === 'teachers' ? 'Sanjay Rai' : 'Aakash Bista'}</td>
                  <td style={{ padding: '12px 8px' }}>{activeTab === 'teachers' ? 'sanjay@example.com' : 'aakash@example.com'}</td>
                  <td style={{ padding: '12px 8px' }}><StatusBadge variant="success">Active</StatusBadge></td>
                  <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                    <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }}>Edit</Button>
                    <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Remove</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}

function AppointmentsView() {
  const action = useAction();
  const [items, setItems] = useState<BranchAppointment[]>([]);
  const [selected, setSelected] = useState<BranchAppointment | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [description, setDescription] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); setLoadError(''); try { const dashboard = await api.branchAdmin.getDashboard(); const result = await api.branchAdmin.getAppointments(dashboard.selectedBranch.id); setItems(result.appointments); } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Appointments could not be loaded.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const choose = (item: BranchAppointment) => { setSelected(item); const preferred = new Date(item.scheduledTime); setScheduledTime(new Date(preferred.getTime() - preferred.getTimezoneOffset() * 60000).toISOString().slice(0, 16)); setDescription(item.responseRemarks || 'Appointment confirmed with the branch administration.'); };
  const decide = async (decision: 'APPROVE' | 'REJECT') => { if (!selected) return; await api.branchAdmin.respondToAppointment(selected.id, { action: decision, scheduledTime: decision === 'APPROVE' ? new Date(scheduledTime).toISOString() : undefined, remarks: description }); setSelected(null); setScheduledTime(''); setDescription(''); await load(); };
  const pending = items.filter((item) => item.status === 'REQUESTED');
  return <Page title="Parent Appointments" description="Review parent requests and allocate the confirmed appointment date and time."><Feedback message={action.message} error={loadError || action.error} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}><Card hoverable={false} style={{ padding: 16 }}><h2 style={{ fontSize: 16, marginBottom: 12 }}>Pending requests</h2>{loading ? <p>Loading appointments...</p> : pending.length ? <div style={{ display: 'grid', gap: 8 }}>{pending.map((item) => <button key={item.id} type="button" onClick={() => choose(item)} style={{ minHeight: 76, padding: 12, textAlign: 'left', border: `1px solid ${selected?.id === item.id ? 'var(--color-primary)' : 'var(--border)'}`, borderRadius: 8, background: selected?.id === item.id ? 'var(--color-primary-soft)' : 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}><strong>{item.student.user.firstName} {item.student.user.lastName}</strong><span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>{item.requestedBy.firstName} {item.requestedBy.lastName}</span><span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>Preferred: {new Date(item.scheduledTime).toLocaleString('en-NP')}</span></button>)}</div> : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No parent requests are waiting.</p>}</Card>{selected ? <Card hoverable={false}><StatusBadge variant="warning">Awaiting decision</StatusBadge><h2 style={{ marginTop: 12, fontSize: 18 }}>{selected.student.user.firstName} {selected.student.user.lastName}</h2><p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>Requested by {selected.requestedBy.firstName} {selected.requestedBy.lastName}{selected.requestedBy.phone ? ` · ${selected.requestedBy.phone}` : ''}</p><div style={{ margin: '16px 0', padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}><strong style={{ fontSize: 12 }}>Parent's request</strong><p style={{ marginTop: 6 }}>{selected.remarks || 'No description provided.'}</p></div><form onSubmit={(event) => { event.preventDefault(); void action.run(() => decide('APPROVE'), 'Appointment accepted and scheduled.'); }} style={form}><label style={label} htmlFor="appointment-schedule">Confirmed date and time<input id="appointment-schedule" type="datetime-local" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} style={field} required /></label><label style={label} htmlFor="appointment-description">Description for parent<textarea id="appointment-description" value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...field, minHeight: 96 }} required /></label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Button type="submit" disabled={action.busy || !scheduledTime || !description.trim()}>Accept and schedule</Button><Button type="button" variant="danger" disabled={action.busy || !description.trim()} onClick={() => void action.run(() => decide('REJECT'), 'Appointment request rejected.')}>Reject request</Button></div></form></Card> : <Card hoverable={false} style={{ minHeight: 300, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', textAlign: 'center' }}><p>Select an appointment request to review.</p></Card>}</div></Page>;
}

function FeeBillingView() {
  return <SharedBillingWorkspace heading="Branch billing & payroll" />;
}
function BranchCalendarView() {
  const action = useAction();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [events, setEvents] = useState<Record<string, string>>({
    '2026-08-15': 'Independence Day Holiday',
    '2026-08-20': 'Parent-Teacher Meeting',
    '2026-08-25': 'Mid-Term Exams Begin'
  });
  
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');

  const submitEvent = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 500));
      setEvents(prev => ({ ...prev, [newEventDate]: newEventTitle }));
      setShowAddEvent(false);
      setNewEventDate('');
      setNewEventTitle('');
    }, 'Event added successfully.');
  };
  
  return (
    <Page title="Branch Academic Calendar" description="View and add upcoming events for this branch.">
      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px' }}>Calendar</h2>
            <Button onClick={() => setShowAddEvent(!showAddEvent)}>
              {showAddEvent ? 'Cancel' : 'Add Event'}
            </Button>
          </div>
          
          {showAddEvent && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Add New Event</h3>
              <form onSubmit={submitEvent} style={form} aria-busy={action.busy}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={label}>Event Title<input required style={field} value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="e.g. Science Fair" /></label>
                  <label style={label}>Event Date<input type="date" required style={field} value={newEventDate} onChange={e => setNewEventDate(e.target.value)} /></label>
                </div>
                <Feedback message={action.message} error={action.error} />
                <Button type="submit" disabled={action.busy} style={{ width: 'fit-content' }}>
                  {action.busy ? 'Saving...' : 'Save Event'}
                </Button>
              </form>
            </div>
          )}

          <CalendarGrid onDateClick={setSelectedDate} events={events} />
        </Card>
        {selectedDate && (
          <Card hoverable={false}>
            <h2 style={{ fontSize: '18px' }}>Events on {selectedDate.toLocaleDateString()}</h2>
            <div style={{ marginTop: '16px' }}>
              {events[selectedDate.toISOString().split('T')[0]] ? (
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{events[selectedDate.toISOString().split('T')[0]]}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>All Day Event</div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No events scheduled for this day.</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
function ResourceTasks() {
  const action = useAction();
  const [branchId, setBranchId] = useState('B-101');
  const [taskId, setTaskId] = useState('');

  const mockTasks = [
    { id: 'T-8921', issue: 'AC Unit 2 malfunctioning', location: 'Room 302', priority: 'High', status: 'Pending' },
    { id: 'T-8922', issue: 'Broken chair', location: 'Lab 1', priority: 'Low', status: 'Pending' }
  ];

  const handleComplete = (id: string) => {
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 600));
      // In mock, do nothing to list, just show toast
    }, `Task ${id} marked complete with actor and timestamp recorded.`);
  };

  return (
    <Page title="Resource and maintenance" description="Action-required logs auto-assign maintenance staff; escalated tasks remain visible for direct follow-up.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Pending Maintenance Tasks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--color-surface)' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{task.id}</span>
                    <StatusBadge variant={task.priority === 'High' ? 'error' : 'info'}>{task.priority} Priority</StatusBadge>
                  </div>
                  <div style={{ color: 'var(--color-text)', fontSize: '14px' }}>{task.issue}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Location: {task.location}</div>
                </div>
                <Button onClick={() => handleComplete(task.id)}>Mark Complete</Button>
              </div>
            ))}
          </div>
        </Card>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card hoverable={false}>
            <div style={form}>
              <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Manual Task Completion</h3>
              <label style={label}>Branch ID<input value={branchId} onChange={e => setBranchId(e.target.value)} style={field} /></label>
              <label style={label}>Task ID<input value={taskId} onChange={e => setTaskId(e.target.value)} placeholder="e.g. T-8921" style={field} /></label>
              <Feedback message={action.message} error={action.error} />
              <Button disabled={action.busy || !taskId.trim()} onClick={() => handleComplete(taskId)}>Complete task</Button>
            </div>
          </Card>
          <Card hoverable={false}>
            <h2 style={{ fontSize: 16 }}>Escalation policy</h2>
            <p style={{ marginTop: 8, color: 'var(--color-text-muted, rgba(44,62,80,.7))', fontSize: '13px' }}>Tasks unresolved after the Tenant Admin-configured threshold are marked escalated. Default assignment remains branch-scoped.</p>
            <div style={{ marginTop: '12px' }}>
              <StatusBadge variant="warning">Requires follow-up</StatusBadge>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
function Drafting() {
  const action = useAction();
  const [branchId, setBranchId] = useState('');
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState('Facebook');
  const [proposedTime, setProposedTime] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void action.run(() => api.branchAdmin.createSocialDraft({ branchId, text, platforms: [platform], mediaUrls: [], proposedTime: proposedTime || undefined }), 'Draft submitted to Tenant Admin. Nothing was published.');
  };

  const mockHistory = [
    { id: '1', content: 'Exciting news! Enrollment is open.', platform: 'Facebook', status: 'PUBLISHED', date: '2026-08-01' },
    { id: '2', content: 'Join us for the science fair this weekend.', platform: 'Instagram', status: 'PENDING', date: '2026-08-10' },
    { id: '3', content: 'Our students placed 1st in the regional debate.', platform: 'LinkedIn', status: 'APPROVED', date: '2026-08-12' },
  ];

  return (
    <Page title="Social Media Management" description="Prepare branch posts for Tenant Admin approval and view their status. Branch Admins cannot publish directly.">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <Button variant={activeTab === 'create' ? 'primary' : 'outline'} onClick={() => setActiveTab('create')}>Draft New Post</Button>
        <Button variant={activeTab === 'history' ? 'primary' : 'outline'} onClick={() => setActiveTab('history')}>Post Status & History</Button>
      </div>

      {activeTab === 'create' ? (
        <Card hoverable={false}>
          <form onSubmit={submit} style={form} aria-busy={action.busy}>
            <label style={label}>Branch ID (required)<input required value={branchId} onChange={e => setBranchId(e.target.value)} style={field} /></label>
            <label style={label}>Post text (required)<textarea required value={text} onChange={e => setText(e.target.value)} style={{ ...field, minHeight: 112 }} /></label>
            <label style={label}>Target platform
              <select value={platform} onChange={e => setPlatform(e.target.value)} style={field}>
                <option>Facebook</option><option>Instagram</option><option>LinkedIn</option>
              </select>
            </label>
            <label style={label}>Proposed schedule<input type="datetime-local" value={proposedTime} onChange={e => setProposedTime(e.target.value)} style={field} /></label>
            <Feedback message={action.message} error={action.error} />
            <Button type="submit" disabled={action.busy || !text.trim() || !branchId.trim()}>{action.busy ? 'Submitting…' : 'Submit for approval'}</Button>
            <Button disabled variant="outline">Direct publishing unavailable</Button>
          </form>
        </Card>
      ) : (
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px' }}>Post History</h2>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockHistory.map((post) => (
              <div key={post.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge variant="info">{post.platform}</StatusBadge>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{post.date}</span>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '14px' }}>{post.content}</p>
                </div>
                <StatusBadge variant={post.status === 'PUBLISHED' ? 'success' : post.status === 'APPROVED' ? 'info' : 'warning'}>
                  {post.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}

function AttendanceView() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'All' | 'Present' | 'Absent'>('All');
  const events = { '2026-08-01': '98% Present', '2026-08-02': '95% Present', '2026-08-03': '97% Present', '2026-08-04': '99% Present' };

  // Mock lists to show who is present/absent
  const teacherList = [
    { id: 'T1', name: 'Sanjay Rai', status: 'Present' },
    { id: 'T2', name: 'Rina Karki', status: 'Absent (Leave)' }
  ];
  
  const staffList = [
    { id: 'S1', name: 'Bikash Thapa', status: 'Present' },
    { id: 'S2', name: 'Aisha Tamang', status: 'Present' }
  ];

  const studentList = [
    { id: 'ST1', name: 'Aakash Bista', course: 'Grade 10 Math', status: 'Present' },
    { id: 'ST2', name: 'Priya Gurung', course: 'Grade 10 Science', status: 'Absent' },
    { id: 'ST3', name: 'Rohan Sharma', course: 'Grade 12 Physics', status: 'Blocked' }
  ];

  const applyFilter = (list: any[]) => {
    if (filter === 'All') return list;
    if (filter === 'Present') return list.filter(i => i.status === 'Present');
    return list.filter(i => i.status !== 'Present');
  };

  return (
    <Page title="Branch Attendance" description="Click on any date to view complete attendance records for all staff, teachers, and students.">
      <Card hoverable={false}>
        <h2 style={{ fontSize: '18px' }}>Attendance Calendar</h2>
        <CalendarGrid onDateClick={setSelectedDate} events={events} />
      </Card>
      {selectedDate && (
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px' }}>Records for {selectedDate.toLocaleDateString()}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant={filter === 'All' ? 'primary' : 'outline'} onClick={() => setFilter('All')} style={{ padding: '6px 12px', minHeight: 'unset', height: '32px' }}>All</Button>
              <Button variant={filter === 'Present' ? 'primary' : 'outline'} onClick={() => setFilter('Present')} style={{ padding: '6px 12px', minHeight: 'unset', height: '32px' }}>Present</Button>
              <Button variant={filter === 'Absent' ? 'primary' : 'outline'} onClick={() => setFilter('Absent')} style={{ padding: '6px 12px', minHeight: 'unset', height: '32px' }}>Absent</Button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Teachers */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px' }}>Teachers</h3>
                <StatusBadge variant="warning">50% Present</StatusBadge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {applyFilter(teacherList).map(t => (
                  <div key={t.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{t.name}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant={t.status.includes('Present') ? 'primary' : 'outline'} style={{ minHeight: '28px', height: '28px', padding: '0 12px', fontSize: '12px' }} onClick={() => alert(`Marking ${t.name} as Present. Details: Verified via bio-metric.`)}>Present</Button>
                        <Button variant={t.status.includes('Absent') ? 'primary' : 'outline'} style={{ minHeight: '28px', height: '28px', padding: '0 12px', fontSize: '12px', borderColor: 'var(--color-error)', color: t.status.includes('Absent') ? '#fff' : 'var(--color-error)', background: t.status.includes('Absent') ? 'var(--color-error)' : 'transparent' }} onClick={() => alert(`Marking ${t.name} as Absent. Details: Unnotified absence.`)}>Absent</Button>
                      </div>
                    </div>
                    {t.status.includes('Leave') && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Status Info: On approved leave.</div>}
                  </div>
                ))}
                {applyFilter(teacherList).length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No teachers match this filter.</p>}
              </div>
            </div>

            {/* Support Staff */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px' }}>Support Staff</h3>
                <StatusBadge variant="success">100% Present</StatusBadge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {applyFilter(staffList).map(s => (
                  <div key={s.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant={s.status.includes('Present') ? 'primary' : 'outline'} style={{ minHeight: '28px', height: '28px', padding: '0 12px', fontSize: '12px' }} onClick={() => alert(`Marking ${s.name} as Present. Details: Verified via RFID.`)}>Present</Button>
                        <Button variant={s.status.includes('Absent') ? 'primary' : 'outline'} style={{ minHeight: '28px', height: '28px', padding: '0 12px', fontSize: '12px', borderColor: 'var(--color-error)', color: s.status.includes('Absent') ? '#fff' : 'var(--color-error)', background: s.status.includes('Absent') ? 'var(--color-error)' : 'transparent' }} onClick={() => alert(`Marking ${s.name} as Absent.`)}>Absent</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {applyFilter(staffList).length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No staff match this filter.</p>}
              </div>
            </div>

            {/* Students */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px' }}>Students</h3>
                <StatusBadge variant="warning">33% Present</StatusBadge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {applyFilter(studentList).map(st => (
                  <div key={st.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{st.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{st.course}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant={st.status.includes('Present') ? 'primary' : 'outline'} style={{ minHeight: '28px', height: '28px', padding: '0 12px', fontSize: '12px' }} onClick={() => alert(`Marking ${st.name} as Present. Details: ID Scanned at entry.`)}>Present</Button>
                        <Button variant={st.status.includes('Absent') || st.status.includes('Blocked') ? 'primary' : 'outline'} style={{ minHeight: '28px', height: '28px', padding: '0 12px', fontSize: '12px', borderColor: 'var(--color-error)', color: st.status.includes('Absent') || st.status.includes('Blocked') ? '#fff' : 'var(--color-error)', background: st.status.includes('Absent') || st.status.includes('Blocked') ? 'var(--color-error)' : 'transparent' }} onClick={() => alert(`Marking ${st.name} as Absent. ${st.status === 'Blocked' ? 'Note: Student is blocked due to unpaid fees.' : ''}`)}>Absent</Button>
                      </div>
                    </div>
                    {st.status === 'Blocked' && <div style={{ fontSize: '12px', color: 'var(--color-warning)', marginTop: '8px', fontWeight: 600 }}>Status Info: Blocked from entry.</div>}
                  </div>
                ))}
                {applyFilter(studentList).length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No students match this filter.</p>}
              </div>
            </div>

          </div>
        </Card>
      )}
    </Page>
  );
}

function HomeworkView() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const events = { '2026-08-01': '4 Assignments', '2026-08-02': '2 Assignments', '2026-08-04': '5 Assignments' };
  
  // Default to today if no date is clicked
  const displayDate = selectedDate || new Date();
  
  return (
    <Page title="Branch Homework" description="View all today's homework for all classes and subjects, or click past dates to see history.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Homework Calendar</h2>
          <CalendarGrid onDateClick={setSelectedDate} events={events} />
        </Card>
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px' }}>Homework assigned on {displayDate.toLocaleDateString()}</h2>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayDate.getDate() % 2 === 0 ? (
              <>
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Mathematics (Grade 8)</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Assigned by Rina Karki</div>
                  <div style={{ color: 'var(--color-text)', fontSize: '13px', marginTop: '4px' }}>Complete exercises 4.1 to 4.5.</div>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Science (Grade 10)</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Assigned by Sanjay Rai</div>
                  <div style={{ color: 'var(--color-text)', fontSize: '13px', marginTop: '4px' }}>Read chapter 3 and answer the review questions.</div>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No homework assigned on this date.</p>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}

function ResultsView() {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const action = useAction();
  
  const [results, setResults] = useState([
    { id: '1', exam: 'Mid Term', subject: 'Mathematics', class: 'Grade 10', date: '2026-06-15' },
    { id: '2', exam: 'First Term', subject: 'Science', class: 'Grade 8', date: '2026-04-10' }
  ]);
  const [editingResult, setEditingResult] = useState<any>(null);

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this result record?')) {
      setResults(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEdit = (r: any) => {
    setEditingResult(r);
    setActiveTab('edit');
  };

  const handleCreate = () => {
    setEditingResult(null);
    setActiveTab('edit');
  };

  const submitResult = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 600));
      if (editingResult?.id) {
        setResults(prev => prev.map(r => r.id === editingResult.id ? { ...r, ...editingResult } : r));
      } else {
        setResults(prev => [...prev, { ...editingResult, id: Date.now().toString() }]);
      }
      setActiveTab('view');
    }, `Result ${editingResult?.id ? 'updated' : 'added'} successfully.`);
  };

  return (
    <Page title="Branch Results" description="Complete CRUD operations for results across all classes and subjects in the branch.">
      <Card hoverable={false}>
        {activeTab === 'view' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Recent Results</h2>
              <Button onClick={handleCreate}>Add New Result</Button>
            </div>
            <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Exam</th>
                  <th style={{ padding: '8px' }}>Subject</th>
                  <th style={{ padding: '8px' }}>Class</th>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px' }}>{r.exam}</td>
                    <td style={{ padding: '12px 8px' }}>{r.subject}</td>
                    <td style={{ padding: '12px 8px' }}>{r.class}</td>
                    <td style={{ padding: '12px 8px' }}>{r.date}</td>
                    <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                      <Button variant="outline" onClick={() => handleEdit(r)} style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }}>Edit</Button>
                      <Button variant="outline" onClick={() => handleDelete(r.id)} style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No results found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px' }}>{editingResult?.id ? 'Edit Result' : 'Add New Result'}</h2>
              <Button variant="outline" onClick={() => setActiveTab('view')}>Cancel</Button>
            </div>
            <form onSubmit={submitResult} style={form} aria-busy={action.busy}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Exam Name<input required style={field} value={editingResult?.exam || ''} onChange={e => setEditingResult({ ...editingResult, exam: e.target.value })} placeholder="e.g. Mid Term" /></label>
                <label style={label}>Subject<input required style={field} value={editingResult?.subject || ''} onChange={e => setEditingResult({ ...editingResult, subject: e.target.value })} placeholder="e.g. Mathematics" /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Class/Group<input required style={field} value={editingResult?.class || ''} onChange={e => setEditingResult({ ...editingResult, class: e.target.value })} placeholder="e.g. Grade 10" /></label>
                <label style={label}>Date<input type="date" required style={field} value={editingResult?.date || ''} onChange={e => setEditingResult({ ...editingResult, date: e.target.value })} /></label>
              </div>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy} style={{ width: 'fit-content' }}>
                {action.busy ? 'Saving...' : 'Save Result'}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </Page>
  );
}

function CertificatesView() {
  const [student, setStudent] = useState('');
  const [template, setTemplate] = useState('');
  const [preview, setPreview] = useState(false);
  const action = useAction();

  const templates = [
    { id: '1', name: 'Course Completion Certificate' },
    { id: '2', name: 'Certificate of Merit' },
  ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      // Mock API call to issue certificate
      await new Promise(r => setTimeout(r, 1000));
    }, 'Certificate issued successfully. PDF download started.');
  };

  return (
    <Page title="Certificate Generation" description="Manually issue certificates to students using customized branch-specific details based on master templates.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px' }}>Issue Certificate</h2>
          <form onSubmit={submit} style={{ ...form, marginTop: '16px' }}>
            <label style={label}>
              Select Student
              <input required style={field} placeholder="Enter Student ID or Name" value={student} onChange={e => setStudent(e.target.value)} />
            </label>
            <label style={label}>
              Select Template
              <select required style={field} value={template} onChange={e => setTemplate(e.target.value)}>
                <option value="" disabled>Choose a template...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            
            {template && student && (
              <div style={{ marginTop: '12px', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Auto-filled Data (Editable)</h3>
                <label style={label}>Student Name<input style={field} defaultValue="Aakash Bista" /></label>
                <div style={{ height: '12px' }} />
                <label style={label}>Course / Achievement<input style={field} defaultValue="Advanced Physics (Grade 12)" /></label>
                <div style={{ height: '12px' }} />
                <label style={label}>Date of Issue<input style={field} type="date" defaultValue="2026-08-15" /></label>
                <Button type="button" variant="outline" style={{ marginTop: '16px', width: '100%' }} onClick={() => setPreview(true)}>Generate Preview</Button>
              </div>
            )}
            
            <Feedback message={action.message} error={action.error} />
            <Button type="submit" disabled={!preview || action.busy}>{action.busy ? 'Issuing...' : 'Issue & Download PDF'}</Button>
          </form>
        </Card>
        
        <Card hoverable={false} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: 'var(--color-surface)' }}>
          {preview ? (
            <div style={{ width: '100%', height: '100%', border: '2px dashed var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
              <div>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-primary)' }}>verified</span>
                <h3 style={{ fontSize: '18px', marginTop: '12px' }}>Certificate Preview Ready</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Visual rendering of the generated certificate will appear here.</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>image</span>
              <p style={{ marginTop: '8px' }}>Select a student and template to preview</p>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}

function TimetableView() {
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const action = useAction();
  
  const [schedule, setSchedule] = useState([
    { id: '1', date: '2026-08-06', day: 'Thursday', time: '08:00 AM - 09:30 AM', class: 'Grade 10', subject: 'Mathematics', teacher: 'Sanjay Rai', room: 'Room 302' },
    { id: '2', date: '2026-08-07', day: 'Friday', time: '10:00 AM - 11:30 AM', class: 'Grade 12', subject: 'Physics', teacher: 'Rina Karki', room: 'Lab 1' },
    { id: '3', date: '2026-08-08', day: 'Saturday', time: '12:00 PM - 01:30 PM', class: 'IELTS Prep', subject: 'English', teacher: 'Bikash Thapa', room: 'Room 105' }
  ]);

  const [editingId, setEditingId] = useState('');
  const [formData, setFormData] = useState({
    date: '', day: 'Monday', startTime: '', endTime: '', class: '', subject: '', teacher: '', room: ''
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      setSchedule(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleEdit = (session: any) => {
    const [start, end] = session.time.split(' - ');
    // Very basic time string mapping back to input[type=time] format, assuming simplified format or we just use text inputs for simplicity in mock
    // For a robust implementation, parsing '08:00 AM' to '08:00' is needed. 
    // Here we'll just store the raw values if possible, or expect the user to re-enter. Let's do a simple parse:
    const parseTime = (t: string) => {
      if (!t) return '';
      const [time, modifier] = t.split(' ');
      if (!time || !modifier) return t;
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
      return `${hours.padStart(2, '0')}:${minutes}`;
    };

    setFormData({
      date: session.date || '',
      day: session.day || 'Monday',
      startTime: parseTime(start) || '',
      endTime: parseTime(end) || '',
      class: session.class,
      subject: session.subject,
      teacher: session.teacher,
      room: session.room
    });
    setEditingId(session.id);
    setActiveTab('add');
  };

  const handleCreate = () => {
    setEditingId('');
    setFormData({ date: '', day: 'Monday', startTime: '', endTime: '', class: '', subject: '', teacher: '', room: '' });
    setActiveTab('add');
  };

  const formatTime = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 600));
      
      const newSession = {
        id: editingId || `new-${Date.now()}`,
        date: formData.date,
        day: formData.day,
        time: `${formatTime(formData.startTime)} - ${formatTime(formData.endTime)}`,
        class: formData.class,
        subject: formData.subject,
        teacher: formData.teacher,
        room: formData.room
      };

      if (editingId) {
        setSchedule(prev => prev.map(s => s.id === editingId ? newSession : s));
      } else {
        setSchedule(prev => [...prev, newSession]);
      }
      
      setActiveTab('view');
    }, `Timetable session ${editingId ? 'updated' : 'added'} successfully.`);
  };

  return (
    <Page title="Branch Timetable Management" description="Full CRUD operations for all classes, subjects, and teachers of the branch.">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <Button variant={activeTab === 'view' ? 'primary' : 'outline'} onClick={() => setActiveTab('view')}>View Schedule</Button>
        <Button variant={activeTab === 'add' ? 'primary' : 'outline'} onClick={handleCreate}>{editingId ? 'Edit Session' : 'Add Session'}</Button>
      </div>

      <Card hoverable={false}>
        {activeTab === 'view' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Scheduled Classes</h2>
              <StatusBadge variant="info">{schedule.length} sessions</StatusBadge>
            </div>
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Date & Day</th>
                    <th style={{ padding: '8px' }}>Time</th>
                    <th style={{ padding: '8px' }}>Class & Subject</th>
                    <th style={{ padding: '8px' }}>Teacher</th>
                    <th style={{ padding: '8px' }}>Room</th>
                    <th style={{ padding: '8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(session => (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{session.date}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session.day}</div>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{session.time}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div>{session.subject}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session.class}</div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>{session.teacher}</td>
                      <td style={{ padding: '12px 8px' }}>{session.room}</td>
                      <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                        <Button variant="outline" onClick={() => handleEdit(session)} style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }}>Edit</Button>
                        <Button variant="outline" onClick={() => handleDelete(session.id)} style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                  {schedule.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No sessions scheduled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px' }}>{editingId ? 'Edit Session' : 'Add New Session'}</h2>
              {editingId && <Button variant="outline" onClick={() => setActiveTab('view')}>Cancel</Button>}
            </div>
            <form onSubmit={submit} style={form} aria-busy={action.busy}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Date
                  <input type="date" required style={field} value={formData.date} onChange={e => {
                    const d = e.target.value;
                    let dayName = formData.day;
                    if (d) {
                      const dateObj = new Date(d);
                      if (!isNaN(dateObj.getTime())) {
                         dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      }
                    }
                    setFormData({ ...formData, date: d, day: dayName });
                  }} />
                </label>
                <label style={label}>Day
                  <select required style={field} value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value })}>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Class / Group<input required style={field} value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })} placeholder="e.g. Grade 10" /></label>
                <label style={label}>Subject<input required style={field} value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Mathematics" /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Assign Teacher
                  <select required style={field} value={formData.teacher} onChange={e => setFormData({ ...formData, teacher: e.target.value })}>
                    <option value="">Select a teacher...</option>
                    <option value="Sanjay Rai">Sanjay Rai</option>
                    <option value="Rina Karki">Rina Karki</option>
                    <option value="Bikash Thapa">Bikash Thapa</option>
                  </select>
                </label>
                <label style={label}>Room<input required style={field} value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} placeholder="e.g. Room 302" /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Start Time<input type="time" required style={field} value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} /></label>
                <label style={label}>End Time<input type="time" required style={field} value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} /></label>
              </div>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy} style={{ width: 'fit-content' }}>
                {action.busy ? 'Saving...' : 'Save Session'}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </Page>
  );
}

// ─── BRANCH STUDENTS VIEW ──────────────────────────────────────────────────────
function BranchStudentsView() {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const action = useAction();

  const [students, setStudents] = useState([
    { id: 'S001', name: 'Aakash Bista', email: 'aakash@tms.edu', phone: '9841000001', class: 'Grade 10 Science', enrollDate: '2026-01-15', avatar: null, status: 'Active',
      billing: [
        { id: 'INV-001', cycle: 'Jan 2026', amount: 15000, discount: 0, net: 15000, status: 'Paid', dueDate: '2026-01-20' },
        { id: 'INV-002', cycle: 'Feb 2026', amount: 15000, discount: 1000, net: 14000, status: 'Paid', dueDate: '2026-02-20' },
        { id: 'INV-003', cycle: 'Mar 2026', amount: 15000, discount: 0, net: 15000, status: 'Paid', dueDate: '2026-03-20' },
        { id: 'INV-004', cycle: 'Apr 2026', amount: 15000, discount: 0, net: 15000, status: 'Paid', dueDate: '2026-04-20' },
        { id: 'INV-005', cycle: 'May 2026', amount: 15000, discount: 0, net: 15000, status: 'Paid', dueDate: '2026-05-20' },
        { id: 'INV-006', cycle: 'Jun 2026', amount: 15000, discount: 0, net: 15000, status: 'Paid', dueDate: '2026-06-20' },
        { id: 'INV-007', cycle: 'Jul 2026', amount: 15000, discount: 0, net: 15000, status: 'Overdue', dueDate: '2026-07-20' },
        { id: 'INV-008', cycle: 'Aug 2026', amount: 15000, discount: 0, net: 15000, status: 'Pending', dueDate: '2026-08-20' },
      ],
      extraClasses: [{ name: 'IELTS Prep', fee: 5000, months: [{ cycle: 'Jul 2026', status: 'Paid' }, { cycle: 'Aug 2026', status: 'Pending' }] }],
      courseFee: 15000, courseMonths: 12
    },
    { id: 'S002', name: 'Priya Gurung', email: 'priya@tms.edu', phone: '9841000002', class: 'Grade 10 Math', enrollDate: '2026-02-01', avatar: null, status: 'Active',
      billing: [
        { id: 'INV-010', cycle: 'Feb 2026', amount: 12000, discount: 0, net: 12000, status: 'Paid', dueDate: '2026-02-20' },
        { id: 'INV-011', cycle: 'Mar 2026', amount: 12000, discount: 0, net: 12000, status: 'Paid', dueDate: '2026-03-20' },
        { id: 'INV-012', cycle: 'Apr 2026', amount: 12000, discount: 0, net: 12000, status: 'Paid', dueDate: '2026-04-20' },
        { id: 'INV-013', cycle: 'May 2026', amount: 12000, discount: 2000, net: 10000, status: 'Paid', dueDate: '2026-05-20' },
        { id: 'INV-014', cycle: 'Jun 2026', amount: 12000, discount: 0, net: 12000, status: 'Paid', dueDate: '2026-06-20' },
        { id: 'INV-015', cycle: 'Jul 2026', amount: 12000, discount: 0, net: 12000, status: 'Paid', dueDate: '2026-07-20' },
        { id: 'INV-016', cycle: 'Aug 2026', amount: 12000, discount: 0, net: 12000, status: 'Pending', dueDate: '2026-08-20' },
      ],
      extraClasses: [],
      courseFee: 12000, courseMonths: 12
    },
    { id: 'S003', name: 'Rohan Sharma', email: 'rohan@tms.edu', phone: '9841000003', class: 'Grade 12 Physics', enrollDate: '2026-03-01', avatar: null, status: 'Blocked',
      billing: [
        { id: 'INV-020', cycle: 'Mar 2026', amount: 18000, discount: 0, net: 18000, status: 'Paid', dueDate: '2026-03-20' },
        { id: 'INV-021', cycle: 'Apr 2026', amount: 18000, discount: 0, net: 18000, status: 'Overdue', dueDate: '2026-04-20' },
        { id: 'INV-022', cycle: 'May 2026', amount: 18000, discount: 0, net: 18000, status: 'Overdue', dueDate: '2026-05-20' },
      ],
      extraClasses: [{ name: 'Advanced Calculus', fee: 8000, months: [{ cycle: 'Mar 2026', status: 'Paid' }, { cycle: 'Apr 2026', status: 'Overdue' }] }],
      courseFee: 18000, courseMonths: 12
    },
  ]);

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.class.toLowerCase().includes(search.toLowerCase()));

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const futureBilling = (s: any) => {
    const paidMonths = s.billing.filter((b: any) => b.status === 'Paid').length;
    const remaining = s.courseMonths - paidMonths;
    return { remaining: Math.max(0, remaining), projected: Math.max(0, remaining) * s.courseFee };
  };

  const [isAdding, setIsAdding] = useState(false);
  const [newStudent, setNewStudent] = useState<any>({ name: '', email: '', phone: '', class: '', status: 'Active' });
  const handleDelete = (id: string) => { if (window.confirm('Remove this student?')) { setStudents(prev => prev.filter(s => s.id !== id)); setSelectedStudent(null); } };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 500));
      if (isAdding) {
        setStudents(prev => [{ ...newStudent, id: `S${Date.now()}`, enrollDate: new Date().toISOString().split('T')[0], avatar: null, billing: [], extraClasses: [], courseFee: 15000, courseMonths: 12 }, ...prev]);
        setIsAdding(false);
      } else {
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? selectedStudent : s));
        setEditMode(false);
      }
    }, `Student ${isAdding ? 'added' : 'updated'} successfully.`);
  };

  return (
    <Page title="Branch Students" description="View all student profiles, billing history, future billing projections, and extra classes.">
      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input style={{ ...field, width: '320px' }} placeholder="Search by name or class..." value={search} onChange={e => setSearch(e.target.value)} />
            <StatusBadge variant="info">{filtered.length} students</StatusBadge>
          </div>
          <Button onClick={() => { setIsAdding(true); setSelectedStudent(null); }}>Add Student</Button>
        </div>

        {isAdding && (
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px' }}>Add New Student</h3>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
            <form onSubmit={handleSave} style={form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Name<input required style={field} value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} /></label>
                <label style={label}>Email<input required type="email" style={field} value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} /></label>
                <label style={label}>Phone<input required style={field} value={newStudent.phone} onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })} /></label>
                <label style={label}>Class<input required style={field} value={newStudent.class} onChange={e => setNewStudent({ ...newStudent, class: e.target.value })} /></label>
              </div>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy} style={{ width: 'fit-content', marginTop: '12px' }}>{action.busy ? 'Saving...' : 'Save Student'}</Button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(s => (
            <div key={s.id} onClick={() => { setSelectedStudent(s); setEditMode(false); setIsAdding(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', border: `1px solid ${selectedStudent?.id === s.id ? 'var(--color-primary)' : 'var(--border)'}`, borderRadius: '12px', cursor: 'pointer', background: selectedStudent?.id === s.id ? 'var(--color-primary-soft, #e6f0fa)' : '#fff' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>{initials(s.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{s.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{s.class} · {s.email}</div>
              </div>
              <StatusBadge variant={s.status === 'Active' ? 'success' : s.status === 'Blocked' ? 'error' : 'warning'}>{s.status}</StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      {selectedStudent && (
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '22px' }}>{initials(selectedStudent.name)}</div>
              <div>
                <h2 style={{ fontSize: '20px' }}>{selectedStudent.name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{selectedStudent.class} · Enrolled {selectedStudent.enrollDate}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>{editMode ? 'Cancel Edit' : 'Edit'}</Button>
              <Button variant="outline" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => handleDelete(selectedStudent.id)}>Delete</Button>
            </div>
          </div>

          {editMode ? (
            <form onSubmit={handleSave} style={form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Name<input required style={field} value={selectedStudent.name} onChange={e => setSelectedStudent({ ...selectedStudent, name: e.target.value })} /></label>
                <label style={label}>Email<input required type="email" style={field} value={selectedStudent.email} onChange={e => setSelectedStudent({ ...selectedStudent, email: e.target.value })} /></label>
                <label style={label}>Phone<input required style={field} value={selectedStudent.phone} onChange={e => setSelectedStudent({ ...selectedStudent, phone: e.target.value })} /></label>
                <label style={label}>Class<input required style={field} value={selectedStudent.class} onChange={e => setSelectedStudent({ ...selectedStudent, class: e.target.value })} /></label>
              </div>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy} style={{ width: 'fit-content', marginTop: '12px' }}>{action.busy ? 'Saving...' : 'Save Changes'}</Button>
            </form>
          ) : (
            <>
              {/* Student Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', marginBottom: '20px' }}>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</div><div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedStudent.email}</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone</div><div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedStudent.phone}</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</div><StatusBadge variant={selectedStudent.status === 'Active' ? 'success' : 'error'}>{selectedStudent.status}</StatusBadge></div>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Student ID</div><div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedStudent.id}</div></div>
              </div>

              {/* Future Billing Projection */}
              <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e6f0fa 0%, #f0e6fa 100%)', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(102,126,234,0.2)' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📊 1-Year Future Billing Projection</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Fee</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>NPR {selectedStudent.courseFee.toLocaleString()}</div></div>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Remaining Months</div><div style={{ fontSize: '20px', fontWeight: 700 }}>{futureBilling(selectedStudent).remaining}</div></div>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Projected Total Due</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-error)' }}>NPR {futureBilling(selectedStudent).projected.toLocaleString()}</div></div>
                </div>
              </div>

              {/* Billing History */}
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Billing History</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}><th style={{ padding: '8px' }}>Cycle</th><th style={{ padding: '8px' }}>Amount</th><th style={{ padding: '8px' }}>Discount</th><th style={{ padding: '8px' }}>Net</th><th style={{ padding: '8px' }}>Due Date</th><th style={{ padding: '8px' }}>Status</th></tr></thead>
                <tbody>
                  {selectedStudent.billing.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{b.cycle}</td>
                      <td style={{ padding: '10px 8px' }}>NPR {b.amount.toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', color: b.discount > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>{b.discount > 0 ? `−NPR ${b.discount.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>NPR {b.net.toLocaleString()}</td>
                      <td style={{ padding: '10px 8px' }}>{b.dueDate}</td>
                      <td style={{ padding: '10px 8px' }}><StatusBadge variant={b.status === 'Paid' ? 'success' : b.status === 'Overdue' ? 'error' : 'warning'}>{b.status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Extra Classes */}
              {selectedStudent.extraClasses.length > 0 && (
                <>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Optional Extra Classes</h3>
                  {selectedStudent.extraClasses.map((ec: any, idx: number) => (
                    <div key={idx} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontWeight: 600 }}>{ec.name}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NPR {ec.fee.toLocaleString()} / month</div></div>
                        <StatusBadge variant="info">Extra Class</StatusBadge>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {ec.months.map((m: any, mi: number) => (
                          <div key={mi} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: m.status === 'Paid' ? 'var(--color-success-soft, #eaf8f0)' : 'var(--color-warning-soft, #fff8e6)', color: m.status === 'Paid' ? 'var(--color-success)' : 'var(--color-warning)' }}>{m.cycle}: {m.status}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </Card>
      )}
    </Page>
  );
}

// ─── BRANCH TEACHERS VIEW ───────────────────────────────────────────────────────
function BranchTeachersView() {
  const [search, setSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'timetable' | 'payroll'>('profile');
  const [editMode, setEditMode] = useState(false);
  const action = useAction();

  const [teachers, setTeachers] = useState([
    { id: 'T001', name: 'Sanjay Rai', email: 'sanjay@tms.edu', phone: '9841200001', qualification: 'M.Sc. Physics', status: 'Active',
      classes: [
        { name: 'Grade 10 Science', subject: 'Physics', syllabusTotal: 24, syllabusCompleted: 18 },
        { name: 'Grade 12 Physics', subject: 'Advanced Physics', syllabusTotal: 30, syllabusCompleted: 12 },
      ],
      timetable: [
        { id: 'TT1', day: 'Monday', time: '08:00 - 09:30', class: 'Grade 10', subject: 'Physics', room: 'Room 302' },
        { id: 'TT2', day: 'Monday', time: '10:00 - 11:30', class: 'Grade 12', subject: 'Adv. Physics', room: 'Lab 1' },
        { id: 'TT3', day: 'Wednesday', time: '08:00 - 09:30', class: 'Grade 10', subject: 'Physics', room: 'Room 302' },
        { id: 'TT4', day: 'Thursday', time: '10:00 - 11:30', class: 'Grade 12', subject: 'Adv. Physics', room: 'Lab 1' },
        { id: 'TT5', day: 'Friday', time: '08:00 - 09:30', class: 'Grade 10', subject: 'Physics', room: 'Room 302' },
      ],
      salary: 45000, extraClassPay: 10000,
      payroll: [
        { month: 'May 2026', base: 45000, extra: 10000, deductions: 2000, net: 53000, status: 'Paid' },
        { month: 'Jun 2026', base: 45000, extra: 10000, deductions: 2000, net: 53000, status: 'Paid' },
        { month: 'Jul 2026', base: 45000, extra: 10000, deductions: 2000, net: 53000, status: 'Paid' },
        { month: 'Aug 2026', base: 45000, extra: 10000, deductions: 2000, net: 53000, status: 'Pending' },
      ],
      attendance30: { present: 22, absent: 4, leave: 2, total: 28 },
      extraClasses: [{ name: 'Advanced Calculus (1:1)', fee: 10000 }],
    },
    { id: 'T002', name: 'Rina Karki', email: 'rina@tms.edu', phone: '9841200002', qualification: 'M.A. English', status: 'Active',
      classes: [
        { name: 'IELTS Prep', subject: 'English', syllabusTotal: 20, syllabusCompleted: 15 },
        { name: 'Grade 10 Math', subject: 'Mathematics', syllabusTotal: 28, syllabusCompleted: 20 },
      ],
      timetable: [
        { id: 'TT6', day: 'Monday', time: '12:00 - 01:30', class: 'IELTS Prep', subject: 'English', room: 'Room 105' },
        { id: 'TT7', day: 'Tuesday', time: '08:00 - 09:30', class: 'Grade 10', subject: 'Mathematics', room: 'Room 201' },
        { id: 'TT8', day: 'Thursday', time: '08:00 - 09:30', class: 'IELTS Prep', subject: 'English', room: 'Room 105' },
      ],
      salary: 40000, extraClassPay: 0,
      payroll: [
        { month: 'Jun 2026', base: 40000, extra: 0, deductions: 1500, net: 38500, status: 'Paid' },
        { month: 'Jul 2026', base: 40000, extra: 0, deductions: 1500, net: 38500, status: 'Paid' },
        { month: 'Aug 2026', base: 40000, extra: 0, deductions: 1500, net: 38500, status: 'Pending' },
      ],
      attendance30: { present: 24, absent: 2, leave: 2, total: 28 },
      extraClasses: [],
    },
  ]);

  const filtered = teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleDelete = (id: string) => { if (window.confirm('Remove this teacher?')) { setTeachers(prev => prev.filter(t => t.id !== id)); setSelectedTeacher(null); } };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    void action.run(async () => {
      await new Promise(r => setTimeout(r, 500));
      setTeachers(prev => prev.map(t => t.id === selectedTeacher.id ? selectedTeacher : t));
      setEditMode(false);
    }, 'Teacher details updated.');
  };

  const deleteTimetableEntry = (ttId: string) => {
    const updated = { ...selectedTeacher, timetable: selectedTeacher.timetable.filter((t: any) => t.id !== ttId) };
    setSelectedTeacher(updated);
    setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  return (
    <Page title="Branch Teachers" description="View all teacher profiles, payroll, classes, syllabus progress, timetable, and attendance.">
      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <input style={{ ...field, maxWidth: '320px' }} placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
          <StatusBadge variant="info">{filtered.length} teachers</StatusBadge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(t => (
            <div key={t.id} onClick={() => { setSelectedTeacher(t); setActiveTab('profile'); setEditMode(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', border: `1px solid ${selectedTeacher?.id === t.id ? 'var(--color-primary)' : 'var(--border)'}`, borderRadius: '12px', cursor: 'pointer', background: selectedTeacher?.id === t.id ? 'var(--color-primary-soft, #e6f0fa)' : '#fff' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>{initials(t.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{t.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t.qualification} · {t.classes.map((c: any) => c.subject).join(', ')}</div>
              </div>
              <StatusBadge variant="success">{t.status}</StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      {selectedTeacher && (
        <Card hoverable={false}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '22px' }}>{initials(selectedTeacher.name)}</div>
              <div>
                <h2 style={{ fontSize: '20px' }}>{selectedTeacher.name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{selectedTeacher.qualification} · ID: {selectedTeacher.id}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" onClick={() => { setEditMode(!editMode); setActiveTab('profile'); }}>{editMode ? 'Cancel' : 'Edit'}</Button>
              <Button variant="outline" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => handleDelete(selectedTeacher.id)}>Delete</Button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <Button variant={activeTab === 'profile' ? 'primary' : 'outline'} onClick={() => setActiveTab('profile')}>Profile & Classes</Button>
            <Button variant={activeTab === 'timetable' ? 'primary' : 'outline'} onClick={() => setActiveTab('timetable')}>Timetable</Button>
            <Button variant={activeTab === 'payroll' ? 'primary' : 'outline'} onClick={() => setActiveTab('payroll')}>Payroll</Button>
          </div>

          {editMode ? (
            <form onSubmit={handleSave} style={form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={label}>Name<input style={field} value={selectedTeacher.name} onChange={e => setSelectedTeacher({ ...selectedTeacher, name: e.target.value })} /></label>
                <label style={label}>Email<input style={field} value={selectedTeacher.email} onChange={e => setSelectedTeacher({ ...selectedTeacher, email: e.target.value })} /></label>
                <label style={label}>Phone<input style={field} value={selectedTeacher.phone} onChange={e => setSelectedTeacher({ ...selectedTeacher, phone: e.target.value })} /></label>
                <label style={label}>Qualification<input style={field} value={selectedTeacher.qualification} onChange={e => setSelectedTeacher({ ...selectedTeacher, qualification: e.target.value })} /></label>
              </div>
              <Feedback message={action.message} error={action.error} />
              <Button type="submit" disabled={action.busy}>{action.busy ? 'Saving...' : 'Save Changes'}</Button>
            </form>
          ) : activeTab === 'profile' ? (
            <>
              {/* Contact Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', marginBottom: '20px' }}>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</div><div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedTeacher.email}</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone</div><div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedTeacher.phone}</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</div><StatusBadge variant="success">{selectedTeacher.status}</StatusBadge></div>
                <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Salary</div><div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary)' }}>NPR {selectedTeacher.salary.toLocaleString()}</div></div>
              </div>

              {/* 30-Day Attendance */}
              <div style={{ padding: '16px', background: 'linear-gradient(135deg, #eaf8f0 0%, #e6f0fa 100%)', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📅 Last 30 Days Attendance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div><div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)' }}>{selectedTeacher.attendance30.present}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Present</div></div>
                  <div><div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-error)' }}>{selectedTeacher.attendance30.absent}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Absent</div></div>
                  <div><div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-warning)' }}>{selectedTeacher.attendance30.leave}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>On Leave</div></div>
                  <div><div style={{ fontSize: '24px', fontWeight: 700 }}>{Math.round(selectedTeacher.attendance30.present / selectedTeacher.attendance30.total * 100)}%</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rate</div></div>
                </div>
              </div>

              {/* Assigned Classes & Syllabus */}
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Assigned Classes & Syllabus Progress</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {selectedTeacher.classes.map((c: any, idx: number) => {
                  const pct = Math.round(c.syllabusCompleted / c.syllabusTotal * 100);
                  return (
                    <div key={idx} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subject: {c.subject}</div></div>
                        <StatusBadge variant={pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'error'}>{pct}% complete</StatusBadge>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--color-surface)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: pct >= 75 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{c.syllabusCompleted} of {c.syllabusTotal} chapters completed</div>
                    </div>
                  );
                })}
              </div>

              {/* Extra Classes */}
              {selectedTeacher.extraClasses.length > 0 && (
                <>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Extra Classes</h3>
                  {selectedTeacher.extraClasses.map((ec: any, idx: number) => (
                    <div key={idx} style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>{ec.name}</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>NPR {ec.fee.toLocaleString()} / month</div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : activeTab === 'timetable' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px' }}>Weekly Timetable</h3>
                <Button onClick={() => {
                  const newEntry = { id: `TT${Date.now()}`, day: 'Monday', time: '08:00 - 09:30', class: '', subject: '', room: '' };
                  const updated = { ...selectedTeacher, timetable: [...selectedTeacher.timetable, newEntry] };
                  setSelectedTeacher(updated);
                  setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t));
                }}>Add Session</Button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}><th style={{ padding: '8px' }}>Day</th><th style={{ padding: '8px' }}>Time</th><th style={{ padding: '8px' }}>Class</th><th style={{ padding: '8px' }}>Subject</th><th style={{ padding: '8px' }}>Room</th><th style={{ padding: '8px' }}>Actions</th></tr></thead>
                <tbody>
                  {selectedTeacher.timetable.map((tt: any) => (
                    <tr key={tt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{tt.day}</td>
                      <td style={{ padding: '10px 8px' }}>{tt.time}</td>
                      <td style={{ padding: '10px 8px' }}>{tt.class}</td>
                      <td style={{ padding: '10px 8px' }}>{tt.subject}</td>
                      <td style={{ padding: '10px 8px' }}>{tt.room}</td>
                      <td style={{ padding: '10px 8px' }}><Button variant="outline" style={{ padding: '2px 8px', minHeight: 'unset', height: '24px', fontSize: '11px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => deleteTimetableEntry(tt.id)}>Delete</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              {/* Payroll Projection */}
              <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e6f0fa 0%, #f0e6fa 100%)', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>💰 1-Month Ahead Payroll Projection</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Salary</div><div style={{ fontSize: '20px', fontWeight: 700 }}>NPR {selectedTeacher.salary.toLocaleString()}</div></div>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Extra Classes</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>NPR {selectedTeacher.extraClassPay.toLocaleString()}</div></div>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Est. Deductions</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-error)' }}>NPR 2,000</div></div>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Projected Net</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)' }}>NPR {(selectedTeacher.salary + selectedTeacher.extraClassPay - 2000).toLocaleString()}</div></div>
                </div>
              </div>

              {/* Payroll History */}
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Payroll History</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}><th style={{ padding: '8px' }}>Month</th><th style={{ padding: '8px' }}>Base</th><th style={{ padding: '8px' }}>Extra</th><th style={{ padding: '8px' }}>Deductions</th><th style={{ padding: '8px' }}>Net</th><th style={{ padding: '8px' }}>Status</th></tr></thead>
                <tbody>
                  {selectedTeacher.payroll.map((p: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{p.month}</td>
                      <td style={{ padding: '10px 8px' }}>NPR {p.base.toLocaleString()}</td>
                      <td style={{ padding: '10px 8px' }}>{p.extra > 0 ? `NPR ${p.extra.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--color-error)' }}>−NPR {p.deductions.toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>NPR {p.net.toLocaleString()}</td>
                      <td style={{ padding: '10px 8px' }}><StatusBadge variant={p.status === 'Paid' ? 'success' : 'warning'}>{p.status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}
    </Page>
  );
}

export function BranchAdminWorkspace() { const path = useLocation().pathname; if (path.includes('appointments')) return <AppointmentsView />; if (path.includes('leave-requests')) return <LeaveRequestsView />; if (path.includes('petty-cash')) return <PettyCashView />; if (path.includes('student-exceptions')) return <StudentExceptions />; if (path.includes('personalized-classes')) return <PersonalizedClassesView />; if (path.includes('resource-logs')) return <ResourceTasks />; if (path.includes('academic-calendar')) return <BranchCalendarView />; if (path.includes('social-media') || path.includes('announcements')) return <Drafting />; if (path.includes('attendance')) return <AttendanceView />; if (path.includes('homework')) return <HomeworkView />; if (path.includes('results')) return <ResultsView />; if (path.includes('fees')) return <FeeBillingView />; if (path.includes('certificates')) return <CertificatesView />; if (path.includes('timetable')) return <TimetableView />; if (path.includes('teachers')) return <BranchTeachersView />; if (path.includes('students')) return <BranchStudentsView />; return <Page title="Branch operations" description="This workspace is limited to your assigned physical branch."><Card hoverable={false}>Choose a branch operation from the navigation.</Card></Page>; }
