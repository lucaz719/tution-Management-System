import assert from 'node:assert/strict';
import { standardGradeBillingMode } from './standard-grade-billing';

assert.equal(standardGradeBillingMode('UKG'), 'GRADE');
assert.equal(standardGradeBillingMode('Class 1'), 'GRADE');
assert.equal(standardGradeBillingMode('Grade 10'), 'GRADE');
assert.equal(standardGradeBillingMode('Class 11'), 'SUBJECT');
assert.equal(standardGradeBillingMode(' grade   12 '), 'SUBJECT');
assert.equal(standardGradeBillingMode('Foundation'), null);
assert.equal(standardGradeBillingMode('Class 13'), null);

console.log('standard grade billing policy tests passed');
