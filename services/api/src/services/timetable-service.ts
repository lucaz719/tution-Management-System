import prisma from '../utils/db';
import { normalizeSchedule, SCHEDULE_DAYS } from '../utils/schedule';

const NEPAL_TIME_ZONE = 'Asia/Kathmandu';

export function nepalCalendarDate(value = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NEPAL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(number('year'), number('month') - 1, number('day')));
}

export function nepalWeekday(value = new Date()): string {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: NEPAL_TIME_ZONE, weekday: 'short' }).format(value);
  return SCHEDULE_DAYS.find((day) => day === short) ?? short;
}

export async function generateDailyTeacherSessions(params: { tenantId: string; instant?: Date }) {
  const instant = params.instant ?? new Date();
  const date = nepalCalendarDate(instant);
  const day = nepalWeekday(instant);
  const classes = await prisma.class.findMany({
    where: {
      teacherId: { not: null },
      course: { tenantId: params.tenantId },
      AND: [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: date } }] },
        { OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: date } }] },
      ],
    },
    select: { id: true, teacherId: true, schedule: true },
  });
  const scheduled = classes.filter((klass) => normalizeSchedule(klass.schedule).some((slot) => slot.day === day));
  const existing = await prisma.teacherSession.findMany({
    where: { date, classId: { in: scheduled.map((klass) => klass.id) } },
    select: { teacherId: true, classId: true },
  });
  const keys = new Set(existing.map((item) => `${item.teacherId}:${item.classId}`));
  const missing = scheduled.filter((klass) => klass.teacherId && !keys.has(`${klass.teacherId}:${klass.id}`));
  if (missing.length) await prisma.teacherSession.createMany({
    data: missing.map((klass) => ({ teacherId: klass.teacherId!, classId: klass.id, date })),
  });
  return { date, day, eligible: scheduled.length, created: missing.length };
}
