import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import {
  teacherClasses,
  teacherLeave,
  teacherPerformance,
  teacherRoster,
  teacherStamps,
} from '../features/teacher/teacherPortalData';
import type { TeacherDashboard, TeacherView } from '../features/teacher/teacherPortalTypes';
import '../features/teacher/teacherPortal.css';

const VIEW_COPY: Record<TeacherView, [string, string]> = {
  dashboard: ["Today's teaching", 'Your next class, campus status, and required updates.'],
  timetable: ['My timetable', 'Every session is matched to its scheduled branch geofence.'],
  attendance: ['Student attendance', 'Mark only students in your assigned classes.'],
  'daily-update-log': ['Daily class updates', 'A completed IN/OUT session stays pending until its update is submitted.'],
  homework: ['Homework', 'Assignments distribute to every currently enrolled student.'],
  results: ['Results', 'Scores flow directly into student performance analytics.'],
  profile: ['My record', 'Only your own performance and attendance record is visible.'],
  'leave-requests': ['Leave requests', 'Request leave and review your current balance.'],
};

function icon(name: string) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

function Status({ tone, children }: { tone: 'success' | 'warning' | 'error' | 'info'; children: React.ReactNode }) {
  return <span className={`teacher-status teacher-status--${tone}`}>{children}</span>;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not available on this device.'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
}

function GeoCard({ dashboard, busy, onStamp }: { dashboard: TeacherDashboard | null; busy: boolean; onStamp: () => void }) {
  const checkedIn = dashboard?.attendance.checkedIn ?? false;
  const current = teacherClasses[0];
  return (
    <section className="teacher-geo-card" aria-labelledby="geo-title">
      <div className="teacher-geo-card__top">
        <div><span className="teacher-eyebrow">LIVE GEO-ATTENDANCE</span><h2 id="geo-title">{checkedIn ? 'You are marked IN' : 'Ready to mark IN'}</h2><p>{current.branch} · {current.time} · {current.title}</p></div>
        <span className={`teacher-geo-orbit ${checkedIn ? 'is-live' : ''}`}>{icon(checkedIn ? 'my_location' : 'location_searching')}</span>
      </div>
      <div className="teacher-geofence"><span>{icon('distance')} Scheduled geofence</span><strong>{dashboard?.branch?.radiusMeters ?? 120} m radius</strong><small>Branch is selected from this session—not a fixed home branch.</small></div>
      <button type="button" className={checkedIn ? 'teacher-secondary-cta' : 'teacher-primary-cta'} disabled={busy} aria-busy={busy} onClick={onStamp}>
        {icon(checkedIn ? 'logout' : 'person_pin_circle')}{busy ? 'Locating…' : checkedIn ? 'Mark OUT' : 'Mark IN'}
      </button>
      <p className="teacher-geo-rule">{icon('shield')} Outside the radius is blocked. No teacher override is available.</p>
    </section>
  );
}

function DashboardView({ dashboard, go, busy, onStamp }: { dashboard: TeacherDashboard | null; go: (v: TeacherView) => void; busy: boolean; onStamp: () => void }) {
  const pending = dashboard?.pendingUpdates.length ?? 1;
  return <div className="teacher-view">
    <GeoCard dashboard={dashboard} busy={busy} onStamp={onStamp} />
    {pending ? <section className="teacher-reminder">{icon('notification_important')}<div><strong>{pending} daily update pending</strong><p>Completed attendance does not confirm the session until the teaching update is submitted.</p></div><button type="button" onClick={() => go('daily-update-log')}>Complete now</button></section> : null}
    <section className="teacher-section"><header><div><span className="teacher-eyebrow">WEDNESDAY · 30 JULY</span><h2>Today’s sessions</h2></div><button type="button" onClick={() => go('timetable')}>Full timetable{icon('arrow_forward')}</button></header>
      <div className="teacher-session-list">{teacherClasses.map((item) => <article key={item.id}><time>{item.time}</time><i /><div><h3>{item.title}</h3><p>{item.className} · {item.branch}</p></div><Status tone={item.personalized ? 'info' : item.state === 'Update pending' ? 'warning' : 'success'}>{item.personalized ? 'Personalized' : item.state}</Status></article>)}</div>
    </section>
    <nav className="teacher-quick-grid" aria-label="Teacher quick actions">
      <button onClick={() => go('attendance')}>{icon('how_to_reg')}<span><strong>Class attendance</strong><small>22 students</small></span></button>
      <button onClick={() => go('homework')}>{icon('assignment_add')}<span><strong>Assign homework</strong><small>Auto-distribute</small></span></button>
      <button onClick={() => go('results')}>{icon('analytics')}<span><strong>Enter results</strong><small>Updates trends</small></span></button>
      <button onClick={() => go('leave-requests')}>{icon('event_busy')}<span><strong>Request leave</strong><small>{teacherLeave.casual} casual days</small></span></button>
    </nav>
  </div>;
}

function TimetableView() {
  return <div className="teacher-view"><div className="teacher-info">{icon('alt_route')}<span><strong>Multi-branch validation.</strong> Each slot uses its own scheduled branch and radius.</span></div><section className="teacher-section"><header><div><h2>Wednesday schedule</h2><p>Regular and personalized streams remain separate.</p></div></header><div className="teacher-session-list teacher-session-list--full">{teacherClasses.map(item => <article key={item.id}><time>{item.time}</time><i /><div><h3>{item.title}</h3><p>{item.className} · {item.branch}</p><small>{item.room} · radius {item.radius} m</small></div><Status tone={item.personalized ? 'info' : 'success'}>{item.personalized ? 'Personalized' : 'Regular'}</Status></article>)}</div></section></div>;
}

function AttendanceView() {
  const [states, setStates] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'EXCUSED'>>(() => Object.fromEntries(teacherRoster.map(s => [s.id, s.excused ? 'EXCUSED' : 'PRESENT'])));
  return <div className="teacher-view"><div className="teacher-class-context"><span>{icon('groups')}</span><div><small>SELECTED CLASS</small><strong>Grade 8 · Mathematics</strong><p>22 enrolled · Main Branch</p></div></div><section className="teacher-section"><header><div><h2>Class roster</h2><p>Fee blocks and approved leave are enforced before submission.</p></div><Status tone="info">Today</Status></header><div className="teacher-roster">{teacherRoster.map(student => {
    const locked = student.blocked || student.excused;
    return <fieldset key={student.id} className={locked ? 'is-locked' : ''}><legend className="sr-only">Attendance for {student.name}</legend><span className="teacher-avatar">{student.initials}</span><div><strong>{student.name}</strong><small>{student.roll}{student.blocked ? ' · Fee blocked' : student.excused ? ' · Approved leave' : ''}</small></div><div className="teacher-attendance-options">
      <label><input type="radio" name={student.id} checked={states[student.id] === 'PRESENT'} disabled={locked} onChange={() => setStates(v => ({ ...v, [student.id]: 'PRESENT' }))} /><span>P</span></label>
      <label><input type="radio" name={student.id} checked={states[student.id] === 'ABSENT'} disabled={student.excused} onChange={() => setStates(v => ({ ...v, [student.id]: 'ABSENT' }))} /><span>A</span></label>
      {locked ? <Status tone={student.blocked ? 'error' : 'warning'}>{student.blocked ? 'Present disabled' : 'Absent (Excused)'}</Status> : null}
    </div></fieldset>;
  })}</div><button className="teacher-primary-cta" type="button" onClick={() => undefined}>{icon('done_all')}Validate attendance sheet</button></section><div className="teacher-info">{icon('info')}<span>Attendance submission is server-validated. This preview does not persist until a live roster endpoint is connected.</span></div></div>;
}

function DailyUpdateView({ dashboard, reload }: { dashboard: TeacherDashboard | null; reload: () => Promise<void> }) {
  const { showToast } = useToast();
  const fixture = dashboard?.pendingUpdates ?? [{ sessionId: 'preview-session', classId: 'grade-8', className: 'Grade 8', courseName: 'Mathematics', date: new Date().toISOString() }];
  const [open, setOpen] = useState('');
  const [covered, setCovered] = useState('');
  const [issues, setIssues] = useState('');
  const [homework, setHomework] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (id: string) => {
    if (!covered.trim()) return showToast('Add what was covered before submitting.', 'error');
    if (id === 'preview-session') return showToast('Preview validated. A live session is required to persist it.', 'success');
    setBusy(true); try { await api.teacher.submitSessionUpdate(id, `Covered: ${covered}\nIssues: ${issues || 'None'}\nHomework: ${homework || 'None'}`); showToast('Daily update submitted. Session confirmed.', 'success'); setOpen(''); await reload(); } catch (e) { showToast(e instanceof Error ? e.message : 'Update failed.', 'error'); } finally { setBusy(false); }
  };
  return <div className="teacher-view"><div className="teacher-info">{icon('rule')}<span>IN and OUT stamps create <strong>Present — Update Pending</strong>. Only this update confirms the session.</span></div><section className="teacher-section"><header><div><h2>Pending updates</h2><p>An automatic reminder remains active until submission.</p></div><Status tone="warning">{fixture.length} pending</Status></header>{fixture.map(item => <article className="teacher-update-card" key={item.sessionId}><div><span className="teacher-eyebrow">{new Date(item.date).toLocaleDateString()}</span><h3>{item.className} · {item.courseName}</h3><Status tone="warning">Present — Update Pending</Status></div>{open !== item.sessionId ? <button type="button" onClick={() => setOpen(item.sessionId)}>Add daily update</button> : <form onSubmit={e => { e.preventDefault(); void submit(item.sessionId); }}><label htmlFor={`covered-${item.sessionId}`}>What was covered <span>*</span></label><textarea id={`covered-${item.sessionId}`} required value={covered} onChange={e => setCovered(e.target.value)} /><label htmlFor={`issues-${item.sessionId}`}>Issues or observations</label><textarea id={`issues-${item.sessionId}`} value={issues} onChange={e => setIssues(e.target.value)} /><label htmlFor={`homework-${item.sessionId}`}>Homework given</label><textarea id={`homework-${item.sessionId}`} value={homework} onChange={e => setHomework(e.target.value)} /><div><button className="teacher-primary-cta" disabled={busy} aria-busy={busy} type="submit">{busy ? 'Submitting…' : 'Submit & confirm'}</button><button type="button" onClick={() => setOpen('')}>Cancel</button></div></form>}</article>)}</section></div>;
}

function HomeworkView() {
  const { showToast } = useToast();
  return <div className="teacher-view"><div className="teacher-info">{icon('group_add')}<span>One assignment distributes immediately to every currently enrolled student in the selected class.</span></div><section className="teacher-section"><header><div><h2>New homework</h2><p>Choose the regular or personalized teaching stream.</p></div></header><form className="teacher-form" onSubmit={e => { e.preventDefault(); showToast('Homework validated. Connect a live class ID to distribute it.', 'success'); }}><label htmlFor="homework-class">Class</label><select id="homework-class">{teacherClasses.map(c => <option key={c.id}>{c.className} · {c.personalized ? 'Personalized' : 'Regular'}</option>)}</select><label htmlFor="homework-title">Title <span>*</span></label><input id="homework-title" required /><label htmlFor="homework-details">Instructions</label><textarea id="homework-details" /><label htmlFor="homework-due">Due date <span>*</span></label><input id="homework-due" type="date" required /><button className="teacher-primary-cta" type="submit">{icon('send')}Validate & distribute</button></form></section></div>;
}

function ResultsView() {
  const { showToast } = useToast();
  return <div className="teacher-view"><div className="teacher-info">{icon('auto_graph')}<span>Saved scores immediately update the student trend, class comparison, and strong/weak-subject analysis.</span></div><section className="teacher-section"><header><div><h2>Mathematics unit test</h2><p>Grade 8 · maximum score 25</p></div></header><div className="teacher-score-list">{teacherRoster.filter(s => !s.blocked).map(s => <label key={s.id} htmlFor={`score-${s.id}`}><span><strong>{s.name}</strong><small>{s.roll}</small></span><input id={`score-${s.id}`} type="text" inputMode="decimal" aria-label={`Score for ${s.name}`} placeholder="—" /><b>/ 25</b></label>)}</div><button type="button" className="teacher-primary-cta" onClick={() => showToast('Scores validated. Live result persistence is not connected yet.', 'success')}>{icon('analytics')}Validate scores</button></section></div>;
}

function ProfileView() {
  return <div className="teacher-view"><div className="teacher-info">{icon('lock_person')}<span>This page contains only your own records. Other teachers’ scores are never available here.</span></div><section className="teacher-section"><header><div><h2>My performance breakdown</h2><p>Current institutional scoring period</p></div><strong className="teacher-score-total">88</strong></header><div className="teacher-performance">{teacherPerformance.map(row => <div key={row.label}><span>{row.label}<small>{row.detail}</small></span><b>{row.score}%</b><i><span style={{ width: `${row.score}%` }} /></i></div>)}</div></section><section className="teacher-section"><header><div><h2>Attendance stamp history</h2><p>IN, OUT, AUTO-OUT, and RE-IN are never merged.</p></div></header><div className="teacher-stamps">{teacherStamps.map(s => <article key={s.id}><i className={`is-${s.type.toLowerCase().replace('_', '-')}`} /><div><strong>{s.type.replace('_', '-')}</strong><small>{s.branch} · {s.detail}</small></div><time>{s.time}</time></article>)}</div></section></div>;
}

function LeaveView() {
  const { showToast } = useToast();
  return <div className="teacher-view"><section className="teacher-balance" aria-label="Leave balance"><div><span>Casual</span><strong>{teacherLeave.casual}</strong><small>days available</small></div><div><span>Sick</span><strong>{teacherLeave.sick}</strong><small>days available</small></div><div><span>Early-out</span><strong>{teacherLeave.earlyOut}</strong><small>used this term</small></div></section><section className="teacher-section"><header><div><h2>New leave request</h2><p>Casual, early-out, and long sick leave follow their configured approval path.</p></div></header><form className="teacher-form" onSubmit={e => { e.preventDefault(); showToast('Leave request validated. Submission requires the authenticated branch assignment.', 'success'); }}><label htmlFor="leave-type">Leave type</label><select id="leave-type"><option>Casual leave</option><option>Early-out</option><option>Long sick leave</option></select><div className="teacher-form-grid"><div><label htmlFor="leave-start">Start</label><input id="leave-start" type="date" required /></div><div><label htmlFor="leave-end">End</label><input id="leave-end" type="date" required /></div></div><label htmlFor="leave-reason">Reason <span>*</span></label><textarea id="leave-reason" required /><button className="teacher-primary-cta" type="submit">{icon('event_upcoming')}Validate request</button></form></section></div>;
}

export function TeacherPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const view = (location.pathname.split('/')[2] || 'dashboard') as TeacherView;
  const safeView = view in VIEW_COPY ? view : 'dashboard';
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const load = async () => { setLoading(true); setError(''); try { setDashboard(await api.teacher.getDashboard()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your live workspace.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const pending = dashboard?.pendingUpdates.length ?? 0;
  const checkedIn = dashboard?.attendance.checkedIn ?? false;
  const go = (next: TeacherView) => navigate(`/teacher/${next}`);
  const stamp = async () => {
    if (!dashboard?.branch) return showToast('No scheduled branch is available for this time slot.', 'error');
    if (!checkedIn && pending) return showToast('Submit pending daily updates before marking IN.', 'error');
    setAttendanceBusy(true); try { const p = await getCurrentPosition(); const { latitude, longitude, accuracy } = p.coords; if (checkedIn) await api.attendance.markOut(dashboard.branch.id, latitude, longitude, accuracy); else await api.attendance.markIn(dashboard.branch.id, latitude, longitude, accuracy); showToast(checkedIn ? 'Marked OUT. Departure stamp recorded.' : 'Marked IN inside the scheduled geofence.', 'success'); await load(); } catch (e) { showToast(e instanceof Error ? e.message : 'Location could not be verified.', 'error'); } finally { setAttendanceBusy(false); }
  };
  const copy = VIEW_COPY[safeView];
  const renderView = () => {
    if (safeView === 'dashboard') return <DashboardView dashboard={dashboard} go={go} busy={attendanceBusy} onStamp={() => void stamp()} />;
    if (safeView === 'timetable') return <TimetableView />;
    if (safeView === 'attendance') return <AttendanceView />;
    if (safeView === 'daily-update-log') return <DailyUpdateView dashboard={dashboard} reload={load} />;
    if (safeView === 'homework') return <HomeworkView />;
    if (safeView === 'results') return <ResultsView />;
    if (safeView === 'profile') return <ProfileView />;
    return <LeaveView />;
  };
  return <main className="teacher-portal"><header className="teacher-page-head"><div><span className="teacher-eyebrow">TEACHER WORKSPACE</span><h1>{copy[0]}</h1><p>{copy[1]}</p></div><Status tone={dashboard?.attendance.checkedIn ? 'success' : 'info'}>{dashboard?.attendance.checkedIn ? 'On campus' : 'Off campus'}</Status></header>{loading ? <div className="teacher-skeleton" aria-busy="true" aria-label="Loading teacher workspace"><i /><i /><i /></div> : error ? <div className="teacher-error" role="alert">{icon('cloud_off')}<div><strong>Live data unavailable</strong><p>{error}</p></div><button type="button" onClick={() => void load()}>Retry</button></div> : null}{renderView()}</main>;
}
