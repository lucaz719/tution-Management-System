export const SCHEDULE_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface ScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_SET = new Set<string>(SCHEDULE_DAYS);

export function normalizeSchedule(value: unknown): ScheduleSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const slot = candidate as Record<string, unknown>;
    const day = typeof slot.day === 'string' ? slot.day : '';
    const startTime = typeof slot.startTime === 'string' ? slot.startTime : typeof slot.start === 'string' ? slot.start : '';
    const endTime = typeof slot.endTime === 'string' ? slot.endTime : typeof slot.end === 'string' ? slot.end : '';
    const room = typeof slot.room === 'string' ? slot.room.trim() : '';
    return DAY_SET.has(day) && TIME_PATTERN.test(startTime) && TIME_PATTERN.test(endTime) && startTime < endTime
      ? [{ day, startTime, endTime, room }]
      : [];
  });
}

export function sortSchedule(slots: ScheduleSlot[]): ScheduleSlot[] {
  return [...slots].sort((a, b) => SCHEDULE_DAYS.indexOf(a.day as typeof SCHEDULE_DAYS[number]) - SCHEDULE_DAYS.indexOf(b.day as typeof SCHEDULE_DAYS[number]) || a.startTime.localeCompare(b.startTime));
}

export function slotsOverlap(left: ScheduleSlot, right: ScheduleSlot): boolean {
  return left.day === right.day && left.startTime < right.endTime && left.endTime > right.startTime;
}
