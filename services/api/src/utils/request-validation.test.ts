import assert from 'node:assert/strict';
import { authInputSchemas, parseStrictKeys, parseStrictObject, readFiniteNumber } from './request-validation';

function expectInvalid(body: unknown, expectedError: string): void {
  const result = parseStrictObject(body, authInputSchemas.forgotPassword);
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error, expectedError);
}

const normalizedEmail = parseStrictObject(
  { email: '  ADMIN@TMS.LOCAL ' },
  authInputSchemas.forgotPassword,
);
assert.deepEqual(normalizedEmail, { success: true, data: { email: 'admin@tms.local' } });

expectInvalid({ email: 'admin@tms.local', role: 'Tenant Admin' }, 'Unexpected field: role.');
expectInvalid({ email: ['admin@tms.local'] }, 'A valid email address is required.');
expectInvalid({ email: 'not-an-email' }, 'A valid email address is required.');

const validReset = parseStrictObject(
  { resetToken: 'a'.repeat(64), newPassword: 'Secure-Passphrase-2026!' },
  authInputSchemas.resetPassword,
);
assert.equal(validReset.success, true);

const invalidReset = parseStrictObject(
  { resetToken: 'short', newPassword: 'Secure-Passphrase-2026!' },
  authInputSchemas.resetPassword,
);
assert.equal(invalidReset.success, false);

const financeShape = parseStrictObject(
  { transactionId: 'BANK-REF/2026-08-03' },
  {
    fields: {
      transactionId: {
        maxLength: 128,
        pattern: /^[A-Za-z0-9._/-]+$/,
        message: 'transactionId must be a valid payment reference.',
      },
    },
  },
);
assert.equal(financeShape.success, true);

const geoShape = parseStrictKeys(
  { branchId: 'branch-1', latitude: 27.7172, longitude: 85.324, gpsAccuracy: 12 },
  ['branchId', 'latitude', 'longitude', 'gpsAccuracy'],
);
assert.equal(geoShape.success, true);
if (geoShape.success) {
  assert.deepEqual(readFiniteNumber(geoShape.data, 'latitude', { min: -90, max: 90, message: 'invalid' }), { success: true, data: 27.7172 });
  assert.equal(readFiniteNumber(geoShape.data, 'gpsAccuracy', { min: 0, max: 20, message: 'invalid' }).success, true);
}
assert.equal(parseStrictKeys({ branchId: 'branch-1', spoofed: true }, ['branchId']).success, false);

console.log('request-validation tests passed');
