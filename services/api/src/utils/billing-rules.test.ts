import assert from 'node:assert/strict';
import { canReleaseAdmissionLogins, recurringInvoiceType } from './billing-rules';

assert.equal(recurringInvoiceType('GRADE', false), null, 'UKG–10 regular courses are covered by grade tuition');
assert.equal(recurringInvoiceType('SUBJECT', false), 'SUBJECT', 'Grades 11–12 bill selected subjects');
assert.equal(recurringInvoiceType('GRADE', true), 'ACTIVITY', 'activities are separate from grade tuition');
assert.equal(recurringInvoiceType('SUBJECT', true), 'ACTIVITY', 'activities remain separate for Grades 11–12');
assert.equal(canReleaseAdmissionLogins('PENDING_PAYMENT', 'UNPAID'), false);
assert.equal(canReleaseAdmissionLogins('READY_FOR_LOGIN', 'UNPAID'), false);
assert.equal(canReleaseAdmissionLogins('READY_FOR_LOGIN', 'PAID'), true);

console.log('billing rule tests passed');
