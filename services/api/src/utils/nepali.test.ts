import assert from 'node:assert/strict';
import { formatBsDate, getAdmissionTenure, getBillingPeriod } from './nepali';

void (async () => {
  const tenure = await getAdmissionTenure(new Date('2026-09-04T12:00:00.000Z'));
  assert.equal(await formatBsDate(tenure.start), 'Bhadra 19, 2083');
  assert.equal(await formatBsDate(tenure.end), 'Bhadra 18, 2084');
  assert.ok(tenure.end > tenure.start);

  const period = await getBillingPeriod(new Date('2026-09-15T00:00:00.000Z'), 10);
  assert.equal(period.label, 'Bhadra 2083');
  assert.equal(await formatBsDate(period.cycleStart), 'Bhadra 1, 2083');
  assert.equal(await formatBsDate(period.cycleEnd), `Bhadra ${period.daysInMonth}, 2083`);
  assert.equal(period.dueDate.getTime() - period.cycleStart.getTime(), 10 * 86_400_000);
  assert.ok(period.cycleStart <= new Date('2026-09-15T00:00:00.000Z'));
  assert.ok(period.cycleEnd >= new Date('2026-09-15T00:00:00.000Z'));
  console.log('Nepali billing period and admission tenure tests passed');
})();
