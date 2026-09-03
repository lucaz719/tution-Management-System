import { useState } from 'react';
import { Button } from '../ui/Button';
import { SCHEDULE_DAYS, slotsOverlap, sortSchedule, type ScheduleSlot } from '../../utils/schedule';

const DAY_NAMES: Record<string, string> = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const EMPTY_SLOT: ScheduleSlot = { day: 'Sun', startTime: '08:00', endTime: '09:00', room: '' };

interface TimetableSlotEditorProps {
  value: ScheduleSlot[];
  onChange: (value: ScheduleSlot[]) => void;
  disabled?: boolean;
}

export function TimetableSlotEditor({ value, onChange, disabled = false }: TimetableSlotEditorProps) {
  const [draft, setDraft] = useState<ScheduleSlot>(EMPTY_SLOT);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const reset = (day = draft.day) => {
    setDraft({ ...EMPTY_SLOT, day });
    setEditingIndex(null);
    setError('');
  };

  const saveSlot = () => {
    if (!draft.startTime || !draft.endTime || draft.startTime >= draft.endTime) {
      setError('End time must be later than start time.');
      return;
    }
    const normalized = { ...draft, room: draft.room.trim() };
    const conflict = value.findIndex((slot, index) => index !== editingIndex && slotsOverlap(slot, normalized));
    if (conflict >= 0) {
      setError(`This overlaps ${DAY_NAMES[value[conflict].day]} ${value[conflict].startTime}–${value[conflict].endTime}.`);
      return;
    }
    const next = editingIndex === null
      ? [...value, normalized]
      : value.map((slot, index) => index === editingIndex ? normalized : slot);
    onChange(sortSchedule(next));
    reset(normalized.day);
  };

  const edit = (index: number) => {
    setEditingIndex(index);
    setDraft(value[index]);
    setError('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, slotIndex) => slotIndex !== index));
    if (editingIndex === index) reset();
    else if (editingIndex !== null && index < editingIndex) setEditingIndex(editingIndex - 1);
  };

  return (
    <fieldset className="timetable-slot-editor" disabled={disabled}>
      <legend>Weekly sessions <span aria-hidden="true">*</span></legend>
      <p className="timetable-field-help">Add each day separately so different times and rooms remain accurate.</p>

      {value.length ? (
        <div className="timetable-slot-list">
          {value.map((slot, index) => (
            <article className={`timetable-slot-card${editingIndex === index ? ' is-editing' : ''}`} key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`}>
              <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
              <div>
                <strong>{DAY_NAMES[slot.day]} · {slot.startTime}–{slot.endTime}</strong>
                <small>{slot.room || 'Room not assigned'}</small>
              </div>
              <div className="timetable-slot-actions">
                <button type="button" onClick={() => edit(index)} aria-label={`Edit ${DAY_NAMES[slot.day]} session`}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                <button type="button" className="is-danger" onClick={() => remove(index)} aria-label={`Remove ${DAY_NAMES[slot.day]} session`}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="timetable-slot-empty"><span className="material-symbols-outlined" aria-hidden="true">calendar_add_on</span><span>No sessions added yet.</span></div>
      )}

      <div className="timetable-slot-fields">
        <label htmlFor="slot-day">Day<select id="slot-day" value={draft.day} onChange={(event) => setDraft((current) => ({ ...current, day: event.target.value }))}>{SCHEDULE_DAYS.map((day) => <option key={day} value={day}>{DAY_NAMES[day]}</option>)}</select></label>
        <label htmlFor="slot-start">Starts<input id="slot-start" type="time" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} required /></label>
        <label htmlFor="slot-end">Ends<input id="slot-end" type="time" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} required /></label>
        <label htmlFor="slot-room">Room <span>(optional)</span><input id="slot-room" autoComplete="off" maxLength={120} value={draft.room} onChange={(event) => setDraft((current) => ({ ...current, room: event.target.value }))} placeholder="Room 302" /></label>
      </div>
      {error ? <p className="timetable-inline-error" role="alert">{error}</p> : null}
      <div className="timetable-slot-editor-actions">
        <Button type="button" variant="outline" onClick={saveSlot}>{editingIndex === null ? 'Add session' : 'Update session'}</Button>
        {editingIndex !== null ? <Button type="button" variant="ghost" onClick={() => reset()}>Cancel edit</Button> : null}
      </div>
    </fieldset>
  );
}
