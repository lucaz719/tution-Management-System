# Phase 1 implementation and QA report

**Status:** All four planned fixes implemented locally. Targeted route regression tests pass. Database integration and staging sign-off remain pending.

**Phase 1 score: 8/10, provisional. Overall backend score: 5.5/10, up from 5.0/10. Production release remains on hold.**

This report follows the [original backend audit](backend-qa-audit-2026-09-07.md). Scores are engineering judgments, not coverage percentages or independent security certification. The original audit remains a historical baseline.

## Changes delivered

| Audit finding | Before | After | Verification |
|---|---|---|---|
| QA-01 — High: password-hash exposure | Appointment listings included every student user field | Student user projection includes only first and last names | Teacher and parent listing scenarios verify exact fields and absence of the hash |
| QA-02 — High: cross-tenant academic writes | Tenant admins could bypass failed ownership lookups | Scores always require a tenant-scoped student match; remarks explicitly verify student ownership before permissions | Foreign/missing students return 404 with no writes; own-tenant admin and assigned-teacher flows pass |
| QA-04 — High: forged appointment participants | Non-group appointments saved arbitrary participant IDs | Strict boolean/array validation; single appointments accept only the selected teacher; groups require assigned teachers | Valid single/group requests pass; unrelated participants and malformed input fail without writes |
| QA-10 — Medium: cross-branch certificate issue | Student and branch were checked independently | Student must have ACTIVE or BLOCKED enrollment in the issuing branch, matching the existing certificate options flow | Wrong-branch, foreign, missing and inactive students fail; eligible students pass for tenant and branch admins |

The appointment response handler also revalidates stored group participants against current teacher assignments and uses the recipient for single appointments. Previously forged participant lists therefore cannot grant a parent response authority. Existing records are not rewritten.

Certificate ownership lookups now run inside the handler's error boundary so lookup failures are caught.

## Files changed

- [appointments.ts](../services/api/src/routes/appointments.ts): safe student fields, booking validation, and response authorization.
- [performance.ts](../services/api/src/routes/performance.ts): tenant ownership checks for scores and remarks.
- [certificates.ts](../services/api/src/routes/certificates.ts): branch-enrollment eligibility and lookup error handling.
- [phase-one-security.test.ts](../services/api/src/routes/phase-one-security.test.ts): 11 regression scenarios using real route middleware/handlers and mocked authentication/persistence.
- [API package.json](../services/api/package.json): `test:phase-one-security` command.
- [CI workflow](../.github/workflows/ci.yml): runs the new regression suite on configured pushes and pull requests. Remote CI has not been executed during this work.

No database migration was required. Existing mobile changes were left untouched. Changes have not been deployed.

## Verification results

| Check | Result | What it establishes |
|---|---|---|
| Regression run before fixes | Six scenario groups failed | The tests reproduced exposure, tenant bypass, participant injection, malformed controls, legacy participant authorization, and branch eligibility defects |
| Phase 1 regression run after fixes | 11/11 scenarios passed | Targeted negative and positive route behavior works with controlled persistence |
| Complete non-integration backend suite | 18/18 test files passed | No regression detected by the available standalone backend checks |
| TypeScript no-emit check | Passed | Backend compiles under its existing strict TypeScript configuration |
| Diff whitespace check | Passed | No whitespace errors detected in tracked changes |
| PostgreSQL integration suite | Not run | Actual queries, constraints and persisted effects still require isolated database validation |
| Browser/mobile, staging and deployment checks | Not run | Client compatibility and deployed behavior have not been certified |

Repeat the targeted suite with:

```powershell
npm.cmd run test:phase-one-security --workspace=@tms/api
npx.cmd --no-install tsc --noEmit -p services/api/tsconfig.json
```

Tests intentionally avoid live database mutations and provider deliveries. The repository's database integration setup force-resets a fixed schema; a disposable test database should be established before running it.

## Score explanation

Phase 1 receives **8/10** because the planned boundaries are implemented, failure cases were reproduced before fixes, valid flows have positive controls, and the new tests are wired into CI. The remaining two points reflect missing real-database and staging verification. This phase score measures only the delivered scope.

The overall backend score retains the original audit's six equally weighted dimensions:

| Dimension | Before | After | Reason |
|---|---:|---:|---|
| Architecture and maintainability | 6 | 6 | No broad architectural change |
| Security and isolation | 4 | 6 | Four targeted authorization/data-exposure findings addressed; broader and database-backed verification pending |
| Business-rule correctness | 4 | 4 | Billing and attendance defects remain |
| Data integrity and concurrency | 5 | 5 | Cross-tenant write prevention improved; outstanding atomicity and concurrency work prevents a broader upgrade |
| Automated QA | 5 | 6 | New failing-before/passing-after scenarios and dedicated CI execution; full backend/database CI still pending |
| Operational readiness | 5 | 5 | Mock delivery and unfinished automation remain |
| **Average** | **5.0** | **5.5** | **Improved security, but no production sign-off yet** |

## Remaining work and release recommendation

Four original findings are addressed in code with mocked route verification: **three High and one Medium**. Eight original findings remain: **three High and five Medium**. The separate further-concern list in the audit is also still open.

Start Phase 2 with:

1. QA-03: apply due dates and eligible enrollment states to overdue automation.
2. QA-05: exclude today's sessions from the previous-update check-in gate.
3. QA-06: reconcile remaining debt before restoring enrollment access.
4. QA-07: derive webhook tenant context from the invoice and make post-payment delivery recoverable.

Before production sign-off, validate Phase 1 against an isolated PostgreSQL instance, verify parent/teacher/certificate flows in staging, and resolve the remaining High findings. The current score should not be interpreted as approval to release.
