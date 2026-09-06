import { useEffect, useState } from 'react';
import { academicEventsApi, type EventAudience } from '../../services/api/academicEvents';
import './academicCalendarView.css';

export const AUDIENCE_LABELS: Record<EventAudience, string> = { ALL: 'Everyone', STAFF: 'Staff only', STUDENTS: 'Students and their parents', PARENTS: 'Parents only' };
export function EventAudienceSelect({ value, onChange, disabled = false }: { value: EventAudience; onChange: (value: EventAudience) => void; disabled?: boolean }) {
  return <label className="event-target-field">Audience<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as EventAudience)}>{Object.entries(AUDIENCE_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
export function EventTargetFields({ audience, classId, branchId, onAudienceChange, onClassChange, onReadyChange }: { audience: EventAudience; classId: string; branchId?: string; onReadyChange?: (ready: boolean) => void; onAudienceChange: (value: EventAudience) => void; onClassChange: (id: string) => void }) {
  const [classes, setClasses] = useState<Array<{ id: string; name: string; branchId: string; branch: { name: string } }>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); onReadyChange?.(false);
    academicEventsApi.options(branchId).then((data) => {
      if (!active) return;
      setClasses(data.classes); setLoading(false); onReadyChange?.(true);
    }).catch(() => {
      if (!active) return;
      setClasses([]); setLoading(false); setError('Could not load classes. Publishing is blocked until targeting is available.');
    });
    return () => { active = false; };
  }, [branchId, revision, onReadyChange]);
  return <div style={{ display: 'grid', gap: 12 }}><EventAudienceSelect value={audience} onChange={onAudienceChange} /><label className="event-target-field">Applies to<select value={classId} disabled={loading || !!error} onChange={(event) => onClassChange(event.target.value)}><option value="">{loading ? 'Loading classes…' : branchId ? 'Entire branch' : 'Entire institution'}</option>{classes.filter((item) => !branchId || item.branchId === branchId).map((item) => <option key={item.id} value={item.id}>{item.branch.name} · {item.name}</option>)}</select></label>{error && <p role="alert">{error} <button type="button" onClick={() => { onReadyChange?.(false); setRevision((value) => value + 1); }}>Retry</button></p>}</div>;
}
