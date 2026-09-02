import { parseStrictKeys, type ValidationResult } from './request-validation';

export const SCHEDULE_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const SCHEDULE_DAY_SET = new Set<string>(SCHEDULE_DAYS);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

function canonicalSlot(value: unknown): ScheduleSlot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const slot = value as Record<string, unknown>;
  const day = typeof slot.day === 'string' ? slot.day : '';
  const startTime = typeof slot.startTime === 'string' ? slot.startTime : typeof slot.start === 'string' ? slot.start : '';
  const endTime = typeof slot.endTime === 'string' ? slot.endTime : typeof slot.end === 'string' ? slot.end : '';
  const room = typeof slot.room === 'string' ? slot.room.trim() : '';
  if (!SCHEDULE_DAY_SET.has(day) || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || startTime >= endTime || room.length > 120) return null;
  return { day, startTime, endTime, room };
}

export function normalizeSchedule(value: unknown): ScheduleSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((slot) => {
    const normalized = canonicalSlot(slot);
    return normalized ? [normalized] : [];
  });
}

export function parseSchedule(value: unknown): ValidationResult<ScheduleSlot[]> {
  if (!Array.isArray(value) || value.length > 14) {
    return { success: false, error: 'schedule must be an array of at most 14 timetable slots.' };
  }
  const slots: ScheduleSlot[] = [];
  for (const [index, slot] of value.entries()) {
    const shape = parseStrictKeys(slot, ['day', 'start', 'end', 'startTime', 'endTime', 'room']);
    if (!shape.success) return { success: false, error: `Schedule slot ${index + 1}: ${shape.error}` };
    const hasLegacyTimes = shape.data.start !== undefined || shape.data.end !== undefined;
    const hasCanonicalTimes = shape.data.startTime !== undefined || shape.data.endTime !== undefined;
    if (hasLegacyTimes === hasCanonicalTimes) {
      return { success: false, error: `Schedule slot ${index + 1} must use either start/end or startTime/endTime.` };
    }
    const normalized = canonicalSlot(shape.data);
    if (!normalized) {
      return { success: false, error: `Schedule slot ${index + 1} must have a valid weekday, increasing HH:mm time range, and a room of 120 characters or fewer.` };
    }
    slots.push(normalized);
  }
  const uniqueSlots = new Set(slots.map((slot) => `${slot.day}:${slot.startTime}:${slot.endTime}:${slot.room.toLowerCase()}`));
  if (uniqueSlots.size !== slots.length) {
    return { success: false, error: 'schedule cannot contain duplicate timetable slots.' };
  }
  return { success: true, data: slots };
}
