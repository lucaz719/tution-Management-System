import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  invoiceTotal,
  parentAppointments,
  parentAttendance,
  parentCertificates,
  parentChildren,
  parentEvents,
  parentInvoices,
  parentLeaves,
  parentMessages,
  parentNotifications,
  parentRemarks,
  parentSessions,
  parentTeachers,
} from '../features/parent/parentPortalData';
import type {
  AppointmentState,
  AttendanceState,
  InvoiceState,
  LeaveState,
  ParentChild,
  ParentInvoice,
  ParentTone,
  ParentView,
} from '../features/parent/parentPortalTypes';
import '../features/parent/parentPortal.css';

const VIEW_COPY: Record<ParentView, [string, string]> = {
  home: ['Family overview', 'A private, child-specific view of today’s priorities.'],
  timetable: ['Timetable', 'Every class shown only for the selected child.'],
  attendance: ['Attendance', 'Teacher-marked sessions and approved-leave outcomes.'],
  performance: ['Performance & remarks', 'Only institution-approved, parent-visible insights.'],
  messages: ['Teacher messages', 'Conversations remain separate for each child and teacher.'],
  appointments: ['Appointments', 'Requests, alternatives, approvals, and final confirmations.'],
  leave: ['Leave management', 'Planned leave and branch-recorded emergency departures.'],
  fees: ['Fees & payment', 'Child-specific invoices, due dates, and Nepal Pay.'],
  certificates: ['Certificates', 'Permanent issued-document history for the selected child.'],
  calendar: ['Academic calendar', 'Exams, holidays, ceremonies, and fee deadlines.'],
  notifications: ['Notifications', 'Push and SMS activity scoped to the selected child.'],
};

function icon(name: string) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

function money(value: number) {
  return `NPR ${Math.abs(value).toLocaleString('en-NP')}`;
}

function toneForAttendance(state: AttendanceState): ParentTone {
  return state === 'Present' ? 'success' : state === 'Absent' ? 'error' : 'warning';
}

function toneForInvoice(state: InvoiceState): ParentTone {
  return state === 'Paid' ? 'success' : state === 'Overdue' ? 'error' : state === 'Due soon' ? 'warning' : 'info';
}

function toneForAppointment(state: AppointmentState): ParentTone {
  return state === 'Approved' || state === 'Confirmed' ? 'success' : state === 'Rejected' ? 'error' : state === 'Alternative proposed' ? 'warning' : 'info';
}

function toneForLeave(state: LeaveState): ParentTone {
  return state === 'Approved' ? 'success' : state === 'Rejected' ? 'error' : state === 'Emergency departure' ? 'error' : 'warning';
}

function ParentStatus({ label, tone, iconName }: { label: string; tone: ParentTone; iconName: string }) {
  return <span className={`parent-status parent-status--${tone}`}>{icon(iconName)}<span>{label}</span></span>;
}

function SectionHeader({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="parent-section-head">
      <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {action && onAction ? <button type="button" className="parent-text-button" onClick={onAction}>{action}{icon('arrow_forward')}</button> : null}
    </div>
  );
}

function EmptyState({ title, message, iconName }: { title: string; message: string; iconName: string }) {
  return <div className="parent-empty" role="status">{icon(iconName)}<h3>{title}</h3><p>{message}</p></div>;
}

function UnavailableState({ title, message }: { title: string; message: string }) {
  return <div className="parent-unavailable" role="status">{icon('construction')}<div><strong>{title}</strong><p>{message}</p></div></div>;
}

function ChildSwitcher({ activeChild, onSelect }: { activeChild: ParentChild; onSelect: (id: string) => void }) {
  return (
    <section className="parent-child-switcher" aria-labelledby="linked-children-title">
      <div><span className="parent-eyebrow">LINKED STUDENTS</span><h2 id="linked-children-title">Choose a child</h2><p>Every record below changes with this selection.</p></div>
      <div className="parent-child-tabs" role="group" aria-label="Linked children">
        {parentChildren.map((child) => {
          const active = child.id === activeChild.id;
          return <button key={child.id} type="button" aria-pressed={active} className={active ? 'is-active' : ''} onClick={() => onSelect(child.id)}><span>{child.initials}</span><span><strong>{child.name}</strong><small>{child.grade} · Roll {child.rollNumber}</small></span>{child.blocked ? icon('lock') : icon('verified')}</button>;
        })}
      </div>
    </section>
  );
}

function ChildContext({ child }: { child: ParentChild }) {
  return (
    <div className="parent-child-context" aria-label={`Currently viewing ${child.name}`}>
      <span className="parent-child-context__avatar">{child.initials}</span>
      <span><small>Currently viewing</small><strong>{child.name}</strong><small>{child.grade} · {child.branch}</small></span>
      <ParentStatus label={child.blocked ? 'Blocked' : 'Active'} tone={child.blocked ? 'error' : 'success'} iconName={child.blocked ? 'lock' : 'verified'} />
    </div>
  );
}

function SessionList({ childId, compact = false }: { childId: string; compact?: boolean }) {
  const sessions = parentSessions.filter((session) => session.childId === childId);
  if (!sessions.length) return <EmptyState title="No classes today" message="The next scheduled class will appear here." iconName="event_available" />;
  return <div className="parent-session-list">{sessions.map((session) => <article className="parent-session" key={session.id}><time><strong>{session.time}</strong><span>{session.endTime}</span></time><i aria-hidden="true" /><div><h3>{session.subject}</h3><p>{session.teacher} · {session.room}</p></div>{compact ? null : <ParentStatus label={session.type} tone="info" iconName="school" />}</article>)}</div>;
}

function DashboardView({ child, go }: { child: ParentChild; go: (view: ParentView) => void }) {
  const events = parentEvents.filter((event) => event.childId === child.id);
  const remarks = parentRemarks.filter((remark) => remark.childId === child.id && remark.parentVisible);
  const appointments = parentAppointments.filter((appointment) => appointment.childId === child.id);
  const leaves = parentLeaves.filter((leave) => leave.childId === child.id);
  return (
    <div className="parent-view">
      {child.blocked ? <section className="parent-alert parent-alert--error">{icon('lock')}<div><strong>{child.name} is blocked due to fee dues</strong><p>{money(child.outstanding)} remains outstanding. Academic and identity records are still visible.</p></div><button type="button" onClick={() => go('fees')}>View fees{icon('arrow_forward')}</button></section> : null}
      <section className="parent-hero"><div><span className="parent-eyebrow">WEDNESDAY · 29 JULY 2026</span><h2>{child.name}’s day at a glance</h2><p>Timetable, attendance, fees, remarks, and events are kept separate from every other linked child.</p></div><div className="parent-hero__summary"><span>Attendance</span><strong>{child.attendanceRate}%</strong><small>{child.blocked ? `${money(child.outstanding)} due` : 'Fees up to date'}</small></div></section>
      <div className="parent-dashboard-grid">
        <section className="parent-card"><SectionHeader title="Today’s timetable" description={`${parentSessions.filter((session) => session.childId === child.id).length} scheduled sessions`} action="Full timetable" onAction={() => go('timetable')} /><SessionList childId={child.id} compact /></section>
        <aside className="parent-card"><SectionHeader title="Parent-visible remarks" description="Internal institution notes are excluded." action="View performance" onAction={() => go('performance')} />{remarks.length ? <div className="parent-remark-list">{remarks.slice(0, 2).map((remark) => <article key={remark.id}><ParentStatus label={remark.signal} tone={remark.signal === 'Improving' ? 'success' : remark.signal === 'Needs support' ? 'warning' : 'info'} iconName={remark.signal === 'Improving' ? 'trending_up' : 'insights'} /><h3>{remark.subject}</h3><p>{remark.message}</p><small>{remark.author} · {remark.date}</small></article>)}</div> : <EmptyState title="No visible remarks" message="Approved teacher and admin remarks will appear here." iconName="visibility" />}</aside>
      </div>
      <section className="parent-metrics" aria-label={`${child.name} summary`}>
        <button type="button" onClick={() => go('attendance')}>{icon('fact_check')}<span><small>Attendance</small><strong>{child.attendanceRate}%</strong></span>{icon('arrow_forward')}</button>
        <button type="button" onClick={() => go('fees')}>{icon('payments')}<span><small>Outstanding</small><strong>{money(child.outstanding)}</strong></span>{icon('arrow_forward')}</button>
        <button type="button" onClick={() => go('appointments')}>{icon('event')}<span><small>Appointments</small><strong>{appointments.length}</strong></span>{icon('arrow_forward')}</button>
        <button type="button" onClick={() => go('leave')}>{icon('event_available')}<span><small>Leave records</small><strong>{leaves.length}</strong></span>{icon('arrow_forward')}</button>
      </section>
      <section className="parent-card"><SectionHeader title="Upcoming events" description={`Dates relevant to ${child.name}.`} action="Open calendar" onAction={() => go('calendar')} /><div className="parent-event-strip">{events.slice(0, 3).map((event) => <article key={event.id}><div><strong>{event.day}</strong><span>{event.month}</span></div><span><b>{event.title}</b><small>{event.kind}</small></span></article>)}</div></section>
    </div>
  );
}

function TimetableView({ child }: { child: ParentChild }) {
  return <div className="parent-view"><section className="parent-card"><SectionHeader title={`${child.name}’s merged schedule`} description="Regular, music, short-term, and personalized classes stay child-specific." /><SessionList childId={child.id} /></section><div className="parent-info-note">{icon('info')}<span>Switching children changes this schedule; sessions are never merged across siblings.</span></div></div>;
}

function AttendanceView({ child }: { child: ParentChild }) {
  const records = parentAttendance.filter((record) => record.childId === child.id);
  return <div className="parent-view"><section className="parent-attendance-summary"><div className="parent-ring" style={{ '--progress': `${child.attendanceRate}%` } as React.CSSProperties}><span>{child.attendanceRate}%</span></div><div><span className="parent-eyebrow">JULY 2026</span><h2>{child.name}’s attendance</h2><p>Approved leave appears as Absent (Excused).</p></div></section><section className="parent-card"><SectionHeader title="Session record" description="Read-only teacher-marked attendance." />{records.length ? <div className="parent-table-wrap"><table className="parent-table"><thead><tr><th>Date</th><th>Subject</th><th>Session</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.date}</td><td><strong>{record.subject}</strong></td><td>{record.session}</td><td><ParentStatus label={record.state} tone={toneForAttendance(record.state)} iconName={record.state === 'Present' ? 'check_circle' : record.state === 'Absent' ? 'cancel' : 'event_available'} /></td></tr>)}</tbody></table></div> : <EmptyState title="No attendance yet" message="Teacher-marked sessions will appear here." iconName="fact_check" />}</section></div>;
}

function PerformanceView({ child }: { child: ParentChild }) {
  const visible = parentRemarks.filter((remark) => remark.childId === child.id && remark.parentVisible);
  return <div className="parent-view"><div className="parent-privacy-note">{icon('visibility')}<span><strong>Visibility rules are enforced.</strong> Only remarks approved for parent viewing are shown; internal notes never render here.</span></div><section className="parent-card"><SectionHeader title="Performance signals & remarks" description={`Published observations for ${child.name}.`} />{visible.length ? <div className="parent-performance-list">{visible.map((remark) => <article key={remark.id}><span className="parent-icon-box">{icon(remark.signal === 'Improving' ? 'trending_up' : remark.signal === 'Needs support' ? 'track_changes' : 'remove')}</span><div><span className="parent-eyebrow">{remark.subject}</span><h3>{remark.signal}</h3><p>{remark.message}</p><small>{remark.author} · {remark.date}</small></div></article>)}</div> : <EmptyState title="No parent-visible insights" message="The institution has not published remarks for this child." iconName="insights" />}</section><UnavailableState title="Live performance analysis is not connected" message="The API currently returns 501 for persisted performance signals. This screen demonstrates the approved parent-visible state only." /></div>;
}

function MessagesView({ child }: { child: ParentChild }) {
  const teachers = useMemo(() => parentTeachers.filter((teacher) => teacher.childId === child.id), [child.id]);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? '');
  useEffect(() => setTeacherId(teachers[0]?.id ?? ''), [child.id, teachers]);
  const selected = teachers.find((teacher) => teacher.id === teacherId);
  const thread = parentMessages.filter((message) => message.childId === child.id && message.teacherId === teacherId);
  return <div className="parent-view"><div className="parent-privacy-note">{icon('shield')}<span><strong>Privacy scoped to {child.name}.</strong> Only teachers assigned to this child are available, and sibling conversations remain separate.</span></div><div className="parent-message-layout"><aside className="parent-card parent-teacher-list"><SectionHeader title="Assigned teachers" description={`${teachers.length} eligible contacts`} />{teachers.map((teacher) => <button key={teacher.id} type="button" className={teacher.id === teacherId ? 'is-active' : ''} aria-pressed={teacher.id === teacherId} onClick={() => setTeacherId(teacher.id)}><span>{teacher.initials}</span><span><strong>{teacher.name}</strong><small>{teacher.subject}</small></span>{icon('chevron_right')}</button>)}</aside><section className="parent-card parent-thread"><SectionHeader title={selected ? selected.name : 'Conversation'} description={selected ? `${selected.subject} · regarding ${child.name}` : undefined} />{thread.length ? <div className="parent-message-list">{thread.map((message) => <article key={message.id} className={message.sender === 'Parent' ? 'is-parent' : ''}><strong>{message.sender === 'Parent' ? 'You' : selected?.name}</strong><p>{message.text}</p><small>{message.time}</small></article>)}</div> : <EmptyState title="No messages yet" message="A separate thread will be maintained for this child and teacher." iconName="forum" />}<div className="parent-composer"><label htmlFor="parent-message">Message about {child.name}</label><textarea id="parent-message" disabled placeholder="Messaging persistence is not available yet." /><button type="button" disabled>{icon('send')}Send message</button></div></section></div><UnavailableState title="Persistent messaging is not implemented" message="The API validates parent/teacher relationships but currently returns 501 instead of storing or retrieving threads." /></div>;
}

function AppointmentsView({ child }: { child: ParentChild }) {
  const records = parentAppointments.filter((appointment) => appointment.childId === child.id);
  const teachers = parentTeachers.filter((teacher) => teacher.childId === child.id);
  const [scheduledAt, setScheduledAt] = useState('');
  const [validation, setValidation] = useState('');
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!scheduledAt) return setValidation('Choose a date and time.');
    if (new Date(scheduledAt).getTime() < Date.now() + 24 * 60 * 60 * 1000) return setValidation('Appointments must be requested at least 24 hours in advance.');
    setValidation('The request is valid, but appointment persistence is not implemented by the API yet.');
  };
  return <div className="parent-view"><section className="parent-card"><SectionHeader title="Appointment history" description={`Requests and linked negotiations for ${child.name}.`} />{records.length ? <div className="parent-appointment-list">{records.map((appointment) => <article key={appointment.id}><div><ParentStatus label={appointment.state} tone={toneForAppointment(appointment.state)} iconName={appointment.state === 'Alternative proposed' ? 'swap_horiz' : 'event'} /><h3>{appointment.teacher}</h3><p>{appointment.subject} · {appointment.group ? 'Group meeting' : 'Individual appointment'}</p></div><dl><div><dt>Requested</dt><dd>{appointment.requestedTime}</dd></div>{appointment.alternativeTime ? <div><dt>Alternative</dt><dd>{appointment.alternativeTime}</dd></div> : null}</dl></article>)}</div> : <EmptyState title="No appointments" message="New requests will appear here." iconName="event" />}</section><section className="parent-card"><SectionHeader title="Request an appointment" description="Default booking window: 24 hours in advance." /><form className="parent-form" onSubmit={handleSubmit}><label>Teacher<select>{teachers.map((teacher) => <option key={teacher.id}>{teacher.name} · {teacher.subject}</option>)}</select></label><label>Meeting type<select><option>Individual</option><option>Group — all participants must approve</option></select></label><label>Date and time<input type="datetime-local" value={scheduledAt} onChange={(event) => { setScheduledAt(event.target.value); setValidation(''); }} /></label><label>Reason<textarea placeholder={`What would you like to discuss about ${child.name}?`} /></label>{validation ? <p className={validation.startsWith('The request') ? 'parent-form__notice' : 'parent-form__error'} role="alert">{validation}</p> : null}<button className="parent-primary-button" type="submit">{icon('event_upcoming')}Validate request</button></form></section><UnavailableState title="Appointment writes are not connected" message="Request, response, alternative-time negotiation, group approval, and notification persistence currently return 501." /></div>;
}

function LeaveView({ child }: { child: ParentChild }) {
  const records = parentLeaves.filter((leave) => leave.childId === child.id);
  const [message, setMessage] = useState('');
  return <div className="parent-view"><section className="parent-card"><SectionHeader title="Leave history" description={`Planned leave and emergency departures for ${child.name}.`} />{records.length ? <div className="parent-leave-list">{records.map((leave) => <article key={leave.id} className={leave.state === 'Emergency departure' ? 'is-urgent' : ''}><ParentStatus label={leave.state} tone={toneForLeave(leave.state)} iconName={leave.state === 'Emergency departure' ? 'emergency' : 'event_available'} /><div><h3>{leave.reason}</h3><p>{leave.dates}</p><small>{leave.detail}</small></div></article>)}</div> : <EmptyState title="No leave records" message="Submitted and branch-recorded leave will appear here." iconName="event_available" />}</section><section className="parent-card"><SectionHeader title="Apply for planned leave" description="Branch Admin and assigned teachers will be notified." /><form className="parent-form" onSubmit={(event) => { event.preventDefault(); setMessage('Parent-to-child leave submission is not safely supported by the current API contract.'); }}><div className="parent-form-grid"><label>Start date<input type="date" required /></label><label>End date<input type="date" required /></label></div><label>Reason<select><option>Medical</option><option>Family event</option><option>Travel</option><option>Other</option></select></label><label>Details<textarea required placeholder={`Explain why ${child.name} needs leave.`} /></label>{message ? <p className="parent-form__error" role="alert">{message}</p> : null}<button className="parent-primary-button" type="submit">{icon('send')}Validate leave request</button></form></section><div className="parent-info-note">{icon('fact_check')}<span>Once approved, attendance for the covered date is automatically shown as Absent (Excused).</span></div></div>;
}

function PaymentDialog({ invoice, child, onClose }: { invoice: ParentInvoice; child: ParentChild; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') return onClose();
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="parent-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} tabIndex={-1} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-labelledby="parent-qr-title" aria-describedby="parent-qr-description" className="parent-modal"><button type="button" className="parent-modal__close" aria-label="Close Nepal Pay QR" onClick={onClose}>{icon('close')}</button><span className="parent-eyebrow">NEPAL PAY · {child.name}</span><h2 id="parent-qr-title">Scan to pay {money(invoiceTotal(invoice))}</h2><p>{invoice.cycle} · {invoice.reference}</p><div className="parent-qr" aria-label="Nepal Pay QR placeholder">{icon('qr_code_2')}</div><small id="parent-qr-description">Verify the child, invoice reference, merchant, and amount before confirming payment.</small><button type="button" className="parent-primary-button" onClick={onClose}>Done</button></section></div>;
}

function FeesView({ child }: { child: ParentChild }) {
  const invoices = parentInvoices.filter((invoice) => invoice.childId === child.id);
  const current = invoices.find((invoice) => invoice.state !== 'Paid') ?? invoices[0];
  const [selected, setSelected] = useState<ParentInvoice | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeDialog = () => { setSelected(null); window.setTimeout(() => triggerRef.current?.focus(), 0); };
  if (!current) return <EmptyState title="No invoices" message="Billing cycles will appear here when issued." iconName="payments" />;
  return <div className="parent-view"><section className="parent-fee-hero"><div><ParentStatus label={child.blocked ? 'Blocked' : current.state} tone={child.blocked ? 'gold' : toneForInvoice(current.state)} iconName={child.blocked ? 'lock' : 'payments'} /><span>Current payable for {child.name}</span><strong>{money(invoiceTotal(current))}</strong><p>{current.cycle} · Due {current.dueDate}</p></div><button ref={triggerRef} type="button" onClick={() => setSelected(current)}>{icon('qr_code_2')}Show Nepal Pay QR</button></section><section className="parent-card"><SectionHeader title="Payment calendar" description={`Every billing cycle belongs only to ${child.name}.`} /><div className="parent-payment-calendar">{invoices.map((invoice) => <article key={invoice.id} className={`is-${toneForInvoice(invoice.state)}`}><div><strong>{invoice.cycle}</strong><span>Due {invoice.dueDate}</span></div><ParentStatus label={invoice.state} tone={toneForInvoice(invoice.state)} iconName={invoice.state === 'Paid' ? 'check_circle' : invoice.state === 'Overdue' ? 'error' : 'schedule'} /><b>{money(invoiceTotal(invoice))}</b>{invoice.state !== 'Paid' ? <button type="button" onClick={() => setSelected(invoice)}>Open QR</button> : null}</article>)}</div></section><div className="parent-fees-layout"><section className="parent-card"><SectionHeader title={`${current.cycle} invoice`} description="Itemized current billing-cycle breakdown." /><div className="parent-invoice-lines">{current.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong className={line.amount < 0 ? 'is-discount' : ''}>{line.amount < 0 ? '−' : ''}{money(line.amount)}</strong></div>)}<div className="parent-invoice-total"><span>Net payable</span><strong>{money(invoiceTotal(current))}</strong></div></div></section><aside className="parent-card parent-payment-help">{icon('verified_user')}<h3>Before you pay</h3><p>Confirm the selected child and exact invoice details in your payment app.</p><dl><div><dt>Child</dt><dd>{child.name}</dd></div><div><dt>Reference</dt><dd>{current.reference}</dd></div></dl></aside></div>{selected ? <PaymentDialog invoice={selected} child={child} onClose={closeDialog} /> : null}</div>;
}

function CertificatesView({ child }: { child: ParentChild }) {
  const certificates = parentCertificates.filter((certificate) => certificate.childId === child.id);
  return <div className="parent-view"><div className="parent-privacy-note">{icon('verified')}<span><strong>Certificates remain available.</strong> Issued documents do not expire from {child.name}’s history.</span></div><section className="parent-card"><SectionHeader title="Certificate history" description={`${certificates.length} issued documents for ${child.name}`} />{certificates.length ? <div className="parent-certificate-list">{certificates.map((certificate) => <article key={certificate.id}><span className="parent-icon-box">{icon('workspace_premium')}</span><div><h3>{certificate.title}</h3><p>{certificate.course} · Issued {certificate.issuedDate}</p><small>{certificate.id}</small></div><button type="button" disabled title="Certificate download API is not available">{icon('download')}Download unavailable</button></article>)}</div> : <EmptyState title="No certificates issued" message="New documents will remain here after issuance." iconName="workspace_premium" />}</section><UnavailableState title="Certificate download is not connected" message="The API supports issuance and public verification, but no authenticated parent PDF-history/download contract is available." /></div>;
}

function CalendarView({ child }: { child: ParentChild }) {
  const events = parentEvents.filter((event) => event.childId === child.id);
  return <div className="parent-view"><section className="parent-card"><SectionHeader title={`${child.name}’s upcoming events`} description="This calendar never combines dates from another linked child." />{events.length ? <div className="parent-calendar-list">{events.map((event) => <article key={event.id}><div><strong>{event.day}</strong><span>{event.month}</span></div><div><ParentStatus label={event.kind} tone={event.kind === 'Holiday' ? 'success' : event.kind === 'Exam' ? 'error' : event.kind === 'Fee due' ? 'warning' : 'info'} iconName="event" /><h3>{event.title}</h3><p>{event.details}</p></div><time>{event.date}</time></article>)}</div> : <EmptyState title="No upcoming events" message="Published academic and fee dates will appear here." iconName="date_range" />}</section></div>;
}

function NotificationsView({ child, go }: { child: ParentChild; go: (view: ParentView) => void }) {
  const notices = useMemo(() => parentNotifications.filter((notice) => notice.childId === child.id), [child.id]);
  const [readIds, setReadIds] = useState(() => new Set(notices.filter((notice) => !notice.unread).map((notice) => notice.id)));
  useEffect(() => setReadIds(new Set(notices.filter((notice) => !notice.unread).map((notice) => notice.id))), [child.id, notices]);
  return <div className="parent-view"><div className="parent-notification-actions"><p>SMS is reserved for configured attendance summaries, fee events, appointments, and urgent notices.</p><button type="button" onClick={() => setReadIds(new Set(notices.map((notice) => notice.id)))}>Mark all as read</button></div>{notices.length ? <section className="parent-card parent-notification-list">{notices.map((notice) => <button type="button" key={notice.id} className={`${readIds.has(notice.id) ? '' : 'is-unread'} ${notice.urgent ? 'is-urgent' : ''}`} onClick={() => { setReadIds((current) => new Set(current).add(notice.id)); go(notice.destination); }}><i aria-hidden="true" /><span className="parent-icon-box">{icon(notice.icon)}</span><span><strong>{notice.title}</strong><small>{notice.message}</small><time>{notice.time}</time><span className="parent-channel-row">{notice.channels.map((channel) => <b key={channel}>{channel}</b>)}</span></span>{icon('chevron_right')}</button>)}</section> : <EmptyState title="All caught up" message={`No notifications for ${child.name}.`} iconName="notifications" />}</div>;
}

export function ParentStudentPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const view = useMemo<ParentView>(() => {
    const segment = location.pathname.split('/').filter(Boolean).at(-1);
    return segment && segment in VIEW_COPY ? segment as ParentView : 'home';
  }, [location.pathname]);
  const childId = useMemo(() => new URLSearchParams(location.search).get('child') ?? parentChildren[0]?.id ?? '', [location.search]);
  const activeChild = parentChildren.find((child) => child.id === childId) ?? parentChildren[0];
  const [title, subtitle] = VIEW_COPY[view];
  if (!activeChild) return <EmptyState title="No linked students" message="Ask the institution to link your child to this parent account." iconName="family_restroom" />;
  const go = (next: ParentView) => navigate(`/parent/${next}?child=${activeChild.id}`);
  const selectChild = (nextChildId: string) => navigate(`${location.pathname}?child=${nextChildId}`, { replace: true });
  const unread = parentNotifications.filter((notice) => notice.childId === activeChild.id && notice.unread).length;
  const content = view === 'home' ? <DashboardView child={activeChild} go={go} />
    : view === 'timetable' ? <TimetableView child={activeChild} />
      : view === 'attendance' ? <AttendanceView child={activeChild} />
        : view === 'performance' ? <PerformanceView child={activeChild} />
          : view === 'messages' ? <MessagesView child={activeChild} />
            : view === 'appointments' ? <AppointmentsView child={activeChild} />
              : view === 'leave' ? <LeaveView child={activeChild} />
                : view === 'fees' ? <FeesView child={activeChild} />
                  : view === 'certificates' ? <CertificatesView child={activeChild} />
                    : view === 'calendar' ? <CalendarView child={activeChild} />
                      : <NotificationsView child={activeChild} go={go} />;
  return <div className="parent-portal"><ChildSwitcher activeChild={activeChild} onSelect={selectChild} /><header className="parent-page-header"><div><span className="parent-eyebrow">PARENT PORTAL · {activeChild.name.toUpperCase()}</span><h1>{title}</h1><p>{subtitle}</p></div><button type="button" className="parent-notification-button" aria-label={`${unread} unread notifications for ${activeChild.name}`} onClick={() => go('notifications')}>{icon('notifications')}<span>{unread}</span></button></header><ChildContext child={activeChild} />{content}</div>;
}
