import assert from 'node:assert/strict';
import { normalizeSchedule, parseSchedule } from './schedule';

const canonical = [{ day: 'Sun', startTime: '08:00', endTime: '09:00', room: 'Lab 1' }];
assert.deepEqual(normalizeSchedule(canonical), canonical);
assert.deepEqual(
  normalizeSchedule([{ day: 'Mon', start: '09:15', end: '10:00', room: 'Room 2' }]),
  [{ day: 'Mon', startTime: '09:15', endTime: '10:00', room: 'Room 2' }],
  'legacy slots normalize to the canonical contract',
);
assert.deepEqual(parseSchedule([{ day: 'Tue', start: '10:00', end: '11:00' }]), {
  success: true,
  data: [{ day: 'Tue', startTime: '10:00', endTime: '11:00', room: '' }],
});
assert.equal(parseSchedule([{ day: 'Wed', startTime: '11:00', endTime: '10:00' }]).success, false);
assert.equal(parseSchedule([{ day: 'Thu', start: '08:00', end: '09:00', startTime: '08:00', endTime: '09:00' }]).success, false);
assert.equal(parseSchedule([
  { day: 'Fri', startTime: '08:00', endTime: '09:00', room: 'A' },
  { day: 'Fri', startTime: '08:00', endTime: '09:00', room: 'A' },
]).success, false);
assert.deepEqual(normalizeSchedule({ days: ['Sun'], time: '08:00' }), [], 'unsupported legacy objects do not leak into portal responses');

console.log('schedule contract tests passed');
