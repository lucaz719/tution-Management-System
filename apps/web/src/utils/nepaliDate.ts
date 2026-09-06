import { MONTH_EN, NepaliDate } from 'nepali-date-library';

export interface BsDateParts { year: number; month: number; day: number; monthName: string }
export type CalendarSystem = 'AD' | 'BS';

function calendarDate(input: string | Date): Date {
  if (input instanceof Date) return new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])));
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(parsed);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
}

export function toBsParts(adInput: string | Date | null | undefined): BsDateParts | null {
  if (!adInput) return null;
  try {
    const converted = new NepaliDate(calendarDate(adInput));
    return { year: converted.year, month: converted.month, day: converted.day, monthName: MONTH_EN[converted.month] };
  } catch { return null; }
}

// "Ashadh 29, 2083" — a full BS date for display to Nepali users.
export function toBsLabel(adInput: string | Date | null | undefined): string {
  if (!adInput) return '—';
  const bs = toBsParts(adInput);
  return bs ? `${bs.monthName} ${bs.day}, ${bs.year} BS` : '—';
}

// "Ashadh 2083" — the BS month/year, used for billing-cycle labels.
export function toBsMonthLabel(adInput: string | Date | null | undefined): string {
  if (!adInput) return '—';
  const bs = toBsParts(adInput);
  return bs ? `${bs.monthName} ${bs.year} BS` : '—';
}

export function toBsMonthRangeLabel(adMonth: Date): string {
  const first = new Date(adMonth.getFullYear(), adMonth.getMonth(), 1);
  const last = new Date(adMonth.getFullYear(), adMonth.getMonth() + 1, 0);
  const start = toBsParts(first); const end = toBsParts(last);
  if (!start || !end) return '—';
  if (start.year === end.year && start.month === end.month) return `${start.monthName} ${start.year} BS`;
  if (start.year === end.year) return `${start.monthName}–${end.monthName} ${start.year} BS`;
  return `${start.monthName} ${start.year}–${end.monthName} ${end.year} BS`;
}

export function calendarMonthLabel(anchor: Date, system: CalendarSystem): string {
  if (system === 'AD') return `${anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} AD`;
  const bs = toBsParts(anchor);
  return bs ? `${bs.monthName} ${bs.year} BS` : '—';
}

export function calendarDateLabel(date: Date, system: CalendarSystem, includeWeekday = true): string {
  if (system === 'BS') return toBsLabel(date);
  return `${date.toLocaleDateString('en-US', { weekday: includeWeekday ? 'long' : undefined, month: 'long', day: 'numeric', year: 'numeric' })} AD`;
}

export function calendarDayNumber(date: Date, system: CalendarSystem): number {
  return system === 'BS' ? (toBsParts(date)?.day ?? date.getDate()) : date.getDate();
}

export function calendarMonthCells(anchor: Date, system: CalendarSystem): Date[] {
  let first: Date;
  if (system === 'BS') {
    const bs = new NepaliDate(calendarDate(anchor));
    first = new NepaliDate(bs.year, bs.month, 1).getEnglishDate();
  } else {
    first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  }
  first = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export function moveCalendarMonth(anchor: Date, offset: number, system: CalendarSystem): Date {
  if (system === 'BS') {
    const bs = new NepaliDate(calendarDate(anchor)).startOfMonth().addMonths(offset);
    const date = bs.getEnglishDate();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  return new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
}

export function isInCalendarMonth(date: Date, anchor: Date, system: CalendarSystem): boolean {
  if (system === 'AD') return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
  const value = toBsParts(date); const visible = toBsParts(anchor);
  return Boolean(value && visible && value.year === visible.year && value.month === visible.month);
}

export function toDualDateLabel(adInput: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!adInput) return '—';
  try {
    const date = calendarDate(adInput);
    return `${date.toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' })} AD · ${toBsLabel(adInput)}`;
  } catch { return '—'; }
}
