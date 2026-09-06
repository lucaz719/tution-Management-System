# Phase 2: billing and attendance

Implemented the next four audit priorities with the user-approved rule: overdue debt blocks only enrollments in the invoice's issuing branch.

## Behavior changes

- **QA-03:** Overdue automation changes only UNPAID invoices whose stored due timestamp is earlier than the run time. It blocks ACTIVE enrollments in the matching student/branch/tenant scope. Invoice and enrollment updates run in one transaction. Existing explicit OVERDUE statuses remain authoritative; historical bad data is not automatically repaired.
- **QA-05:** The check-in gate considers only incomplete sessions dated before today's Nepal calendar date. Today's generated sessions no longer prevent arrival check-in.
- **QA-06:** A shared billing-access service reconciles access after NepalPay, connectIPS, manual receipt approval, and manual invoice payment. Remaining overdue debt, including past-due UNPAID invoices not yet processed by cron, prevents restoration. Other branches and completed enrollments are not changed by that settlement. Admission/account activation and enrollment validity are checked before restoration.
- **QA-07:** NepalPay admission delivery derives tenant context from the invoice. A retry for the same paid invoice and transaction can retry a reported failed admission delivery without recording payment twice. Amount and transaction mismatches are rejected. Reported delivery failures return a retryable HTTP 503.

Admission credential delivery no longer unconditionally restores every enrollment. After successful delivery, each enrolled branch is reconciled against its own debt. Existing admission delivery retry bookkeeping is reused.

## Verification

Final local results: all **19 non-integration test files passed**, the backend TypeScript no-emit check passed, and `git diff --check` passed.

The Phase 2 suite exercises real route handlers with mocked authentication, database operations, and admission delivery. It checks:

- Past, future, and exact-boundary invoice timestamps; tenant and branch separation.
- Preservation of completed enrollments and a simulated transaction rollback on an enrollment-write failure.
- Remaining overdue debt, pending admission, expired enrollments, and branch-specific restoration.
- Today's check-in, yesterday's missing update, completed updates, and Nepal midnight boundaries.
- Signed/invalid callbacks, remaining debt, invoice-derived tenant scope, delivery retry, duplicate payment prevention, and a conflicting transaction reference.

Run with `npm.cmd run test:phase-two-billing --workspace=@tms/api`. The suite is also wired into CI.

These are local regression checks, not evidence of live PostgreSQL isolation, remote CI success, provider delivery, or deployed behavior. No database migration or deployment was performed.

## Limits and next phase

The current delivery flow still lacks a durable outbox. A process crash after activation but before delivery bookkeeping is committed needs separate recovery work; the callback changes cover reported delivery failures, not every crash window. Provider callback retry policy has not been exercised live.

Phase 3 should address that durable delivery workflow, appointment state transitions and concurrent approvals, and atomic maintenance logging. Real PostgreSQL integration and concurrent payment/cron testing remain necessary before production sign-off.
