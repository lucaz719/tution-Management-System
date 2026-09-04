import assert from 'node:assert/strict';
import { nepalCalendarDate, nepalWeekday } from './timetable-service';

const beforeNepalMidnight = new Date('2026-09-03T18:14:59.000Z');
assert.equal(nepalCalendarDate(beforeNepalMidnight).toISOString(), '2026-09-03T00:00:00.000Z');
assert.equal(nepalWeekday(beforeNepalMidnight), 'Thu');

const afterNepalMidnight = new Date('2026-09-03T18:15:00.000Z');
assert.equal(nepalCalendarDate(afterNepalMidnight).toISOString(), '2026-09-04T00:00:00.000Z');
assert.equal(nepalWeekday(afterNepalMidnight), 'Fri');

console.log('timetable service timezone tests passed');
