# ConnectIPS UAT Security and Logic Audit

**Audit date:** 2 August 2026  
**Scope:** Read-only review of the ConnectIPS integration guide and the current TMS codebase.  
**Decision:** Do not enable the end-to-end UAT flow until the release blockers in Section 5 are resolved and verified with NCHL UAT credentials.

## 1. Executive summary

The backend implements the important payment-security rule correctly: a browser return from ConnectIPS is **not** treated as proof of payment. TMS validates the transaction server-to-server with ConnectIPS before recording a payment.

The signing, amount handling, payment attempt persistence, invoice access checks, and validation flow are well designed. The unit test for the signing contract passes. However, the complete UAT customer flow is not yet release-ready:

1. The web application does not currently wire the ConnectIPS initiation and redirect utilities into a rendered payment screen.
2. The production host must be configured to schedule the now-available reconciliation command; otherwise a successful payment can remain pending when the payer closes the browser before returning.
3. The required public HTTPS callback URLs, ConnectIPS credentials, registered URLs, and test payer account are not yet available to verify against the real UAT gateway.

This is an audit only. No application code, secrets, gateway settings, or live payment records were changed.

## 2. Evidence reviewed

- `documents/payment-intrigation-docs/CONNECTIPS_INTEGRATION_GUIDE.md`
- `services/api/src/utils/connectips.ts`
- `services/api/src/utils/connectips.test.ts`
- `services/api/src/routes/finances.ts`
- `services/api/src/routes/cron.ts`
- `services/api/prisma/schema.prisma`
- `services/api/prisma/migrations/20260728203000_connectips_payments/migration.sql`
- `apps/web/src/utils/connectips.ts`
- `apps/web/src/services/api.ts`

Local verification completed:

```text
npm run test:connectips --workspace @tms/api   PASS
npm run build --workspace @tms/api             PASS
git diff --check                               PASS
```

No live ConnectIPS request was made. Local configuration has ConnectIPS disabled and no NCHL UAT merchant credentials or test payer account are available.

## 3. Required payment flow and current behavior

| Stage | Required secure behavior | Current implementation | Result |
|---|---|---|---|
| Start payment | Authorised user selects an unpaid invoice | API checks authenticated user, tenant, invoice access, and unpaid status | Pass |
| Create attempt | Keep a unique transaction ID and fixed expected amount | A unique random `txnId`, provider, tenant, invoice, and paisa amount are stored | Pass |
| Redirect | Send a signed form to ConnectIPS | Backend generates the form and RSA SHA-256 token; client posts it to an HTTPS gateway URL | Pass at backend level |
| Gateway return | Treat `TXNID` return as a hint only | Success return calls server-side validation; failure return never marks the invoice paid | Pass |
| Validation | Validate against ConnectIPS server-to-server | Validation request uses Basic authentication, signed payload, expected `TXNID`, and expected paisa amount | Pass |
| Record payment | Mark paid only after successful validation and matching amount | Transactional, conditional update records payment and prevents duplicate confirmation | Pass |
| Payer experience | Payment page starts redirect and displays final result | API utility exists, but no rendered web flow currently invokes it | Blocked |
| Recovery | Recheck pending attempts after an interrupted browser return | Manual tenant-admin trigger exists; no scheduler/worker exists | Blocked |

## 4. Confirmed security controls

| Control | Evidence | Assessment |
|---|---|---|
| Gateway credentials remain server-side | PFX, PFX password, validation password, merchant and app identifiers are read only from API environment variables | Pass |
| Strong request integrity | Canonical ordered ConnectIPS message is signed with RSA-SHA256 and PKCS#1 padding | Pass |
| Exact amount representation | Gateway amount is converted and stored in paisa; validation checks the stored fixed amount against the invoice | Pass |
| Transaction reference binding | `REFERENCEID` is the generated transaction ID and validation uses that same ID | Pass |
| Input constraints | Transaction ID, amount, merchant/app identifiers, and text fields have validation/bounds | Pass |
| Gateway timeout | Validation requests abort after 15 seconds | Pass |
| Invoice authorisation | Payment initiation checks tenant membership and permitted student/parent/admin/branch access | Pass |
| Duplicate/race resistance | Payment attempt status changes conditionally inside a database transaction | Pass |
| Return URL safety | Callback does not trust browser status or query data as proof of payment | Pass |
| Browser redirect transport | Client accepts HTTPS gateway URLs; plain HTTP is only allowed for localhost development | Pass |

## 5. Findings requiring action before enabling UAT

### CIPS-01 — Cross-tenant reconciliation can be triggered by a tenant administrator

**Severity:** High  
**Status:** Resolved in code; verification pending

`POST /api/cron/trigger` is restricted to tenant administrators. The task now calls `reconcilePendingConnectIps({ tenantId: req.tenantId })`, so the query includes that tenant and cannot select another institution's attempts. A focused test verifies the tenant constraint and the bounded batch limit.

**Affected code:** `services/api/src/routes/cron.ts`, `services/api/src/utils/connectips.ts`

**Implemented remediation:** The authenticated administrator's tenant ID is passed into reconciliation and included in the payment-attempt query. The global form is reserved for the separate server-side scheduler command.

### CIPS-02 — No scheduled recovery for pending ConnectIPS payments

**Severity:** High  
**Status:** Resolved in code; deployment verification pending

The integration guide correctly requires a reconciliation backstop. The API now provides the server-only `npm run connectips:reconcile --workspace @tms/api` command. It is inert while ConnectIPS is disabled and processes globally only when invoked by trusted hosting automation.

**Affected code:** `services/api/src/routes/cron.ts`, `services/api/src/utils/connectips.ts`

**Remaining deployment action:** Configure hosting automation to run the command every five minutes after UAT is enabled. It uses bounded batches and structured non-secret output. Verify schedule execution and alerting for repeated failures in staging.

### CIPS-03 — The product payment UI is not connected to the redirect flow

**Severity:** High  
**Status:** Open

The frontend has `initiateConnectIps`, `getConnectIpsStatus`, and `submitConnectIpsForm` helpers. The audit found no rendered page/component that invokes the initiation and form-submission path. A real user therefore cannot yet begin the payment flow from the product interface or receive a proper post-payment status experience.

**Affected code:** `apps/web/src/services/api.ts`, `apps/web/src/utils/connectips.ts`

**Required remediation:** Implement the invoice payment action, form submission, returning-payment state, status polling/refresh, and success/failure/cancelled messages. The UI must never mark an invoice paid based solely on a browser redirect.

### CIPS-04 — Real UAT infrastructure and credentials have not been verified

**Severity:** Medium (release blocker, not a confirmed code defect)  
**Status:** Pending external access

The required ConnectIPS UAT merchant account, app credentials, PFX, validation password, registered callback URLs, and UAT test payer account are unavailable. The real gateway response, callback reachability, certificate chain, and Basic-auth validation cannot be proven locally.

**Required remediation:** Complete the staging setup and execute the UAT test matrix in Section 7 with credentials supplied through the deployment secret store. Do not place any credential in Git, frontend variables, screenshots, or this document.

### CIPS-05 — Gateway endpoint values are deployment trust boundaries

**Severity:** Low  
**Status:** Operational safeguard required

Gateway and validation URLs are configured through server environment variables. This is appropriate, but a deployment mistake could direct the browser or server validation request to an unintended endpoint.

**Required remediation:** In staging and production, set only the NCHL-provided HTTPS endpoints, restrict who can edit environment variables, review configuration during deployment, and record non-secret endpoint values in the deployment checklist.

## 6. Staging UAT configuration required

NCHL must register these static return URLs (the exact staging host may change only if registered again):

```text
https://api.staging.sanskardipshikshalaya.com.np/api/finances/connectips/return/success
https://api.staging.sanskardipshikshalaya.com.np/api/finances/connectips/return/failure
```

The API deployment needs the following server-only environment variables:

```text
CONNECTIPS_ENABLED=true
CONNECTIPS_MERCHANT_ID
CONNECTIPS_APP_ID
CONNECTIPS_APP_NAME
CONNECTIPS_PFX_BASE64
CONNECTIPS_PFX_PASSWORD
CONNECTIPS_VALIDATE_PASSWORD
CONNECTIPS_GATEWAY_URL=https://uat.connectips.com/connectipswebgw/loginpage
CONNECTIPS_VALIDATE_URL=https://uat.connectips.com/connectipswebws/api/creditor/validatetxn
```

Use only values issued by NCHL. The public API host needs a valid TLS certificate and must be reachable by payer browsers. ConnectIPS uses browser redirection in this design; it is not a webhook integration.

## 7. UAT acceptance test matrix

Run the following only after CIPS-03 is resolved, the CIPS-02 scheduler is configured in staging, and NCHL supplies a UAT payer and credentials.

| Test | Expected result |
|---|---|
| Start an unpaid invoice payment as an authorised user | A new payment attempt is created with the correct fixed invoice amount and signed form fields |
| Complete a successful UAT OTP payment | ConnectIPS returns `TXNID`; TMS validates server-to-server; invoice becomes paid exactly once |
| Cancel or fail payment at ConnectIPS | Invoice remains unpaid; attempt is not successful |
| Refresh or revisit the success URL | No duplicate payment record, invoice state, or receipt |
| Modify a return URL `TXNID` | No unrelated invoice can be marked paid; validation fails safely |
| Complete payment then close browser before return | Scheduled reconciliation eventually validates and records the payment |
| Use a wrong amount/reference in a controlled NCHL test case | TMS does not mark invoice paid |
| Retry a temporary validation failure | Attempt remains safely pending/incomplete and later recovery succeeds or is visibly escalated |
| Review logs | No PFX, validation password, Basic-auth value, or full secret token appears in logs |

## 8. Release decision

| Gate | Current decision |
|---|---|
| Backend signing and validation logic | Pass, subject to live UAT confirmation |
| End-to-end staging UAT | Blocked by CIPS-02 deployment verification, CIPS-03, and CIPS-04 |
| Production enablement | Do not enable |

## 9. Recommended sequence

1. Configure the hosted scheduler to run the implemented reconciliation command every five minutes.
2. Connect the invoice payment UI to initiation, redirect, and verified status handling.
3. Provision the staging API host, TLS, DNS, and protected deployment secrets.
4. Register the exact static callback URLs with NCHL and obtain UAT credentials/test payer.
5. Execute the UAT matrix, retain redacted evidence, and perform a short production-readiness review.
