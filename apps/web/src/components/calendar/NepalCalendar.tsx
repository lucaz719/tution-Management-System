import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarSystemToggle } from '../CalendarSystemToggle';
import { NepalDateTime } from '../NepalDateTime';
import { useNepalToday } from '../../hooks/useNepalClock';
import type { CalendarSystem } from '../../utils/nepaliDate';
import { addCalendarDays, BS_MONTHS, BS_YEARS, bsDate, calendarMonth, dateFromKey, englishDateLabel, eventOccursOn, monthAnchor, NEPAL_TIME_ZONE, NEPALI_WEEKDAYS, nepaliDateHeading, nepaliDigits, shiftCalendarMonth } from '../../utils/nepalCalendar';
import './nepalCalendar.css';
import { CalendarIcon } from './CalendarIcon';
import { EventAudienceSelect } from './EventTargetFields';
import type { EventAudience } from '../../services/api/academicEvents';

export interface NepalCalendarEvent {
  audience?: EventAudience;
  branchId?: string | null;
  branch?: { name: string } | null;
  class?: { name: string } | null;
  id: string;
  title: string;
  description?: string | null;
  eventType: 'HOLIDAY' | 'EXAM' | 'EVENT' | 'FEE_DUE';
  startDate: string;
  endDate: string;
}
export interface NepalCalendarProps {
  events: NepalCalendarEvent[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  calendarSystem?: CalendarSystem;
  onCalendarSystemChange?: (system: CalendarSystem) => void;
  /** Sunday = 0. Supply institution closures; Saturday is the display default. */
  weeklyDaysOff?: readonly number[];
  /** Opt in only when the host page does not already show NepalDateTime. */
  showClock?: boolean;
  onDateSelect?: (date: string) => void;
  initialDate?: string;
  showDetails?: boolean;
  onDateActivate?: (date: string) => void;
  onCreateEvent?: (date: string) => void;
  onAudienceChange?: (event: NepalCalendarEvent, audience: EventAudience) => void;
  canManageEvent?: (event: NepalCalendarEvent) => boolean;
  savingAudience?: boolean;
}
const eventLabels = { HOLIDAY: 'Holiday', EXAM: 'Exam', EVENT: 'Event', FEE_DUE: 'Fee due' };
const defaultDaysOff = [6];
const adMonths = Array.from({ length: 12 }, (_, month) => englishDateLabel(`2026-${String(month + 1).padStart(2, '0')}-01`, { month: 'long' }));
function eventTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return englishDateLabel(value);
  return new Date(value).toLocaleString('en-US', { timeZone: NEPAL_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function NepalCalendar({ events, loading = false, error, onRetry, calendarSystem, onCalendarSystemChange, weeklyDaysOff = defaultDaysOff, showClock = false, onDateSelect, initialDate, showDetails = true, onDateActivate, onCreateEvent, onAudienceChange, canManageEvent, savingAudience }: NepalCalendarProps) {
  const today = useNepalToday();
  const [internalSystem, setInternalSystem] = useState<CalendarSystem>('BS');
  const system = calendarSystem ?? internalSystem;
  const [anchor, setAnchor] = useState(initialDate || today);
  const [selected, setSelected] = useState(initialDate || today);
  const [focused, setFocused] = useState(initialDate || today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const pickerId = useId();
  const month = useMemo(() => calendarMonth(anchor, system), [anchor, system]);
  const dayEvents = useMemo(() => events.filter((event) => eventOccursOn(event, selected)), [events, selected]);
  const indexedEvents = useMemo(() => new Map((month?.cells ?? []).map((key) => [key, events.filter((event) => eventOccursOn(event, key))])), [events, month]);
  const previous = shiftCalendarMonth(anchor, -1, system);
  const next = shiftCalendarMonth(anchor, 1, system);
  const years = system === 'BS' ? BS_YEARS : Array.from({ length: 301 }, (_, index) => 1900 + index);
  function select(key: string, focus = false) {
    if (system === 'BS' && !bsDate(key)) return;
    setSelected(key); setFocused(key);
    if (!month || key < month.first || key > month.last) setAnchor(key);
    onDateSelect?.(key);
    if (focus) requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.focus());
  }
  function navigate(key: string) { setAnchor(key); setSelected(key); setFocused(key); onDateSelect?.(key); }
  function switchSystem(value: CalendarSystem) { setInternalSystem(value); onCalendarSystemChange?.(value); setAnchor(selected); }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -dateFromKey(key).getUTCDay(), End: 6 - dateFromKey(key).getUTCDay() };
    if (event.key in offsets) { event.preventDefault(); select(addCalendarDays(key, offsets[event.key]), true); }
  }
  function closePicker() { setPickerOpen(false); document.getElementById(headingId)?.parentElement?.focus(); }
  const offDay = weeklyDaysOff.includes(dateFromKey(selected).getUTCDay());
  return <section className="nepal-calendar" aria-label="Academic and work calendar">
    {showClock && <div className="nepal-calendar__today-strip"><NepalDateTime compact /></div>}
    <div className="nepal-calendar__toolbar"><div>
      <button className="nepal-calendar__month-button" type="button" aria-expanded={pickerOpen} aria-controls={pickerId} onClick={() => setPickerOpen(!pickerOpen)}><span id={headingId} lang={system === 'BS' ? 'ne' : 'en'}>{month?.heading ?? 'Date unavailable'}</span><CalendarIcon name="expand" /></button>
      <p className="nepal-calendar__subtitle">{month?.subtitle ?? 'Choose AD or return to today.'}</p>
    </div><div className="nepal-calendar__controls">
      <CalendarSystemToggle value={system} onChange={switchSystem} />
      <button type="button" className="nepal-calendar__today-button" onClick={() => navigate(today)}><span lang="ne">आज</span><span>Today</span></button>
      <button type="button" disabled={!previous} aria-label="Previous month" onClick={() => previous && navigate(previous)}><CalendarIcon name="previous" /></button>
      <button type="button" disabled={!next} aria-label="Next month" onClick={() => next && navigate(next)}><CalendarIcon name="next" /></button>
    </div></div>
    {pickerOpen && month && <div className="nepal-calendar__picker" id={pickerId} onKeyDown={(event) => { if (event.key === 'Escape') closePicker(); }}>
      <label>Month<select value={month.month} onChange={(event) => navigate(monthAnchor(month.year, Number(event.target.value), system))}>{(system === 'BS' ? BS_MONTHS : adMonths).map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
      <label>Year ({system})<select value={month.year} onChange={(event) => navigate(monthAnchor(Number(event.target.value), month.month, system))}>{years.map((year) => <option key={year} value={year}>{system === 'BS' ? nepaliDigits(year) : year}</option>)}</select></label>
      <button type="button" onClick={closePicker}>Done</button>
    </div>}
    <div className="nepal-calendar__legend"><span><i data-kind="today" />Today</span><span><i data-kind="selected" />Selected</span><span><i data-kind="off" />Holiday / weekly off</span><span className="nepal-calendar__timezone">All times in Nepal</span></div>
    {error && <div className="nepal-calendar__message" role="alert"><strong>Could not load events</strong><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>Retry</button>}</div>}
    {loading ? <div className="nepal-calendar__loading" role="status" aria-busy="true">Loading calendar events…</div> : month ? <>
      <div className="nepal-calendar__grid" role="grid" aria-labelledby={headingId} ref={gridRef}>
        <div className="nepal-calendar__week" role="row">{NEPALI_WEEKDAYS.map((day, index) => <div key={day} role="columnheader" className="nepal-calendar__weekday" data-off={weeklyDaysOff.includes(index) || undefined}><span lang="ne" className="nepal-calendar__weekday-full">{day}</span><span lang="ne" className="nepal-calendar__weekday-short" aria-hidden="true">{day.slice(0, 2)}</span></div>)}</div>
        {Array.from({ length: month.cells.length / 7 }, (_, row) => <div className="nepal-calendar__week" role="row" key={row}>{month.cells.slice(row * 7, row * 7 + 7).map((key) => {
          const bs = bsDate(key); const entries = indexedEvents.get(key) ?? [];
          const weeklyOff = weeklyDaysOff.includes(dateFromKey(key).getUTCDay());
          const holiday = entries.some((entry) => entry.eventType === 'HOLIDAY');
          return <div role="gridcell" aria-selected={key === selected} key={key} className="nepal-calendar__cell">
            <button type="button" data-date={key} data-today={key === today || undefined} data-selected={key === selected || undefined} data-off={weeklyOff || holiday || undefined} data-outside={key < month.first || key > month.last || undefined} disabled={system === 'BS' && !bs} tabIndex={key === focused ? 0 : -1} aria-current={key === today ? 'date' : undefined}
              aria-label={`${nepaliDateHeading(key)}, ${englishDateLabel(key)}${weeklyOff ? ', Weekly off' : ''}${holiday ? ', Holiday' : ''}, ${error ? 'Events unavailable' : `${entries.length} events`}`}
              onClick={() => { select(key); onDateActivate?.(key); }} onKeyDown={(event) => keyboard(event, key)}>
              <span className="nepal-calendar__secondary">{system === 'BS' ? dateFromKey(key).getUTCDate() : bs ? nepaliDigits(bs.day) : '—'}</span>
              <span className="nepal-calendar__annotations">{entries.slice(0, 2).map((entry) => <span key={entry.id} data-type={entry.eventType}>{entry.title}</span>)}</span>
              <span className="nepal-calendar__number" lang={system === 'BS' ? 'ne' : 'en'}>{system === 'BS' ? bs ? nepaliDigits(bs.day) : '—' : dateFromKey(key).getUTCDate()}</span>
              <span className="nepal-calendar__day-footer">{key === today ? 'Today' : holiday ? 'Holiday' : weeklyOff ? 'Weekly off' : ''}{entries.length > 2 && <span>+{entries.length - 2} more</span>}</span>
              {entries.length > 0 && <span className="nepal-calendar__mobile-count" aria-hidden="true">{entries.length}</span>}
            </button>
          </div>;
        })}</div>)}
      </div>
      {showDetails && <div className="nepal-calendar__details" aria-live="polite">
        {onCreateEvent && <button type="button" className="nepal-calendar__create" onClick={() => onCreateEvent(selected)}>Add event on this day</button>}
        <div className="nepal-calendar__detail-heading"><div><p className="nepal-calendar__eyebrow">Selected day{offDay ? ' · Weekly off' : ''}</p><h4 lang="ne">{nepaliDateHeading(selected)}</h4><p>{englishDateLabel(selected, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div><span>{error ? 'Events unavailable' : `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}</span></div>
        {error ? <p className="nepal-calendar__empty">Retry loading events to see this day's schedule.</p> : dayEvents.length ? <div className="nepal-calendar__events">{dayEvents.map((event) => <article key={event.id} className="nepal-calendar__event"><span className="nepal-calendar__event-type">{eventLabels[event.eventType]}</span><h5>{event.title}</h5><p>{event.branch?.name ?? 'Institution-wide'}{event.class ? ` / ${event.class.name}` : ''}</p>{onAudienceChange && (!canManageEvent || canManageEvent(event)) && <EventAudienceSelect value={event.audience ?? 'STAFF'} disabled={savingAudience} onChange={(audience) => onAudienceChange(event, audience)} />}{event.description && <p>{event.description}</p>}<p><time dateTime={event.startDate}>{eventTime(event.startDate)}</time> – <time dateTime={event.endDate}>{eventTime(event.endDate)}</time> NPT</p></article>)}</div> : <p className="nepal-calendar__empty">No events scheduled for this day. Select another date to review its schedule.</p>}
      </div>}
    </> : <div className="nepal-calendar__message" role="status">BS conversion is unavailable for this date. Switch to AD or select Today.</div>}
  </section>;
}
