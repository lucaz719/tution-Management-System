import assert from 'node:assert/strict';
import { formatBsDate, getAdmissionTenure } from './nepali';

void (async () => {
  const tenure = await getAdmissionTenure(new Date('2026-09-04T12:00:00.000Z'));
  assert.equal(await formatBsDate(tenure.start), 'Bhadra 19, 2083');
  assert.equal(await formatBsDate(tenure.end), 'Bhadra 18, 2084');
  assert.ok(tenure.end > tenure.start);
  console.log('Nepali admission tenure tests passed');
})();
