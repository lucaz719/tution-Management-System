import assert from 'node:assert/strict';
import { canReleaseAdmissionLogins, isInvoiceOverdue, recurringInvoiceType } from './billing-rules';
import { studentBillingSummary } from './student-billing-summary';

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

const packageSummary = studentBillingSummary(
  { name: 'Class 8', billingMode: 'GRADE', monthlyFee: 2500 },
  [{
    id: 'enrolment-1', status: 'ACTIVE',
    course: { id: 'math-8', name: 'Mathematics', isExtraActivity: false, isTaxExempt: false, taxPercentage: 13, feeStructure: { monthlyBase: 999 } },
    class: { id: 'class-8', name: 'Class 8 A' },
  }],
);
assert.equal(packageSummary.setupStatus, 'READY');
assert.equal(packageSummary.recurringTotal, 2500, 'package grades do not add regular subject prices');
assert.deepEqual(packageSummary.lines.map((line) => line.type), ['GRADE']);

const subjectSummary = studentBillingSummary(
  { name: 'Class 12', billingMode: 'SUBJECT', monthlyFee: 0 },
  [{
    id: 'enrolment-2', status: 'ACTIVE',
    course: { id: 'physics-12', name: 'Physics', isExtraActivity: false, isTaxExempt: false, taxPercentage: 13, feeStructure: { monthlyBase: 2000 } },
    class: { id: 'physics-class', name: 'Physics A' },
  }],
);
assert.equal(subjectSummary.setupStatus, 'READY');
assert.equal(subjectSummary.recurringTotal, 2260, 'senior grades total selected subjects including tax');
assert.deepEqual(subjectSummary.lines.map((line) => line.type), ['SUBJECT']);

const incompleteSubjectSummary = studentBillingSummary(
  { name: 'Class 11', billingMode: 'SUBJECT', monthlyFee: 0 },
  [],
);
assert.equal(incompleteSubjectSummary.setupStatus, 'INCOMPLETE');
assert.match(incompleteSubjectSummary.blockers[0], /Select at least one/);

console.log('billing rule tests passed');
