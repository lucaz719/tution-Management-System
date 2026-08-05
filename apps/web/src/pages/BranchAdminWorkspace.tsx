import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';

function CalendarGrid({ onDateClick, events }: { onDateClick: (date: Date) => void; events: Record<string, string> }) {
  const days = Array.from({ length: 30 }, (_, i) => new Date(2026, 7, i + 1));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '16px' }}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
      ))}
      {days.map((date) => {
        const dateStr = date.toISOString().split('T')[0];
        const hasEvent = !!events[dateStr];
        return (
          <div
            key={dateStr}
            onClick={() => onDateClick(date)}
            style={{
              padding: '12px 8px', textAlign: 'center', border: '1px solid var(--border)',
              borderRadius: '8px', cursor: 'pointer', background: hasEvent ? 'var(--color-primary-soft, #e6f0fa)' : '#fff',
              color: hasEvent ? 'var(--color-primary)' : 'var(--text)', fontWeight: hasEvent ? 700 : 400
            }}
          >
            {date.getDate()}
            {hasEvent && <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--color-primary)' }}>{events[dateStr]}</div>}
          </div>
        );
      })}
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

function Approvals() {
  const action = useAction(); const [id, setId] = useState(''); const [reason, setReason] = useState(''); const [kind, setKind] = useState<'leave' | 'petty'>('leave'); const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  
  // Mock monthly limit for branch admin
  const monthlyLimit = 50000;
  const currentUsage = 45000;
  const availableLimit = monthlyLimit - currentUsage;
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const isOutOfLimit = requestAmount > availableLimit;

  const submit = (event: FormEvent) => { 
    event.preventDefault(); 
    if (decision === 'REJECT' && !reason.trim()) return; 
    
    let successMessage = '';
    let apiCall: Promise<unknown>;
    
    if (kind === 'leave') {
      apiCall = api.branchAdmin.decideLeave(id, decision, reason);
      successMessage = decision === 'APPROVE' ? 'Leave approved (Level 1). Forwarded to Tenant Admin for final decision.' : 'Leave request rejected.';
    } else {
      if (decision === 'APPROVE') {
        if (isOutOfLimit) {
          apiCall = api.finances.approvePettyCash(id, 'FORWARD_TO_TENANT', reason);
          successMessage = 'Out of limit: Request forwarded to Tenant Admin for approval.';
        } else {
          apiCall = api.finances.approvePettyCash(id, 'APPROVE_FINAL', reason);
          successMessage = 'Petty cash approved and granted (within monthly limit).';
        }
      } else {
        apiCall = api.finances.decidePettyCash(id, 'REJECT', reason);
        successMessage = 'Petty cash request rejected.';
      }
    }
    
    void action.run(() => apiCall, successMessage); 
  };
  
  const reasonMissing = decision === 'REJECT' && !reason.trim();
  
  return <Page title={kind === 'leave' ? "Leave Approvals" : "Petty Cash Approvals"} description={kind === 'leave' ? "Branch Admin gives first-level approval/rejection, then it forwards to Tenant Admin for final." : "Manage petty cash requests. If within limit, grant directly. If out of limit, forward to Tenant Admin."}>
    {kind === 'petty' && (
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
    )}
    <Card hoverable={false}>
      <form onSubmit={submit} style={form} aria-busy={action.busy}>
        <label style={label} htmlFor="approval-kind">Request type<select id="approval-kind" value={kind} onChange={e => { setKind(e.target.value as 'leave' | 'petty'); setRequestAmount(0); }} style={field}><option value="leave">Staff leave</option><option value="petty">Petty cash</option></select></label>
        <label style={label} htmlFor="approval-id">Request ID (required)<input id="approval-id" required value={id} onChange={e => setId(e.target.value)} style={field} /></label>
        {kind === 'petty' && (
          <label style={label} htmlFor="approval-amount">Requested Amount (NPR)<input id="approval-amount" type="number" required value={requestAmount || ''} onChange={e => setRequestAmount(Number(e.target.value))} style={field} /></label>
        )}
        <label style={label} htmlFor="approval-decision">Decision<select id="approval-decision" value={decision} onChange={e => setDecision(e.target.value as 'APPROVE' | 'REJECT')} style={field}><option value="APPROVE">Approve</option><option value="REJECT">Reject</option></select></label>
        <label style={label} htmlFor="approval-reason">Reason {decision === 'REJECT' ? '(required)' : '(optional)'}<textarea id="approval-reason" value={reason} onChange={e => setReason(e.target.value)} aria-invalid={reasonMissing || undefined} aria-describedby={reasonMissing ? 'approval-reason-error' : undefined} style={{ ...field, minHeight: 84 }} />{reasonMissing && <span id="approval-reason-error" style={{ color: 'var(--color-error)', fontWeight: 600 }}>Enter a reason before rejecting this request.</span>}</label>
        <Feedback message={action.message} error={action.error} /><Button type="submit" disabled={action.busy || !id.trim() || reasonMissing || (kind === 'petty' && requestAmount <= 0)}>{action.busy ? 'Saving decision…' : 'Save decision'}</Button>
      </form>
    </Card>
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
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers' | 'students'>('classes');
  return (
    <Page title="Personalized Classes" description="Manage 1:1 or small-group classes. Manage their specific teachers and students here.">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <Button variant={activeTab === 'classes' ? 'primary' : 'outline'} onClick={() => setActiveTab('classes')}>Classes</Button>
        <Button variant={activeTab === 'teachers' ? 'primary' : 'outline'} onClick={() => setActiveTab('teachers')}>Manage Teachers</Button>
        <Button variant={activeTab === 'students' ? 'primary' : 'outline'} onClick={() => setActiveTab('students')}>Manage Students</Button>
      </div>
      <Card hoverable={false}>
        {activeTab === 'classes' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Active Classes</h2>
              <Button>Create Class</Button>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Advanced Physics Tutoring (1:1)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Teacher: Sanjay Rai | Student: Aakash Bista</div>
                <div style={{ color: 'var(--color-primary)', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>NPR 10,000 / month</div>
              </div>
            </div>
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

function BranchCalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const events = { '2026-08-15': 'Independence Day Holiday', '2026-08-20': 'Parent-Teacher Meeting', '2026-08-25': 'Mid-Term Exams Begin' };
  
  return (
    <Page title="Branch Academic Calendar" description="View and add upcoming events for this branch.">
      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px' }}>Calendar</h2>
            <Button>Add Event</Button>
          </div>
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

function ResourceTasks() { const action = useAction(); const [branchId, setBranchId] = useState(''); const [taskId, setTaskId] = useState(''); return <Page title="Resource and maintenance" description="Action-required logs auto-assign maintenance staff; escalated tasks remain visible for direct follow-up."><Card hoverable={false}><div style={form}><label style={label}>Branch ID<input value={branchId} onChange={e => setBranchId(e.target.value)} style={field} /></label><label style={label}>Task ID<input value={taskId} onChange={e => setTaskId(e.target.value)} style={field} /></label><Feedback message={action.message} error={action.error} /><Button disabled={action.busy || !taskId.trim()} onClick={() => void action.run(() => api.branchAdmin.completeMaintenanceTask(taskId), 'Task marked complete with actor and timestamp recorded.')}>Complete task</Button></div></Card><Card hoverable={false}><h2 style={{ fontSize: 18 }}>Escalation policy</h2><p style={{ marginTop: 8, color: 'var(--color-text-muted, rgba(44,62,80,.7))' }}>Tasks unresolved after the Tenant Admin-configured threshold are marked escalated. Default assignment remains branch-scoped.</p><StatusBadge variant="warning">Requires follow-up</StatusBadge></Card></Page>; }

function Drafting() { const action = useAction(); const [branchId, setBranchId] = useState(''); const [text, setText] = useState(''); const [platform, setPlatform] = useState('Facebook'); const [proposedTime, setProposedTime] = useState(''); const submit = (event: FormEvent) => { event.preventDefault(); void action.run(() => api.branchAdmin.createSocialDraft({ branchId, text, platforms: [platform], mediaUrls: [], proposedTime: proposedTime || undefined }), 'Draft submitted to Tenant Admin. Nothing was published.'); }; return <Page title="Social media drafts" description="Prepare branch posts for Tenant Admin approval. Branch Admins cannot publish directly."><Card hoverable={false}><form onSubmit={submit} style={form} aria-busy={action.busy}><label style={label}>Branch ID (required)<input required value={branchId} onChange={e => setBranchId(e.target.value)} style={field} /></label><label style={label}>Post text (required)<textarea required value={text} onChange={e => setText(e.target.value)} style={{ ...field, minHeight: 112 }} /></label><label style={label}>Target platform<select value={platform} onChange={e => setPlatform(e.target.value)} style={field}><option>Facebook</option><option>Instagram</option><option>LinkedIn</option></select></label><label style={label}>Proposed schedule<input type="datetime-local" value={proposedTime} onChange={e => setProposedTime(e.target.value)} style={field} /></label><Feedback message={action.message} error={action.error} /><Button type="submit" disabled={action.busy || !text.trim() || !branchId.trim()}>{action.busy ? 'Submitting…' : 'Submit for approval'}</Button><Button disabled variant="outline">Direct publishing unavailable</Button></form></Card></Page>; }

function AttendanceView() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const events = { '2026-08-01': '98% Present', '2026-08-02': '95% Present', '2026-08-03': '97% Present', '2026-08-04': '99% Present' };
  return (
    <Page title="Branch Attendance" description="Click on any date to view complete attendance records for all staff, teachers, and students.">
      <Card hoverable={false}>
        <h2 style={{ fontSize: '18px' }}>Attendance Calendar</h2>
        <CalendarGrid onDateClick={setSelectedDate} events={events} />
      </Card>
      {selectedDate && (
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px' }}>Records for {selectedDate.toLocaleDateString()}</h2>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Teachers</span><StatusBadge variant="success">100% Present</StatusBadge>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Support Staff</span><StatusBadge variant="warning">80% Present</StatusBadge>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Students</span><StatusBadge variant="success">96% Present</StatusBadge>
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
  return (
    <Page title="Branch Homework" description="View all today's homework for all classes and subjects, or click past dates to see history.">
      <Card hoverable={false}>
        <h2 style={{ fontSize: '18px' }}>Homework Calendar</h2>
        <CalendarGrid onDateClick={setSelectedDate} events={events} />
      </Card>
      {selectedDate && (
        <Card hoverable={false}>
          <h2 style={{ fontSize: '18px' }}>Homework assigned on {selectedDate.toLocaleDateString()}</h2>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Mathematics (Grade 8)</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Assigned by Rina Karki</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Science (Grade 10)</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Assigned by Sanjay Rai</div>
            </div>
          </div>
        </Card>
      )}
    </Page>
  );
}

function ResultsView() {
  return (
    <Page title="Branch Results" description="Complete CRUD operations for results across all classes and subjects in the branch.">
      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Recent Results</h2>
          <Button>Add New Result</Button>
        </div>
        <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Exam</th>
              <th style={{ padding: '8px' }}>Subject</th>
              <th style={{ padding: '8px' }}>Class</th>
              <th style={{ padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 8px' }}>Mid Term</td>
              <td style={{ padding: '12px 8px' }}>Mathematics</td>
              <td style={{ padding: '12px 8px' }}>Grade 10</td>
              <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }}>Edit</Button>
                <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Delete</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

function FeeBillingView() {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'courses' | 'discounts'>('students');
  return (
    <Page title="Fee & Billing Management" description="Manage course fees, student billing, teacher payroll, and discount coupons.">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <Button variant={activeTab === 'students' ? 'primary' : 'outline'} onClick={() => setActiveTab('students')}>Students</Button>
        <Button variant={activeTab === 'teachers' ? 'primary' : 'outline'} onClick={() => setActiveTab('teachers')}>Teachers</Button>
        <Button variant={activeTab === 'courses' ? 'primary' : 'outline'} onClick={() => setActiveTab('courses')}>Courses</Button>
        <Button variant={activeTab === 'discounts' ? 'primary' : 'outline'} onClick={() => setActiveTab('discounts')}>Discounts</Button>
      </div>

      <Card hoverable={false}>
        {activeTab === 'discounts' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Discount Coupons</h2>
              <Button>Request Coupon from Tenant Admin</Button>
            </div>
            <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Apply discounts to individual students or an entire class.</p>
            
            <div style={{ marginTop: '24px', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ fontSize: '15px' }}>Apply Discount</h3>
              <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                <label style={label}>Coupon Code<input style={field} placeholder="e.g. SUMMER2026" /></label>
                <label style={label}>Target<select style={field}><option>Specific Student</option><option>Entire Class</option></select></label>
                <label style={label}>Target ID<input style={field} placeholder="Student ID or Class ID" /></label>
                <Button style={{ width: 'fit-content' }}>Apply Coupon</Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', textTransform: 'capitalize' }}>{activeTab} Billing Records</h2>
              <Button>Add Record</Button>
            </div>
            <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Amount</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 8px' }}>{activeTab === 'students' ? 'STU-001' : activeTab === 'teachers' ? 'TCH-001' : 'CRS-001'}</td>
                  <td style={{ padding: '12px 8px' }}>Example Record</td>
                  <td style={{ padding: '12px 8px' }}>NPR 5,000</td>
                  <td style={{ padding: '12px 8px' }}><StatusBadge variant="success">Cleared</StatusBadge></td>
                  <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                    <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px' }}>Edit</Button>
                    <Button variant="outline" style={{ padding: '4px 8px', minHeight: 'unset', height: '28px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Delete</Button>
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

export function BranchAdminWorkspace() { const path = useLocation().pathname; if (path.includes('leave-requests') || path.includes('petty-cash')) return <Approvals />; if (path.includes('students') && !path.includes('fees')) return <StudentExceptions />; if (path.includes('personalized-classes')) return <PersonalizedClassesView />; if (path.includes('resource-logs')) return <ResourceTasks />; if (path.includes('academic-calendar')) return <BranchCalendarView />; if (path.includes('social-media') || path.includes('announcements')) return <Drafting />; if (path.includes('attendance')) return <AttendanceView />; if (path.includes('homework')) return <HomeworkView />; if (path.includes('results')) return <ResultsView />; if (path.includes('fees')) return <FeeBillingView />; return <Page title="Branch operations" description="This workspace is limited to your assigned physical branch."><Card hoverable={false}>Choose a branch operation from the navigation.</Card></Page>; }
