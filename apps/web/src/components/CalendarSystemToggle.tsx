import type { CalendarSystem } from '../utils/nepaliDate';
import './calendarSystemToggle.css';

export function CalendarSystemToggle({ value, onChange }: { value: CalendarSystem; onChange: (value: CalendarSystem) => void }) {
  return <div className="calendar-system-toggle" role="group" aria-label="Calendar date system">
    {(['AD', 'BS'] as const).map((system) => <button key={system} type="button" aria-pressed={value === system} onClick={() => onChange(system)}>{system}</button>)}
  </div>;
}
