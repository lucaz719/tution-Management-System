import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  attendance,
  certificates,
  events,
  homework,
  insights,
  invoiceTotal,
  invoices,
  notifications,
  resultPercentage,
  results,
  studentProfile,
  todaySessions,
  type AttendanceState,
  type EventKind,
  type FeeState,
  type SubjectInsight,
} from '../features/student/studentPortalData';
import '../features/student/studentPortal.css';

type StudentView =
  | 'home'
  | 'timetable'
  | 'homework'
  | 'results'
  | 'attendance'
  | 'fees'
  | 'digital-id'
  | 'certificates'
  | 'calendar'
  | 'notifications';

const VIEW_TITLES: Record<StudentView, [string, string]> = {
  home: ['Good afternoon, Aarav', 'Here is what needs your attention today.'],
  timetable: ['My timetable', 'Every enrolled course, merged into one schedule.'],
  homework: ['Homework', 'Your pending assignments and due dates.'],
  results: ['Results & insights', 'Published scores, class comparisons, and subject trends.'],
  attendance: ['Attendance', 'Your teacher-marked session record.'],
  fees: ['Fees & payment', 'Billing cycles, itemized dues, and Nepal Pay.'],
  'digital-id': ['Digital student ID', 'Your branch-ready student identification.'],
  certificates: ['Certificates', 'Your permanent certificate history.'],
  calendar: ['Academic calendar', 'Holidays, exams, ceremonies, and fee deadlines.'],
  notifications: ['Notifications', 'Academic, attendance, fee, and certificate updates.'],
};

function icon(name: string) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

function money(value: number) {
  return `NPR ${Math.abs(value).toLocaleString('en-NP')}`;
}

function StatusPill({ label, iconName, tone }: { label: string; iconName: string; tone: 'success' | 'warning' | 'error' | 'info' | 'gold' }) {
  return <span className={`student-status student-status--${tone}`}>{icon(iconName)}<span>{label}</span></span>;
}

function SectionHeader({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="student-section-head">
      <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {action && onAction ? <button type="button" className="student-text-button" onClick={onAction}>{action}{icon('arrow_forward')}</button> : null}
    </div>
  );
}

function EmptyState({ title, message, iconName }: { title: string; message: string; iconName: string }) {
  return <div className="student-empty" role="status">{icon(iconName)}<h3>{title}</h3><p>{message}</p></div>;
}

function BlockedBanner({ onOpenFees }: { onOpenFees: () => void }) {
  if (!studentProfile.blocked) return null;
  return (
    <section className="student-blocked" aria-label="Account blocked due to fee dues">
      <div className="student-blocked__icon">{icon('lock')}</div>
      <div><strong>Blocked — fee dues</strong><p>{money(studentProfile.outstanding)} is overdue. Your records remain available while payment is pending.</p></div>
      <button type="button" onClick={onOpenFees}>View amount owed{icon('arrow_forward')}</button>
    </section>
  );
}

function TimetableRows({ compact = false }: { compact?: boolean }) {
  if (todaySessions.length === 0) return <EmptyState title="No classes today" message="Enjoy the free time. Your next scheduled class will appear here." iconName="event_available" />;
  return (
    <div className="student-session-list">
      {todaySessions.map((session) => (
        <article className="student-session" key={session.id}>
          <div className="student-session__time"><strong>{session.time}</strong><span>{session.endTime}</span></div>
          <div className="student-session__rail" />
          <div className="student-session__details"><h3>{session.subject}</h3><p>{session.teacher} · {session.room}</p></div>
          {!compact ? <StatusPill label={session.type} iconName="school" tone="info" /> : null}
        </article>
      ))}
    </div>
  );
}

function DashboardView({ go }: { go: (view: StudentView) => void }) {
  const nextEvent = events[0];
  return (
    <div className="student-view">
      <BlockedBanner onOpenFees={() => go('fees')} />
      <section className="student-hero">
        <div>
          <span className="student-eyebrow">WEDNESDAY · 29 JULY 2026</span>
          <h2>Your learning day at a glance</h2>
          <p>{todaySessions.length} sessions across regular, music, short-term, and personalized courses.</p>
        </div>
        <div className="student-hero__stat"><span>Next class</span><strong>Mathematics</strong><small>07:00 · Room 2A</small></div>
      </section>

      <div className="student-dashboard-grid">
        <section className="student-card student-card--wide">
          <SectionHeader title="Today's timetable" description="All enrolled course types in time order." action="Full timetable" onAction={() => go('timetable')} />
          <TimetableRows compact />
        </section>
        <aside className="student-card">
          <SectionHeader title="Homework due soon" action="View all" onAction={() => go('homework')} />
          <div className="student-homework-compact">
            {homework.slice(0, 2).map((item) => (
              <button type="button" key={item.id} onClick={() => go('homework')}>
                <span className={`student-icon-box student-icon-box--${item.urgency === 'overdue' ? 'error' : 'info'}`}>{icon('assignment')}</span>
                <span><strong>{item.title}</strong><small>{item.subject} · {item.dueLabel}</small></span>
                {icon('chevron_right')}
              </button>
            ))}
          </div>
        </aside>
      </div>

      <section className="student-metrics" aria-label="Student record summary">
        <button type="button" onClick={() => go('attendance')}>{icon('fact_check')}<span><small>Attendance</small><strong>83%</strong></span>{icon('arrow_forward')}</button>
        <button type="button" onClick={() => go('results')}>{icon('trending_up')}<span><small>Latest score</small><strong>88%</strong></span>{icon('arrow_forward')}</button>
        <button type="button" onClick={() => go('certificates')}>{icon('workspace_premium')}<span><small>Certificates</small><strong>{certificates.length}</strong></span>{icon('arrow_forward')}</button>
        <button type="button" onClick={() => go('calendar')}>{icon('event')}<span><small>Next event</small><strong>{nextEvent.day} {nextEvent.month}</strong></span>{icon('arrow_forward')}</button>
      </section>

      <section className="student-card">
        <SectionHeader title="Upcoming events" description="Your next academic and fee dates." action="Open calendar" onAction={() => go('calendar')} />
        <div className="student-event-strip">
          {events.slice(0, 3).map((event) => <article key={event.id}><div><strong>{event.day}</strong><span>{event.month}</span></div><span><b>{event.title}</b><small>{event.kind}</small></span></article>)}
        </div>
      </section>
    </div>
  );
}

function TimetableView({ go }: { go: (view: StudentView) => void }) {
  return <div className="student-view"><BlockedBanner onOpenFees={() => go('fees')} /><section className="student-card"><SectionHeader title="Today's merged schedule" description="Regular, music, short/long-term, and personalized courses appear together." /><TimetableRows /></section><div className="student-info-note">{icon('info')}<span>Schedule changes from your branch appear here after the timetable refreshes.</span></div></div>;
}

function HomeworkView() {
  const [filter, setFilter] = useState<'pending' | 'soon' | 'overdue' | 'completed'>('pending');
  const filteredHomework = homework.filter((item) => {
    if (filter === 'completed') return item.completed;
    if (item.completed) return false;
    if (filter === 'soon') return item.urgency === 'soon';
    if (filter === 'overdue') return item.urgency === 'overdue';
    return true;
  });
  const filters = [
    { id: 'pending' as const, label: 'Pending', count: homework.filter((item) => !item.completed).length },
    { id: 'soon' as const, label: 'Due soon', count: homework.filter((item) => !item.completed && item.urgency === 'soon').length },
    { id: 'overdue' as const, label: 'Overdue', count: homework.filter((item) => !item.completed && item.urgency === 'overdue').length },
    { id: 'completed' as const, label: 'Completed', count: homework.filter((item) => item.completed).length },
  ];
  return (
    <div className="student-view">
      <div className="student-filter-pills" aria-label="Homework filters">{filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}</div>
      <section className="student-card">
        <SectionHeader title={`${filters.find((item) => item.id === filter)?.label} homework`} description="Assignments are read-only in the student portal." />
        {filteredHomework.length ? <div className="student-assignment-list">
          {filteredHomework.map((item) => (
            <article key={item.id}>
              <span className={`student-icon-box student-icon-box--${item.completed ? 'success' : item.urgency === 'overdue' ? 'error' : item.urgency === 'soon' ? 'warning' : 'info'}`}>{icon(item.completed ? 'task_alt' : item.urgency === 'overdue' ? 'priority_high' : 'assignment')}</span>
              <div><span className="student-eyebrow">{item.subject}</span><h3>{item.title}</h3><p>Assigned by {item.teacher}</p></div>
              <div className="student-assignment__due"><small>{item.completed ? 'Status' : 'Due'}</small><strong>{item.dueLabel}</strong>{item.completed ? <StatusPill label="Completed" iconName="check_circle" tone="success" /> : item.urgency === 'overdue' ? <StatusPill label="Overdue" iconName="error" tone="error" /> : null}</div>
            </article>
          ))}
        </div> : <EmptyState title={`No ${filter} homework`} message="There are no assignments in this view right now." iconName="task_alt" />}
      </section>
    </div>
  );
}

function TrendSparkline({ insight }: { insight: SubjectInsight }) {
  const width = 132;
  const height = 42;
  const min = Math.min(...insight.history) - 4;
  const max = Math.max(...insight.history) + 4;
  const range = Math.max(max - min, 1);
  const points = insight.history.map((value, index) => `${(index / (insight.history.length - 1)) * width},${height - ((value - min) / range) * height}`).join(' ');
  const improving = insight.average >= insight.previousAverage;
  return (
    <svg className={`student-sparkline ${improving ? 'is-positive' : 'is-negative'}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${insight.subject} score trend: ${improving ? 'improving' : 'declining'} to ${insight.average} percent`}>
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={width} cy={Number(points.split(' ').at(-1)?.split(',')[1])} r="3" />
    </svg>
  );
}

function ResultsView() {
  const sorted = [...insights].sort((a, b) => b.average - a.average);
  return (
    <div className="student-view">
      <div className="student-live-note" role="status">{icon('bolt')}<span><strong>Results update automatically.</strong> A teacher-published score appears here with refreshed trend and class comparison.</span></div>
      <section className="student-insight-pair">
        <article><span className="student-icon-box student-icon-box--success">{icon('workspace_premium')}</span><div><small>Strongest subject</small><h3>{sorted[0].subject}</h3><strong>{sorted[0].average}% average</strong></div></article>
        <article><span className="student-icon-box student-icon-box--warning">{icon('track_changes')}</span><div><small>Needs focus</small><h3>{sorted.at(-1)?.subject}</h3><strong>{sorted.at(-1)?.average}% average</strong></div></article>
      </section>
      <div className="student-results-layout">
        <section className="student-card">
          <SectionHeader title="Published results" description="Only your own results are shown." />
          <div className="student-result-list">
            {results.map((result) => {
              const percentage = resultPercentage(result);
              const classPercentage = Math.round((result.classAverage / result.maximum) * 100);
              const above = percentage >= classPercentage;
              return <article key={result.id}><div className="student-result__head"><div><span className="student-eyebrow">{result.subject}</span><h3>{result.assessment}</h3><small>{result.publishedLabel}</small></div><strong>{result.score}/{result.maximum}</strong></div><div className="student-progress"><span style={{ width: `${percentage}%` }} /></div><div className="student-result__foot"><StatusPill label={`${above ? 'Above' : 'Below'} class average`} iconName={above ? 'trending_up' : 'trending_down'} tone={above ? 'success' : 'warning'} /><span>Class avg. {result.classAverage}/{result.maximum}</span></div></article>;
            })}
          </div>
        </section>
        <aside className="student-card">
          <SectionHeader title="Subject trends" description="Average across published tests." />
          <div className="student-trends">
            {insights.map((item) => {
              const change = item.average - item.previousAverage;
              const trend = change > 2 ? 'Improving' : change < -2 ? 'Declining' : 'Stable';
              return <article key={item.subject}><div><strong>{item.subject}</strong><span>{item.average}%</span></div><TrendSparkline insight={item} /><small className={change < 0 ? 'is-negative' : 'is-positive'}>{icon(change < 0 ? 'trending_down' : 'trending_up')}{trend} · {change > 0 ? '+' : ''}{change}%</small></article>;
            })}
          </div>
          <p className="student-readonly-note">{icon('visibility')} These insights are read-only and derived from multiple tests.</p>
        </aside>
      </div>
    </div>
  );
}

function attendanceTone(state: AttendanceState) {
  return state === 'Present' ? 'success' : state === 'Absent' ? 'error' : 'warning';
}

function AttendanceView() {
  return (
    <div className="student-view">
      <section className="student-attendance-summary"><div className="student-ring" style={{ '--progress': '83%' } as React.CSSProperties}><span>83%</span></div><div><span className="student-eyebrow">JULY 2026</span><h2>Your attendance is on track</h2><p>5 present · 1 absent · 1 excused absence</p></div><div className="student-attendance-legend"><span><i className="success" />Present</span><span><i className="error" />Absent</span><span><i className="warning" />Excused</span></div></section>
      <section className="student-card">
        <SectionHeader title="Session record" description="Marked by your teacher for each class session." />
        <div className="student-table-wrap"><table className="student-table"><thead><tr><th>Date</th><th>Subject</th><th>Session</th><th>Status</th></tr></thead><tbody>{attendance.map((record) => <tr key={record.id}><td>{record.date}</td><td><strong>{record.subject}</strong></td><td>{record.session}</td><td><StatusPill label={record.state} iconName={record.state === 'Present' ? 'check_circle' : record.state === 'Absent' ? 'cancel' : 'event_available'} tone={attendanceTone(record.state)} /></td></tr>)}</tbody></table></div>
        <p className="student-readonly-note">{icon('info')} Approved leave is shown as “Absent (Excused)” and does not appear as an unexplained absence.</p>
      </section>
    </div>
  );
}

function feeTone(state: FeeState) {
  return state === 'Paid' ? 'success' : state === 'Overdue' ? 'error' : state === 'Due soon' ? 'warning' : 'info';
}

function FeesView() {
  const [showQr, setShowQr] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = invoices[0];
  const total = invoiceTotal(current);

  useEffect(() => {
    if (!showQr) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [showQr]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      setShowQr(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="student-view">
      <section className="student-fee-hero"><div><StatusPill label="Blocked" iconName="lock" tone="gold" /><span>Current outstanding</span><strong>{money(total)}</strong><p>{current.cycle} · Due {current.dueDate}</p></div><button ref={triggerRef} type="button" onClick={() => setShowQr(true)}>{icon('qr_code_2')}Show Nepal Pay QR</button></section>
      <section className="student-card">
        <SectionHeader title="Payment calendar" description="Status uses text and icons as well as colour." />
        <div className="student-payment-calendar">{invoices.map((invoice) => <article key={invoice.id} className={`is-${feeTone(invoice.state)}`}><div><strong>{invoice.cycle}</strong><span>Due {invoice.dueDate}</span></div><StatusPill label={invoice.state} iconName={invoice.state === 'Paid' ? 'check_circle' : invoice.state === 'Overdue' ? 'error' : 'schedule'} tone={feeTone(invoice.state)} /><b>{money(invoiceTotal(invoice))}</b></article>)}</div>
      </section>
      <div className="student-fees-layout">
        <section className="student-card"><SectionHeader title={`${current.cycle} invoice`} description="Current billing-cycle breakdown." /><div className="student-invoice-lines">{current.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong className={line.amount < 0 ? 'is-discount' : ''}>{line.amount < 0 ? '−' : ''}{money(line.amount)}</strong></div>)}<div className="student-invoice-total"><span>Net payable</span><strong>{money(total)}</strong></div></div></section>
        <aside className="student-card student-payment-help">{icon('verified_user')}<h3>Before you pay</h3><p>Confirm the merchant name, invoice reference, and exact amount in your payment app.</p><dl><div><dt>Reference</dt><dd>{current.qrReference}</dd></div><div><dt>Amount</dt><dd>{money(total)}</dd></div></dl></aside>
      </div>
      {showQr ? <div className="student-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowQr(false); }}><section ref={dialogRef} tabIndex={-1} onKeyDown={handleDialogKeyDown} role="dialog" aria-modal="true" aria-labelledby="qr-title" aria-describedby="qr-description" className="student-modal"><button type="button" className="student-modal__close" aria-label="Close Nepal Pay QR" onClick={() => setShowQr(false)}>{icon('close')}</button><span className="student-eyebrow">NEPAL PAY</span><h2 id="qr-title">Scan to pay {money(total)}</h2><p>{current.cycle} · {current.qrReference}</p><div className="student-qr" aria-label="Nepal Pay QR placeholder">{icon('qr_code_2')}</div><small id="qr-description">QR codes are generated per billing cycle. Verify the amount before confirming.</small><button type="button" className="student-primary-button" onClick={() => setShowQr(false)}>Done</button></section></div> : null}
    </div>
  );
}

function DigitalIdView() {
  return (
    <div className="student-view student-id-layout">
      <section className="student-digital-id" aria-label="Digital student identification card">
        <header>{icon('school')}<div><strong>Sanskardip Shikshalaya</strong><span>Baneshwor, Kathmandu</span></div><StatusPill label={studentProfile.blocked ? 'Blocked' : 'Active'} iconName={studentProfile.blocked ? 'lock' : 'verified'} tone={studentProfile.blocked ? 'error' : 'success'} /></header>
        <div className="student-id-body"><div className="student-id-avatar">{studentProfile.initials}</div><div><span className="student-eyebrow">STUDENT</span><h2>{studentProfile.name}</h2><p>{studentProfile.grade} · Roll no. {studentProfile.rollNumber}</p><dl><div><dt>Enrollment ID</dt><dd>{studentProfile.enrollmentId}</dd></div><div><dt>Academic year</dt><dd>{studentProfile.academicYear}</dd></div><div><dt>Valid until</dt><dd>{studentProfile.validUntil}</dd></div></dl></div></div>
        <footer><div className="student-barcode" aria-hidden="true" /><span>Present this ID for identification at your branch.</span></footer>
      </section>
      <aside className="student-card student-id-help">{icon('badge')}<h2>Branch identification</h2><p>This digital ID confirms your current enrollment. It is read-only and cannot be edited from the student portal.</p>{studentProfile.blocked ? <div className="student-warning-note">{icon('lock')}Fee dues have blocked the account. Identification remains visible.</div> : null}</aside>
    </div>
  );
}

function CertificatesView() {
  const [message, setMessage] = useState('');
  return (
    <div className="student-view">
      {message ? <div className="student-success-note" role="status">{icon('download_done')}<span>{message}</span><button type="button" aria-label="Dismiss download message" onClick={() => setMessage('')}>{icon('close')}</button></div> : null}
      <div className="student-live-note">{icon('verified')}<span><strong>Certificates remain available.</strong> Issued documents do not expire from your history.</span></div>
      <section className="student-card"><SectionHeader title="Certificate history" description={`${certificates.length} issued documents`} /><div className="student-certificate-list">{certificates.map((certificate) => <article key={certificate.id}><span className="student-icon-box student-icon-box--info">{icon('workspace_premium')}</span><div><h3>{certificate.title}</h3><p>{certificate.course} · Issued {certificate.issuedDate}</p><small>{certificate.id}</small></div><button type="button" onClick={() => setMessage(`${certificate.fileName} download started.`)}>{icon('download')}Download PDF</button></article>)}</div></section>
    </div>
  );
}

function eventTone(kind: EventKind) {
  return kind === 'Holiday' ? 'success' : kind === 'Exam' ? 'error' : kind === 'Fee due' ? 'warning' : 'info';
}

function CalendarView() {
  return (
    <div className="student-view">
      <div className="student-calendar-legend">{(['Holiday', 'Exam', 'Ceremony', 'Fee due'] as EventKind[]).map((kind) => <StatusPill key={kind} label={kind} iconName={kind === 'Holiday' ? 'celebration' : kind === 'Exam' ? 'edit_note' : kind === 'Ceremony' ? 'emoji_events' : 'payments'} tone={eventTone(kind)} />)}</div>
      <section className="student-card"><SectionHeader title="Upcoming events" description="All dates relevant to your academic year." /><div className="student-calendar-list">{events.map((event) => <article key={event.id}><div className={`student-date-block is-${eventTone(event.kind)}`}><strong>{event.day}</strong><span>{event.month}</span></div><div><StatusPill label={event.kind} iconName="event" tone={eventTone(event.kind)} /><h3>{event.title}</h3><p>{event.details}</p></div><time>{event.date}</time></article>)}</div></section>
    </div>
  );
}

function NotificationsView({ go }: { go: (view: StudentView) => void }) {
  const [readIds, setReadIds] = useState(() => new Set(notifications.filter((item) => !item.unread).map((item) => item.id)));
  return (
    <div className="student-view">
      <div className="student-notification-actions"><p>Appointment notifications are excluded because appointments are a parent–teacher flow.</p><button type="button" onClick={() => setReadIds(new Set(notifications.map((item) => item.id)))}>Mark all as read</button></div>
      <section className="student-card student-notification-list">{notifications.map((notice) => <button type="button" key={notice.id} className={readIds.has(notice.id) ? '' : 'is-unread'} onClick={() => { setReadIds((current) => new Set(current).add(notice.id)); go(notice.destination.split('/').at(-1) as StudentView); }}><i aria-hidden="true" /><span className="student-icon-box student-icon-box--info">{icon(notice.icon)}</span><span><strong>{notice.title}</strong><small>{notice.message}</small><time>{notice.time}</time></span>{icon('chevron_right')}</button>)}</section>
    </div>
  );
}

export function StudentPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const view = useMemo<StudentView>(() => {
    const segment = location.pathname.split('/').filter(Boolean).at(-1);
    return segment && segment in VIEW_TITLES ? segment as StudentView : 'home';
  }, [location.pathname]);
  const [title, subtitle] = VIEW_TITLES[view];
  const unread = notifications.filter((item) => item.unread).length;
  const go = (next: StudentView) => navigate(`/student/${next}`);

  const content = view === 'home' ? <DashboardView go={go} />
    : view === 'timetable' ? <TimetableView go={go} />
      : view === 'homework' ? <HomeworkView />
        : view === 'results' ? <ResultsView />
          : view === 'attendance' ? <AttendanceView />
            : view === 'fees' ? <FeesView />
              : view === 'digital-id' ? <DigitalIdView />
                : view === 'certificates' ? <CertificatesView />
                  : view === 'calendar' ? <CalendarView />
                    : <NotificationsView go={go} />;

  return (
    <div className="student-portal">
      <header className="student-page-header">
        <div><span className="student-eyebrow">STUDENT PORTAL · READ ONLY</span><h1>{title}</h1><p>{subtitle}</p></div>
        <button type="button" className="student-notification-button" aria-label={`${unread} unread notifications`} onClick={() => go('notifications')}>{icon('notifications')}<span>{unread}</span></button>
      </header>
      {content}
    </div>
  );
}
