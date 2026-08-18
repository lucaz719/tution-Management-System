# Tenant Admin Panel — Frontend Development and API Integration Handoff

**Status:** Ready to share with the frontend developer  
**Prepared:** 2026-07-29  
**Scope:** `apps/web` Tenant Admin panel only  
**Backend base path:** `http://localhost:3001/api` in local development

## 1. Purpose

The frontend developer owns the Tenant Admin web experience: completing missing pages, connecting them to the existing backend APIs, handling UI state and validation, and proving each workflow end to end.

The backend and its security rules already exist for most Tenant Admin workflows. The frontend must not duplicate business authorization or invent API behavior. If an endpoint or response is missing, record it as a backend dependency instead of adding mock production behavior.

For the first clone, Docker startup, Super Admin seed, real Tenant Admin
provisioning, and test-role creation, follow
`documents/frontend-handoffs/DEVELOPER_LOCAL_SETUP_AND_ACCOUNT_PROVISIONING.md`
before starting this backlog.

## 2. Source of truth

Read these files before starting:

1. `.memory` — current runtime, security decisions, completed APIs, known gaps, and validation status.
2. `documents/auth-docs/AUTH_AND_AUTHORIZATION_HANDOFF.md` — authentication, session, tenant isolation, roles, and branch authority.
3. `documents/ui-ux/STYLESEED.md` — visual and interaction conventions.
4. `apps/web/src/components/patterns/DashboardShell.tsx` and `PageShell.tsx` — shared layout patterns.
5. `apps/web/src/components/ui/` — reusable UI components.
6. `apps/web/src/services/api.ts` — current browser API client.
7. `apps/web/src/router/index.tsx` and `components/patterns/dashboardNavigation.ts` — Tenant Admin routes and navigation.

Important: `.memory` and current code override older progress documents. In particular:

- Social-media management is included per PRD v2.0. Tenant Admin is responsible for approving and publishing posts created by Branch Admins.
- Messaging, appointments, broadcasts, student performance, and staff performance are now in scope per PRD v2.0 (previously returning HTTP 501).
- connectIPS is inbound payment collection only. Refunds and payroll payments happen outside TMS and are only reconciled in TMS.
- The API supports the development `SUPER_ADMIN`, but the current web role types and router do not register it. Use the API-based provisioning flow in the local-setup runbook until that separate frontend gap is fixed.

## 3. Ownership split

### Frontend developer owns

- Tenant Admin routes, pages, forms, tables, filters, drawers, dialogs, loading states, empty states, and responsive behavior.
- Splitting the large `apps/web/src/services/api.ts` client into typed domain clients when touching it.
- Request/response TypeScript types; avoid adding new `any`.
- Client-side validation for usability while preserving server-side validation as authoritative.
- Correct display of API errors, especially `400`, `401`, `403`, `404`, `409`, `429`, and `501`.
- Refreshing data after mutations and preventing accidental duplicate submissions.
- Route-level UX for `TENANT_ADMIN`; the API remains the actual security boundary.
- Frontend unit/component tests where practical and updates to `apps/web/tests/smoke.js` for critical routes.
- A short API-gap note whenever the required backend contract does not exist or is insufficient.

### Backend team owns

- Database models, migrations, API handlers, business rules, authorization, tenant/branch isolation, atomic workflow transitions, and audit records.
- New endpoints or response fields requested through an agreed API-gap note.
- Fixing incorrect API behavior and maintaining the Tenant Admin integration suite.
- Production delivery integrations, secrets, webhooks, cron/jobs, and file-storage infrastructure.

### Shared responsibility

- Agreeing request/response contracts before a backend change.
- End-to-end verification using a real Better Auth session and seeded tenant data.
- Confirming role visibility and workflow status labels.
- Deciding whether an API error needs a frontend message improvement or a backend contract change.

## 4. Non-negotiable integration rules

- Use the Better Auth session cookie. Every request must use `credentials: 'include'`.
- Never send or trust a client-selected tenant ID or tenant header. Tenant scope comes from the verified session.
- Do not use `localStorage` tenant data as authorization. Stored user/tenant values are display or routing hints only.
- Do not expose buttons merely because a user reached a route. Use capability responses and workflow status to control the UI.
- Treat `403` as insufficient authority and `404` as unavailable/not visible; do not reveal that a cross-tenant or cross-branch resource exists.
- Treat `409` as a stale or duplicate workflow transition: show the message and refresh the affected record.
- Do not silently fall back to mock data after an API failure.
- Disable submit buttons while a mutation is in flight.
- Confirm destructive or financially sensitive actions.
- Amounts shown in the UI are NPR unless the API contract explicitly says paisa.
- Preserve PAN/VAT and policy snapshot data returned for financial records; do not recalculate historical values in the browser.

## 5. What already exists in the web app

These routes are implemented and already call real APIs. They require review, polish, error-state coverage, and regression testing rather than a rewrite.

| Route | Existing page | Current state |
|---|---|---|
| `/tenant/dashboard` | `TenantAdminDashboard.tsx` | Real dashboard, P&L summary, billing period, and finance config calls |
| `/tenant/branches` | `TenantBranches.tsx` | Real branch list/create/update including geofence fields |
| `/tenant/people` | `PeopleDirectory.tsx` | Real directory, user creation, Branch Admin provisioning, bulk student import, profile/update/deactivate |
| `/tenant/students` | `AcademicRoster.tsx` | Real people and finance data; student-focused view |
| `/tenant/teachers` | `AcademicRoster.tsx` | Real people data; teacher-focused view |
| `/tenant/courses` | `AcademicCourses.tsx` | Real course CRUD and bulk creation |
| `/tenant/timetables` | `AcademicTimetables.tsx` | Real class CRUD, schedules, and teacher assignment |
| `/tenant/fees` | `AcademicFees.tsx` | Real overview, student invoices, manual payment, and invoice generation |
| `/tenant/grades` | `AcademicGrades.tsx` | Real grade CRUD, defaults, fee value, and grade detail |

The remaining Tenant Admin navigation entries fall through to `RoleWorkspacePlaceholder`. Those are the main work package.

## 6. Delivery backlog

### P0 — Stabilize the existing core

Complete this before adding many new screens.

- Move the hard-coded API URL to a validated build-time environment value while keeping the local default documented.
- Split `services/api.ts` by domain, for example `api/finance.ts`, `api/hr.ts`, `api/leaves.ts`, and `api/resources.ts`.
- Introduce a consistent API error type containing HTTP status, safe message, and optional field errors. The current wrapper throws only `Error(message)` and loses status information.
- Replace `any` for every Tenant Admin contract touched.
- Add a shared page-level loading, empty, error, retry, and access-denied pattern.
- Audit all existing mutation forms for double-submit protection and success/error feedback.
- Verify dashboard links do not lead to placeholders without a clear “not available” state.

Acceptance:

- `npm run lint --workspace web`
- `npm run build --workspace web`
- Existing Tenant Admin pages work after a fresh login and browser refresh.
- A `401` returns the user to authentication safely; a `403/404/409` does not crash the page.

### P1 — Admissions and people completion

Build the missing admission workflow into `/tenant/people` or a dedicated `/tenant/admissions` route.

| Workflow | API |
|---|---|
| Admission creation | `POST /api/users/admissions` |
| Issue student/parent credentials after payment | `POST /api/users/admissions/:studentId/issue-logins` |
| Capabilities and manageable branches | `GET /api/users/me` |
| Directory/profile/analytics | `GET /api/users`, `GET /api/users/:id/profile`, `GET /api/users/:id/analytics` |

Required UX:

- Admission form with student, parent/guardian, grade, branch, and billing inputs supported by the API contract.
- Clear state progression: admission created → invoice unpaid/account inactive → payment recorded → credentials may be issued.
- Credentials action must remain unavailable before the admission invoice is paid.
- Display temporary credentials once after successful issuance with a secure copy/acknowledgement interaction.
- Do not store temporary passwords in browser storage or logs.

### P1 — Fee, billing, refund, and payment completion

Extend `/tenant/fees` and add focused detail/dialog flows.

| Workflow | API |
|---|---|
| Overview and billing cycle | `GET /api/finances/overview`, `GET /api/finances/billing-period` |
| Student balances and invoices | `GET /api/finances/students`, `GET /api/finances/students/:studentId/invoices` |
| Generate invoices | `POST /api/finances/generate-invoices` |
| Manual payment record | `POST /api/finances/invoices/:id/pay` |
| connectIPS payment | `POST /api/finances/connectips/initiate/:invoiceId`, `GET /api/finances/connectips/status/:txnId` |
| NepalPay QR | `GET /api/finances/nepalpay-qr/:invoiceId` |
| Refund request/approval/manual settlement | `POST /api/courses/refund/request`, `POST /api/courses/refund/approve/:id`, `POST /api/courses/refund/settle/:id` |
| Tenant policy/config | `GET /api/finances/config`, `PUT /api/finances/config` |

Required UX:

- Invoice detail showing billed, paid, due, status, due date, overdue state, and payment reference.
- Manual payment confirmation must require an external transaction/reference value when the API requires it.
- connectIPS redirect/initiation and return/status polling UI; do not mark an invoice paid based only on a browser redirect.
- Refund approval confirmation and separate manual settlement form requiring the external refund reference.
- Clearly state that TMS does not transfer refund money.
- Refresh invoice/refund data after any `409` because another actor may have completed the transition.

Backend dependency to confirm before coding: list/read endpoints for refund queues are not apparent in the current mounted contract. Submit an API-gap note if the UI cannot retrieve pending refunds.

### P1 — Tenant settings

Implement `/tenant/settings` using the existing tenant finance-policy contract first.

| Setting | API |
|---|---|
| VAT rate, grace period, petty-cash cap, tenant policies | `GET /api/finances/config`, `PUT /api/finances/config` |
| Per-branch geofence radius and grace period | `GET /api/branches`, `PUT /api/branches/:id` |

Required UX:

- Group institution-wide policy separately from branch-specific settings.
- Validate numeric limits and show units.
- Warn that policy changes affect future operations while historical snapshots remain unchanged.
- Do not invent editable settings that the backend does not expose.

### P2 — Petty cash

Implement `/tenant/petty-cash`.

| Workflow | API |
|---|---|
| List requests | `GET /api/finances/petty-cash` |
| Level 2 approval/release | `POST /api/finances/petty-cash/approve-l2/:id` |
| Receipt submission | `POST /api/finances/petty-cash/upload-receipt/:id` |
| Verify/close | `POST /api/finances/petty-cash/close/:id` |

Required UX:

- Status-based queue and filters by branch/date/status.
- Tenant Admin sees Level 2 actions only when the record is eligible.
- Receipt and closure details must remain visible in history.
- Treat money release as recorded/manual; do not claim TMS sent funds.

Backend limitations from `.memory`: reject/send-back and complete monthly-cap behavior may still require backend work. Do not fake these actions.

### P2 — Payroll and HR

Implement `/tenant/payroll` and `/tenant/hr-management`.

| Workflow | API |
|---|---|
| Staff document create and expiry alerts | `POST /api/hr/documents`, `GET /api/hr/documents/alerts` |
| Exit initiation and final settlement | `POST /api/hr/exit/initiate`, `POST /api/hr/exit/settle/:exitId` |
| Payroll calculate/list/approve | `POST /api/hr/payroll/calculate`, `GET /api/hr/payroll`, `POST /api/hr/payroll/approve/:id` |
| Manual payroll reconciliation | `POST /api/hr/payroll/reconcile/:id` |

Required UX:

- Payroll period selector, calculation result, approval confirmation, status history, and external payment reference reconciliation.
- Explicit notice that salaries are paid outside TMS.
- Document-expiry alert list with days remaining and staff link.
- Tenant Admin final exit settlement view; Branch Admin clearance is a different role step.

Backend dependency: list/detail endpoints for exit cases and staff documents may be insufficient for full screens. Verify the live response contracts and create an API-gap note rather than deriving records from unrelated endpoints.

### P2 — P&L and ledger reporting

Implement `/tenant/pl-reports`.

| Workflow | API |
|---|---|
| Consolidated P&L | `GET /api/finances/pl` |
| Expenses | `GET /api/finances/expenses` |
| Ledger export | `GET /api/finances/ledger/export` |
| Forecast/suggestions | `GET /api/finances/forecast`, `GET /api/finances/suggestions` |

Required UX:

- Period and branch filters only if supported by the API.
- Revenue, operating cost, net margin, and expense breakdown.
- CSV export download with authenticated cookie handling.
- Proper empty state when a period has no data.

Do not label forecasting as AI unless the backend contract and product wording explicitly confirm that behavior.

### P2 — Leave approvals

Implement `/tenant/leave-management`.

| Workflow | API |
|---|---|
| Approval action | `POST /api/leaves/approve/:leaveId` |

Required UX:

- Tenant Admin Level 2 queue for eligible long-sick leave.
- Mandatory remarks/reason where required.
- Status and prior approval step visibility.

Backend dependency: the current route surface does not show a leave list endpoint. A queue screen needs a tenant-scoped list/detail contract; file an API-gap note.

### P2 — Resources, certificates, and calendar

Implement these as separate focused pages.

| Route | Workflow | API |
|---|---|---|
| `/tenant/resource-logs` | Maintenance task oversight | `GET /api/resources/tasks` |
| `/tenant/certificates` (add navigation if approved) | Master certificate template | `POST /api/certificates/templates` |
| `/tenant/academic-calendar` (add navigation if approved) | Tenant-wide events and payment calendar | `POST/GET /api/academic-events`, `GET /api/academic-events/payments` |
| `/tenant/social-media` | Social media post approval and publishing | `GET /api/social-media/posts`, `POST /api/social-media/posts/:id/approve` |

Required UX:

- Resource task filters, escalation highlighting, assignee/branch/status context.
- Template form based only on fields supported by the certificate endpoint.
- Tenant-wide event form with a clear institution-wide badge.
- Branch users must experience tenant-wide events as read-only; API authorization is authoritative.
- Social media approval queue for posts submitted by Branch Admins, and platform API credentials management.

Backend limitations:

- Calendar update/delete and immutability rules are still listed as remaining backend work.
- Certificate template list/edit endpoints may be required for a usable management screen.

### P3 — RBAC and integrations

Keep `/tenant/rbac-roles` and `/tenant/integrations` unavailable until explicit backend contracts are agreed.

- Current roles are fixed business roles; do not build a UI that implies arbitrary permission editing.
- An integrations page may document connectIPS/NepalPay status, but it must never expose credentials, certificates, secrets, or private keys.
- Implement social media integrations for API credentials (Facebook, Instagram, TikTok, LinkedIn) as per PRD v2.0.

## 7. Blocked or intentionally unavailable

The developer may design disabled/coming-later states, but must not claim these are integrated:

| Area | Current backend state |
|---|---|
| `/tenant/messages` | Persistent chat/broadcast endpoints to be implemented (PRD v2.0) |
| `/tenant/appointments` | Persistent appointment endpoints to be implemented (PRD v2.0) |
| Student/staff performance management | Performance endpoints to be implemented (PRD v2.0) |
| Automated refund transfer | Out of scope; manual external refund plus TMS reconciliation |
| Automated salary transfer | Out of scope; external salary payment plus TMS reconciliation |

Remove or clearly disable navigation entries that otherwise fall through to the generic placeholder.

## 8. Recommended frontend structure

Use feature folders instead of adding more domains to one file:

```text
apps/web/src/
  features/tenant-admin/
    admissions/
    finance/
    hr/
    leaves/
    resources/
    calendar/
    certificates/
    settings/
  services/
    api/
      client.ts
      people.ts
      finance.ts
      hr.ts
      leaves.ts
      resources.ts
      academicEvents.ts
      certificates.ts
```

Each feature should contain its page components, local types, validation, and tests. Shared design primitives remain in `components/ui`; shared page/layout patterns remain in `components/patterns`.

## 9. API-gap note format

When blocked by the backend, add a small Markdown issue using this structure:

```md
### Screen/workflow
Tenant Admin pending refund queue

### Required operation
List tenant refund requests, filterable by status and branch.

### Proposed contract
GET /api/courses/refunds?status=PENDING&branchId=...

### Required response fields
id, student, course, branch, amount, reason, status, requestedAt,
requester, approval history, policy snapshot, settlement reference

### Authorization
TENANT_ADMIN, current tenant only

### UI blocked
Queue, detail drawer, approval action, post-action refresh
```

Do not implement a speculative client method until the backend team accepts the contract.

## 10. Definition of done for every screen

- Real API integration; no silent mock fallback.
- Works after refresh with a valid session cookie.
- Loading, empty, error, retry, success, and disabled/in-flight states.
- Responsive at common desktop and tablet widths.
- Keyboard-accessible controls and visible focus.
- Form labels, validation messages, and confirmation for sensitive actions.
- Typed request and response contracts without new `any`.
- Tenant Admin can use the intended action; other roles do not see misleading actions.
- `400/401/403/404/409/429/501` behavior is handled intentionally.
- Mutation results are refreshed from the server.
- No credentials, temporary passwords, tenant IDs, or sensitive payloads are written to logs.
- Lint and production build pass.
- Critical happy path and at least one failure path are tested.

## 11. Suggested delivery sequence

1. P0 API client and error-handling foundation.
2. Admissions and existing people-page completion.
3. Fees, payments, connectIPS, refunds, and settings.
4. Petty cash, payroll, P&L, and ledger export.
5. HR exits/documents and leave approvals after list contracts are available.
6. Resources, certificates, and academic calendar.
7. RBAC/integrations only after backend contracts and product decisions.

Keep each pull request focused on one domain or one complete workflow. Include screenshots, routes changed, APIs used, test evidence, and any backend gaps in the pull-request description.

## 12. Local run and verification

Start the full stack from the repository root:

```powershell
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps -a
```

Expected local services:

- Web: `http://localhost:5173`
- API health: `http://localhost:3001/api/health`
- PostgreSQL: `localhost:5432`

Frontend checks:

```powershell
npm run lint --workspace web
npm run build --workspace web
```

Backend regression check for Tenant Admin integration:

```powershell
npm run test:tenant-admin:integration --workspace @tms/api
```

Never run `docker compose down -v` unless intentionally deleting the local database volume.
