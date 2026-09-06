import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { academicEventsApi, type AcademicEvent } from '../../services/api/academicEvents';
import { nepalDateKey, nepaliDateHeading, englishDateLabel } from '../../utils/nepalCalendar';
import { useNepalToday } from '../../hooks/useNepalClock';
import { NepalCalendar } from './NepalCalendar';
import './academicCalendarView.css';

/** Read-only view: server resolves the actor's branch, class, audience and child access. */
export function AcademicCalendarView({ studentId, upcoming = false, calendarPath = 'calendar', viewerRole }: { studentId?: string; upcoming?: boolean; calendarPath?: string; viewerRole?: 'Teacher' | 'Student' | 'Parent' | 'Accountant' }) {
  const [state, setState] = useState<{ key?: string; events: AcademicEvent[]; loading: boolean; error?: string }>({ events: [], loading: true });
  const [revision, setRevision] = useState(0);
  const today = useNepalToday();
  useEffect(() => {
    let active = true;
    setState({ key: studentId, events: [], loading: true });
    academicEventsApi.list(studentId, viewerRole).then((data) => { if (active) setState({ key: studentId, events: data.events, loading: false }); }).catch(() => { if (active) setState({ key: studentId, events: [], loading: false, error: 'Could not load academic events.' }); });
    return () => { active = false; };
  }, [studentId, viewerRole, revision]);
  const events = state.key === studentId ? state.events : [];
  const loading = state.loading || state.key !== studentId;
  if (!upcoming) return <NepalCalendar key={studentId ?? 'self'} events={events} loading={loading} error={state.key === studentId ? state.error : undefined} onRetry={() => setRevision((value) => value + 1)} />;
  const next = events.filter((event) => nepalDateKey(event.endDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3);
  return <section className="academic-upcoming"><header><h3>Upcoming events</h3><Link to={calendarPath}>Open calendar</Link></header>{loading ? <p role="status">Loading events…</p> : state.error ? <p role="alert">{state.error} <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : next.length ? next.map((event) => <article key={event.id}><strong>{event.title}</strong><p lang="ne">{nepaliDateHeading(nepalDateKey(event.startDate))}</p><small>{englishDateLabel(nepalDateKey(event.startDate))} · {event.branch?.name ?? 'Institution-wide'}{event.class ? ` · ${event.class.name}` : ''}</small></article>) : <p>No upcoming events.</p>}</section>;
}
