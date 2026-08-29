import assert from 'node:assert/strict';
import { canReleaseAdmissionLogins, isInvoiceOverdue, recurringInvoiceType } from './billing-rules';

assert.equal(recurringInvoiceType('GRADE', false), null, 'UKG–10 regular courses are covered by grade tuition');
assert.equal(recurringInvoiceType('SUBJECT', false), 'SUBJECT', 'Grades 11–12 bill selected subjects');
assert.equal(recurringInvoiceType('GRADE', true), 'ACTIVITY', 'activities are separate from grade tuition');
assert.equal(recurringInvoiceType('SUBJECT', true), 'ACTIVITY', 'activities remain separate for Grades 11–12');
assert.equal(canReleaseAdmissionLogins('PENDING_PAYMENT', 'UNPAID'), false);
assert.equal(canReleaseAdmissionLogins('READY_FOR_LOGIN', 'UNPAID'), false);
assert.equal(canReleaseAdmissionLogins('READY_FOR_LOGIN', 'PAID'), true);
const now = new Date('2026-08-29T12:00:00.000Z');
assert.equal(isInvoiceOverdue('OVERDUE', '2026-09-01T00:00:00.000Z', now), true, 'explicit overdue status always counts');
assert.equal(isInvoiceOverdue('UNPAID', '2026-08-28T00:00:00.000Z', now), true, 'past-due unpaid invoice counts before cron updates its status');
assert.equal(isInvoiceOverdue('UNPAID', '2026-08-30T00:00:00.000Z', now), false, 'future unpaid invoice is outstanding, not overdue');
assert.equal(isInvoiceOverdue('PAID', '2026-08-28T00:00:00.000Z', now), false, 'paid invoice never counts as overdue');

console.log('billing rule tests passed');
