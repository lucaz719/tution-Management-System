# Accountant Panel Route and Fee Audit

Date: 2026-09-05  
Scope: Web accountant workspace at `/staff/finance`, its finance API contracts, fee/invoice creation, payroll, petty cash, reports, and visible desktop UX.  
Method: Static route/UI/API trace, screenshot review, TypeScript check, lint, and focused API tests. No production data was changed.

## Executive summary

The accountant workspace has a solid persisted-data foundation and sensible branch-scoped API checks, but it is not ready to be treated as a reliable finance workflow. The highest-risk issue is a mismatch between the invoice period shown in the UI and the Bikram Sambat period actually persisted by the API. The route is also missing an accountant role guard, the billing search field is visibly broken because its CSS selector does not match its container, and the workspace does not expose a complete payment/reconciliation flow from the billing ledger.

Overall product-quality score: **5.4/10 — needs work**.

## Route map

| User action | Frontend route/state | API | Result |
|---|---|---|---|
| Open accountant panel | `/staff/finance#overview` | `GET /api/finances/accountant-workspace` | Works for a user with at least one finance/report branch permission |
| Open petty cash | `/staff/finance#petty-cash` | Same workspace API | Works; hash is local tab state, not an independent route |
| Create/revise petty cash | Modal on same route | `POST /petty-cash/request`, `PUT /petty-cash/:id` | Implemented with server-side scope and cap checks |
| Submit receipt | Modal on same route | `POST /petty-cash/upload-receipt/:id` | Implemented, but accepts only an externally hosted URL |
| Open billing | `/staff/finance#billing` | `GET /billing-ledger` | Loads students and all staff records |
| Create invoice | Inline card on billing tab | `POST /billing-ledger/invoices` | Persists, but selected date semantics are misleading/broken |
| Create payroll | Inline card on billing tab | `POST /billing-ledger/payrolls` | Persists; UI calls every staff record a “teacher” |
| Reports | `/staff/finance#reports` | Values embedded in accountant workspace response | Read-only summary only; no drill-down/export |
| Security | `/staff/finance#security` | Auth password endpoint | Implemented |

## Findings by priority

### P0 — Invoice period contract can create the wrong fee cycle

The invoice form presents Gregorian month/year controls and submits `billingCycleStart`, `billingCycleEnd`, and `dueDate` derived from those Gregorian values (`SharedBillingWorkspace.tsx`, lines 99–119 and 550–563). The API validates all three submitted dates, but then discards the submitted cycle end and due date and recalculates all three fields with `getBillingPeriod(cycleStart, 10)` (`finances.ts`, lines 507–546).

Impact:

- The accountant is not shown the exact BS cycle and due date that will be saved.
- `billingCycleEnd` and `dueDate` are accepted as part of the API contract but silently ignored.
- A duplicate-cycle response can appear surprising because the UI selection and persisted unique period are not expressed in the same calendar model.
- Financial records can be assigned to a period different from the operator's expectation.

Recommendation: make one layer authoritative and explicit. Prefer a BS billing-period selector backed by a server-provided list of valid periods, submit a period ID/start only, preview the resolved start/end/due date before confirmation, and return that same period in validation errors.

### P0 — Accountant page has no frontend role guard

`/staff/finance` is registered directly inside the authenticated application shell (`router/index.tsx`, line 332). Receptionist and janitor pages immediately below it use `RequireRole`; the finance page does not.

Impact:

- Any authenticated role can navigate to the accountant URL.
- API scope checks prevent straightforward unauthorized finance reads, but users see a finance shell followed by permission errors.
- This is defense-in-depth drift and makes route behavior inconsistent with every other role portal.

Recommendation: wrap the route in `RequireRole allowedRoles={['ACCOUNTANT']}`. If tenant or branch admins intentionally share this exact page, list those roles explicitly; otherwise keep their existing finance routes separate. Add route tests for accountant allowed and student/parent/teacher/receptionist/janitor denied.

### P1 — Billing search field is visibly unstyled and overlaps

The component renders its search inside `.accountant-controls` (`SharedBillingWorkspace.tsx`, lines 180–214), but input sizing, border, padding, and left-icon clearance only target `.accountant-toolbar input` (`staffFinance.css`, lines 121–128). The screenshot confirms the browser-native input and icon/text collision.

Recommendation: style `.accountant-search-control input` directly (width, minimum height, border, radius, background, and left padding), so it does not depend on which toolbar container owns it.

### P1 — Billing ledger does not complete the collection workflow

The billing table can create and inspect invoices, but it has no action to record an authorized cash/bank collection, initiate a payment, open a receipt, or navigate to reconciliation. A separate `payInvoice` API client and `/invoices/:id/pay` endpoint exist, and `StaffFinancePage` still contains a payment dialog, but no rendered billing-ledger action opens that dialog.

Impact: the core accountant journey stops at “invoice created.” Staff must use another portal or an undiscoverable workflow to collect and reconcile it.

Recommendation: add invoice actions based on status: view invoice, record cash/bank payment, download/print receipt, and view transaction/audit history. Avoid exposing the immediate “mark paid” endpoint without a confirmation and evidence policy.

### P1 — Manual invoice creation loses the true fee breakdown

Generated monthly invoices assemble grade/activity/subject line items. Manual billing creates only one generic snapshot line using the invoice type label, even when the displayed monthly projection was composed from multiple fees (`finances.ts`, invoice creation block at lines 507–546).

Impact: the invoice amount may be correct while the receipt/audit trail does not explain what the student was charged for.

Recommendation: populate line items from the student's current fee composition, show them before posting, allow authorized adjustments, and snapshot those exact lines.

### P1 — Report totals are operationally ambiguous

“Operating costs” adds all expense records, manually paid payroll, and every released/receipt-submitted/closed petty-cash request. Petty cash is not converted into an expense at closure, so it is unclear whether an expense entered separately for the same purchase will double-count. The UI offers no period selector and does not label totals as lifetime versus monthly; invoice and expense queries are also capped at 500 records and petty cash at 200 before aggregation (`finances.ts`, accountant workspace around lines 601–730).

Impact: totals can become incomplete for larger tenants, and users cannot tell the reporting period or double-counting policy.

Recommendation: aggregate in the database without list limits, require a date range, define whether closed petty cash becomes an expense or remains a separate cost source, and add drill-down reconciliation.

### P2 — “Teachers” tab is actually all staff payroll

The API queries every `staffRecord`; the UI labels them all as teachers and uses `teacherId`, `teacherName`, and “Create payroll.” Accountants, receptionists, and janitors can therefore appear under “Teachers.”

Recommendation: rename the tab and model to “Staff,” or filter the API to the Teacher role if payroll is intentionally teacher-only.

### P2 — Receipt evidence is not a production-grade upload flow

Petty cash receipt submission accepts any syntactically valid HTTP(S) URL. The UI itself states direct upload awaits a production object-storage contract. Links can expire, be replaced, or point to content outside institutional control.

Recommendation: upload to controlled storage, record immutable object metadata/checksum, restrict content type/size, and preserve reviewer/audit events.

### P2 — Hash tabs are not independent routes

Overview, petty cash, billing, reports, and security share one React route and switch on `location.hash`. This works for basic deep links, but there are no route-level loaders/errors, permissions, analytics boundaries, or per-section automated route tests.

Recommendation: hash tabs are acceptable short-term. If sections continue growing, promote them to nested routes such as `/staff/finance/billing` and `/staff/finance/petty-cash`.

### P2 — Validation feedback is incomplete in the invoice/payroll form

The form silently returns when required values are absent, relies on `Number(...)` conversion, and surfaces server errors in a page-level alert. It does not preview net payable, resolved billing period, duplicate-cycle risk, or invalid discount/fine combinations beside the fields.

Recommendation: add field-level validation and an invoice confirmation summary with base, discount, fine, net payable, cycle, due date, and line items.

## Product scorecard

| Dimension | Score | Evidence |
|---|---:|---|
| Onboarding / role entry | 6/10 | Clear finance hero and navigation, but unauthorized roles can enter the route and there is no workflow guidance |
| Core experience | 4/10 | Petty cash is coherent; invoice period semantics and incomplete collection workflow undermine fees |
| Error handling | 5/10 | API errors and retry state exist; form-level prevention/recovery is weak |
| Information architecture | 6/10 | Sections are understandable, but billing and payroll are mixed and hash-only |
| Visual design & polish | 6/10 | Strong shell, cards, hierarchy, and tables; broken search control is conspicuous |
| Performance | 6/10 | Queries are parallel, but large full ledgers and client filtering do not scale; capped lists corrupt aggregates |
| Accessibility | 6/10 | Labels, modal roles, focus restoration, focus trap, and status roles are present; responsive/search behavior needs verification |
| Feature completeness | 4/10 | Creation exists, but collection, receipts, reconciliation, exports, period filters, and robust evidence are incomplete |
| **Overall** | **5.4/10** | **Useful foundation, material finance-workflow risks** |

## Strengths worth preserving

1. API-level tenant and branch scoping is applied to the main accountant and billing-ledger reads and writes.
2. Petty cash has a clear two-level approval state machine, revision path, monthly cap enforcement, and optimistic-concurrency checks.
3. The UI includes real loading/error/empty states, accessible modal semantics, keyboard focus containment/restoration, status labels, and persisted rather than sample data.

## Recommended delivery plan

### Quick wins — under one day

- Guard `/staff/finance` by explicit role and add negative route tests.
- Correct the search input selector and verify desktop/mobile focus and typing.
- Rename Teachers to Staff (or filter the API) so terminology matches data.
- Label report period/scope and disclose when totals are limited.

### Medium effort — one to three days

- Replace Gregorian month/year invoice selection with a server-resolved BS period preview.
- Add field-level invoice validation and net-payable/line-item confirmation.
- Wire invoice view, record-payment, receipt, and transaction-history actions into the billing ledger.
- Add focused integration tests for billing-ledger read/create scope, duplicate periods, date resolution, and unauthorized roles.

### Major investment — one week or more

- Build a reconciled finance ledger with server-side date-range aggregation, pagination, drill-downs, and exports.
- Implement controlled receipt/document storage and immutable audit metadata.
- Separate invoice generation, collection, settlement, and reconciliation into explicit states and permissions.

## Verification performed

- `npx.cmd tsc -p tsconfig.app.json --noEmit --incremental false` — passed.
- `npm.cmd run lint` in `apps/web` — passed with 20 existing warnings; none were reported in the accountant files.
- `npm.cmd run test:billing` in `services/api` — passed.
- `npm.cmd run test:route-auth` in `services/api` — passed; this checks authentication middleware presence, not frontend role authorization or endpoint business permissions.
- Full web production build could not complete in the restricted environment because TypeScript attempted to write `apps/web/node_modules/.tmp/tsconfig.app.tsbuildinfo` and received `EPERM`. The no-emit typecheck passed.

## Suggested acceptance criteria for the repair

1. Only intended roles can render `/staff/finance`; all others redirect to their own home or an explicit forbidden page.
2. The period preview shown before invoice creation exactly matches persisted cycle start, cycle end, and due date.
3. Creating an existing invoice type for the same resolved period produces a clear, field-associated conflict message.
4. The search input is fully styled, its icon never overlaps text, and filtering works by keyboard on desktop and mobile widths.
5. An accountant can go from student search to invoice creation, payment recording, receipt retrieval, and reconciled report drill-down without leaving the finance workspace.
6. Report totals remain correct beyond 500 invoices/expenses and 200 petty-cash records.
