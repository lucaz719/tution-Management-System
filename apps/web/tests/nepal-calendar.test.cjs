const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the actual TypeScript utility with the installed conversion dataset.
const filename = path.resolve(__dirname, '../src/utils/nepalCalendar.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const utilityModule = new Module(filename, module);
utilityModule.filename = filename;
utilityModule.paths = module.paths;
utilityModule._compile(compiled.outputText, filename);
const calendar = utilityModule.exports;

test('reference date and Nepal midnight remain correct in different browser timezones', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Asia/Kathmandu', 'UTC', 'America/Los_Angeles', 'Pacific/Auckland']) {
      process.env.TZ = zone;
      assert.equal(calendar.nepalDateKey('2026-09-04T18:14:59Z'), '2026-09-04');
      assert.equal(calendar.nepalDateKey('2026-09-04T18:15:00Z'), '2026-09-05');
      assert.equal(calendar.nepaliDateHeading('2026-09-05'), '२० भदौ २०८३, शनिबार');
      assert.deepEqual(calendar.bsDate('2026-09-05'), { year: 2083, month: 4, day: 20 });
      assert.equal(calendar.nepalDateTimeInputToIso('2026-09-05T09:00'), '2026-09-05T03:15:00.000Z');
      assert.equal(calendar.nepalTimeLabel(new Date('2026-09-04T18:15:00Z')), '12:00:00 AM');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test('every supported BS month has correct complete weeks and reversible navigation', () => {
  for (const year of calendar.BS_YEARS) {
    for (let month = 0; month < 12; month++) {
      const anchor = calendar.monthAnchor(year, month, 'BS');
      const view = calendar.calendarMonth(anchor, 'BS');
      assert.equal(view.first, anchor);
      assert.equal(calendar.bsDate(view.first).day, 1);
      assert.equal(calendar.bsDate(view.last).month, month);
      assert.equal(calendar.dateFromKey(view.cells[0]).getUTCDay(), 0);
      assert.equal(view.cells.length % 7, 0);
      assert.ok(view.cells.includes(view.last));
      assert.ok(view.cells.at(-8) < view.last, 'No redundant final week');
      const next = calendar.shiftCalendarMonth(anchor, 1, 'BS');
      if (next) assert.equal(calendar.shiftCalendarMonth(next, -1, 'BS'), anchor);
    }
  }
  assert.equal(calendar.shiftCalendarMonth(calendar.monthAnchor(calendar.BS_YEARS[0], 0, 'BS'), -1, 'BS'), null);
  assert.equal(calendar.shiftCalendarMonth(calendar.monthAnchor(calendar.BS_YEARS.at(-1), 11, 'BS'), 1, 'BS'), null);
  assert.equal(calendar.bsDate('1800-01-01'), null);
});

test('Today anchors to its BS month and Gregorian leap months remain correct', () => {
  const current = calendar.calendarMonth('2026-09-05', 'BS');
  assert.equal(current.first, '2026-08-17');
  assert.equal(current.last, '2026-09-16');
  const leapMonth = calendar.calendarMonth('2024-02-15', 'AD');
  assert.equal(leapMonth.last, '2024-02-29');
  assert.equal(calendar.shiftCalendarMonth('2026-12-15', 1, 'AD'), '2027-01-01');
});

test('events use inclusive Nepal dates, including midnight and date-only holidays', () => {
  const event = { startDate: '2026-09-04T18:15:00Z', endDate: '2026-09-06T18:14:59Z' };
  assert.equal(calendar.eventOccursOn(event, '2026-09-04'), false);
  assert.equal(calendar.eventOccursOn(event, '2026-09-05'), true);
  assert.equal(calendar.eventOccursOn(event, '2026-09-06'), true);
  assert.equal(calendar.eventOccursOn(event, '2026-09-07'), false);
  assert.equal(calendar.eventOccursOn({ startDate: '2026-09-05', endDate: '2026-09-05' }, '2026-09-05'), true);
  assert.equal(calendar.eventOccursOn({ startDate: 'invalid', endDate: 'invalid' }, '2026-09-05'), false);
});

test('appointment Nepal wall time round-trips independently of browser timezone', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Kathmandu', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(calendar.nepalDateTimeInput('2026-09-06T18:30:00Z'), '2026-09-07T00:15');
      assert.equal(calendar.nepalDateTimeInputToIso('2026-09-07T00:15'), '2026-09-06T18:30:00.000Z');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
