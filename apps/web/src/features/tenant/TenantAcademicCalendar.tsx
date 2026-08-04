import { useMemo, useState } from 'react';
import type { AcademicEvent, EventType } from '../../services/api/academicEvents';
import './tenantAcademicCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_LABELS: Record<EventType, string> = {
  HOLIDAY: 'Holiday',
  EXAM: 'Exam',
  EVENT: 'Event',
  FEE_DUE: 'Fee due',
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthCells(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function eventsOnDate(events: AcademicEvent[], date: Date): AcademicEvent[] {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const endOfDay = startOfDay + 86400000 - 1;
  return events.filter((event) => new Date(event.startDate).getTime() <= endOfDay && new Date(event.endDate).getTime() >= startOfDay);
}

export function TenantAcademicCalendar({ events, loading }: { events: AcademicEvent[]; loading: boolean }) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);
  const selectedEvents = useMemo(() => eventsOnDate(events, selectedDate), [events, selectedDate]);

  const moveMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(next);
  };

  const returnToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <section className="tenant-calendar" aria-label="Institution academic calendar">
      <div className="tenant-calendar__toolbar">
        <div>
          <h3>{visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <p>Select a date to review institution and branch events.</p>
        </div>
        <div className="tenant-calendar__controls">
          <button type="button" className="tenant-calendar__today" onClick={returnToToday}>Today</button>
          <button type="button" className="tenant-calendar__icon-button" onClick={() => moveMonth(-1)} aria-label="Previous month"><span className="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
          <button type="button" className="tenant-calendar__icon-button" onClick={() => moveMonth(1)} aria-label="Next month"><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
        </div>
      </div>

      {loading ? <div className="tenant-calendar__skeleton" aria-label="Loading calendar" aria-busy="true" /> : (
        <div className="tenant-calendar__body">
          <div className="tenant-calendar__grid-wrap">
            <div className="tenant-calendar__weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="tenant-calendar__grid" role="grid" aria-label={visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
              {cells.map((date) => {
                const dayEvents = eventsOnDate(events, date);
                const selected = dateKey(date) === dateKey(selectedDate);
                const isToday = dateKey(date) === dateKey(today);
                const outside = date.getMonth() !== visibleMonth.getMonth();
                return <button
                  type="button"
                  role="gridcell"
                  key={dateKey(date)}
                  className="tenant-calendar__day"
                  data-selected={selected || undefined}
                  data-today={isToday || undefined}
                  data-outside={outside || undefined}
                  aria-selected={selected}
                  aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{date.getDate()}</span>
                  {dayEvents.length ? <span className="tenant-calendar__dots" aria-hidden="true">{dayEvents.slice(0, 3).map((event) => <i key={event.id} data-type={event.eventType} />)}</span> : null}
                </button>;
              })}
            </div>
          </div>

          <aside className="tenant-calendar__details" aria-live="polite">
            <p className="tenant-calendar__eyebrow">Selected date</p>
            <h4>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
            {selectedEvents.length ? <div className="tenant-calendar__event-list">{selectedEvents.map((event) => <article key={event.id} className="tenant-calendar__event" data-type={event.eventType}>
              <div className="tenant-calendar__event-heading"><strong>{event.title}</strong><span>{EVENT_LABELS[event.eventType]}</span></div>
              <p>{event.description || 'No additional description.'}</p>
              <time dateTime={event.startDate}>{new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </article>)}</div> : <div className="tenant-calendar__empty"><span className="material-symbols-outlined" aria-hidden="true">event_available</span><strong>No events on this date</strong><p>Choose another marked date or create a new institution event.</p></div>}
          </aside>
        </div>
      )}
    </section>
  );
}
