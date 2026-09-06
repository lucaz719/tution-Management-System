import { MONTH_EN, NEPALI_DATE_MAP, NepaliDate } from 'nepali-date-library';
import type { CalendarSystem } from './nepaliDate';

export const NEPAL_TIME_ZONE = 'Asia/Kathmandu';
export const NEPALI_WEEKDAYS = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'];
export const BS_MONTHS = ['वैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
export const BS_YEARS = NEPALI_DATE_MAP.map((entry) => entry.year);
const dayMs = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: NEPAL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: NEPAL_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

export function nepaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => '०१२३४५६७८९'[Number(digit)]);
}

/** Instants become Nepal dates; date-only keys always retain their calendar meaning. */
export function nepalDateKey(value: Date | string = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = dateFormatter.formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** UTC is a date-only arithmetic container here, not the event's timezone. */
export function dateFromKey(key: string): Date { return new Date(`${key}T00:00:00Z`); }
export function addCalendarDays(key: string, days: number): string { return new Date(dateFromKey(key).getTime() + days * dayMs).toISOString().slice(0, 10); }
export function bsDate(key: string): { year: number; month: number; day: number } | null {
  try {
    const date = new NepaliDate(dateFromKey(key));
    return { year: date.year, month: date.month, day: date.day };
  } catch { return null; }
}
export function nepaliDateHeading(key: string): string {
  const bs = bsDate(key);
  return bs ? `${nepaliDigits(bs.day)} ${BS_MONTHS[bs.month]} ${nepaliDigits(bs.year)}, ${NEPALI_WEEKDAYS[dateFromKey(key).getUTCDay()]}` : 'नेपाली मिति उपलब्ध छैन';
}
export function englishDateLabel(key: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  return dateFromKey(key).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}
export function nepalTimeLabel(instant: Date): string { return timeFormatter.format(instant); }

export function monthAnchor(year: number, month: number, system: CalendarSystem): string {
  return system === 'BS' ? new NepaliDate(year, month, 1).getEnglishDate().toISOString().slice(0, 10) : new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function calendarMonth(anchor: string, system: CalendarSystem) {
  const ad = dateFromKey(anchor);
  const parts = system === 'BS' ? bsDate(anchor) : { year: ad.getUTCFullYear(), month: ad.getUTCMonth() };
  if (!parts) return null;
  const { year, month } = parts;
  const first = monthAnchor(year, month, system);
  const days = system === 'BS' ? NEPALI_DATE_MAP.find((entry) => entry.year === year)!.days[month] : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const last = addCalendarDays(first, days - 1);
  const start = addCalendarDays(first, -dateFromKey(first).getUTCDay());
  const count = Math.ceil((dateFromKey(first).getUTCDay() + days) / 7) * 7;
  const cells = Array.from({ length: count }, (_, index) => addCalendarDays(start, index));
  const heading = system === 'BS' ? `${BS_MONTHS[month]} ${nepaliDigits(year)}` : englishDateLabel(first, { month: 'long', year: 'numeric' });
  const range = `${englishDateLabel(first)} – ${englishDateLabel(last)}`;
  return { year, month, first, last, cells, heading, subtitle: system === 'BS' ? `${MONTH_EN[month]} · ${range}` : range };
}

export function shiftCalendarMonth(anchor: string, offset: number, system: CalendarSystem): string | null {
  const current = calendarMonth(anchor, system);
  if (!current) return null;
  const absolute = current.year * 12 + current.month + offset;
  const year = Math.floor(absolute / 12);
  const month = ((absolute % 12) + 12) % 12;
  if (system === 'BS' && !BS_YEARS.includes(year)) return null;
  if (year < 1900 || year > 2200) return null;
  return monthAnchor(year, month, system);
}

export function eventOccursOn(event: { startDate: string; endDate: string }, key: string): boolean {
  try { return nepalDateKey(event.startDate) <= key && nepalDateKey(event.endDate) >= key; }
  catch { return false; }
}

export function nepalDateTimeInputToIso(value: string): string {
  const instant = new Date(`${value}:00+05:45`);
  if (Number.isNaN(instant.getTime())) throw new Error('Enter a valid Nepal date and time.');
  return instant.toISOString();
}
