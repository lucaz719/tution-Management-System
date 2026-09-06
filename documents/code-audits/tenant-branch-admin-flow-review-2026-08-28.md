# Tenant Admin and Branch Admin Flow Review

Date: 2026-08-28  
Scope: web and API flows for Tenant Admin and Branch Admin, with emphasis on tenant isolation, branch isolation, role boundaries, finance authority, and navigation/API alignment.  
Method: read-only static trace plus focused build and authorization-unit verification. Historical audits were treated as context only; `.memory`, `README.md`, and the active auth handoff were used as current specifications.

## Executive summary

The core tenant boundary is generally well designed: identity and `tenantId` come from the Better Auth session, central helpers distinguish tenant-wide from assigned-branch scope, and most high-risk mutations re-check tenant and branch ownership in Prisma queries. Cross-tenant IDOR protection is consistently visible in the reviewed paths.

The release should nevertheless be held for authorization cleanup. Two confirmed endpoints expose tenant-wide information to roles that should not receive it, Branch Admin user-management does not protect peer managers from update/deactivation, and the product has a material unresolved contradiction about whether Branch Admin may view and create payroll records. The frontend role guards are useful UX controls but cannot compensate for these API issues.

## Intended authority and request flow

```text
Better Auth session cookie
  -> authMiddleware resolves user + tenant from the database session
  -> route derives Tenant Admin or assigned Branch Admin scope
  -> permission/role check
  -> tenant + branch constrained Prisma query
  -> role-specific web workspace
```

- Tenant Admin: institution-wide administration and final financial authority.
- Branch Admin: assigned-branch operations and first-level approvals.
- Other users: personal, linked, or explicitly assigned records only.
- Client-provided `tenantId`, headers, and arbitrary branch IDs are not trusted as identity authority.

## Confirmed findings

### HIGH — TBA-01: Any authenticated user can read the complete branch directory and geofence coordinates

**Status:** Remediated in the working tree on 2026-08-28. `GET /api/branches` now returns all tenant branches only to Tenant Admin, assigned branches only to Branch Admin, and `403` to other roles. Regression assertions cover Branch Admin, Accountant, Student, and Parent access.

**Confidence:** 9/10  
**Category:** OWASP A01 Broken Access Control / STRIDE Information Disclosure  
**Location:** `services/api/src/routes/branches.ts:12-30`

`GET /api/branches` requires authentication but applies only `tenantId`. It does not require Tenant Admin, Branch Admin, a branch permission, or filter to assigned branches. The response includes every branch's address, latitude, longitude, attendance radius, grace period, staff count, and course count.

**Exploit scenario:** A Student, Parent, Janitor, or other authenticated user calls `GET /api/branches` directly. The API returns institution-wide branch and geofence metadata even though the role model limits these users to own/linked/assigned records. A Branch Admin can likewise enumerate unassigned branches.

**Remediation:** Split the contract by purpose. Keep a Tenant-Admin-only management endpoint; return only assigned branches to Branch Admin; create a minimal self-service branch projection for roles that genuinely need branch name/address. Do not include geofence coordinates/radius unless the caller needs them for an authorized attendance workflow.

**Priority:** P1

### MEDIUM — TBA-02: Tenant-wide finance overview is available to every authenticated role

**Status:** Remediated in the working tree on 2026-08-28. `GET /api/finances/overview` now requires Tenant Admin authority. Branch Admin and branch finance roles continue to use their branch-scoped billing/accountant contracts. Regression assertions cover Branch Admin, Accountant, Student, and Parent denial.

**Confidence:** 9/10  
**Category:** OWASP A01 Broken Access Control / STRIDE Information Disclosure  
**Location:** `services/api/src/routes/finances.ts:582-604`

`GET /api/finances/overview` uses `authMiddleware` but no finance permission or role check, then aggregates every invoice in the tenant. This exposes collected revenue, outstanding balances, overdue amounts/counts, and invoice volume institution-wide.

**Exploit scenario:** Any authenticated Student, Parent, Teacher, Janitor, or Receptionist requests `/api/finances/overview` and learns institution-wide financial performance. The data is aggregated rather than record-level, which limits impact but does not make the access authorized.

**Remediation:** Require `view_reports` for tenant-wide results. If Branch Admin needs an overview, introduce branch-scoped aggregation derived from signed role assignments. Add negative integration cases for every non-finance role.

**Priority:** P1

### HIGH — TBA-03: Branch Admin can update or deactivate a peer Branch Admin in the same branch

**Confidence:** 8/10  
**Category:** OWASP A01 Broken Access Control / STRIDE Elevation of Privilege, Denial of Service  
**Location:** `services/api/src/routes/users.ts:1575-1589`, `1593-1645`, `1649-1677`

The shared `loadManageableUser()` helper authorizes a Branch Admin whenever the target holds any role in one of the caller's branches. It does not reject targets with `Branch Admin` or higher-privilege roles. The update route permits status changes and the delete route deactivates the account and revokes all sessions.

**Exploit scenario:** Two Branch Admins are assigned to the same branch. One calls `PUT /api/users/{peerId}` with `status: "SUSPENDED"` or `DELETE /api/users/{peerId}`. The peer is in branch scope, so the operation succeeds and their sessions are removed. If a Tenant Admin ever also carries a branch-scoped role, the same helper could expose that account to this path.

**Remediation:** Add a target-role hierarchy check. Branch Admin should manage only `BRANCH_ADMIN_CREATABLE_ROLES`, never Tenant Admin, Super Admin, or another Branch Admin. Tenant Admin should retain manager lifecycle authority. Enforce this in one central helper and test same-branch peer-manager denial.

**Priority:** P1

## Governance blocker / specification drift

### TBA-04: Branch Admin payroll authority contradicts the active authorization matrix

**Confidence:** 10/10 that the contradiction exists; authorization verdict requires product-owner decision.  
**Locations:**

- `services/api/src/routes/finances.ts:253-262` adds every Branch Admin assignment to billing scope without requiring `manage_billing`.
- `services/api/src/routes/finances.ts:282-376` returns student billing plus staff salary and payroll history.
- `services/api/src/routes/finances.ts:378-446` lets Branch Admin create invoices and payroll records for branch-scoped people.
- `services/api/src/routes/branch-admin.ts:102-127` returns teacher salary structure and recent payrolls.
- `apps/web/src/pages/BranchAdminWorkspace.tsx:481` labels the surface “Branch billing & payroll.”
- `documents/auth-docs/AUTH_AND_AUTHORIZATION_HANDOFF.md`, section 6.4, states Branch Admin may not calculate, view, approve, or reconcile payroll.

`.memory` says the shared billing workspace intentionally serves Branch Admin, so the implementation appears deliberate; the active auth handoff says the opposite. This must be resolved before treating tests as authoritative.

**Required decision:** Choose and document one model:

1. Tenant-Admin-only payroll: remove the Branch Admin shortcut and payroll UI/data, while leaving only explicitly approved branch fee/collection functions; or
2. Delegated payroll preparation: define exactly which fields Branch Admin can see/create, prohibit approvals/releases/reconciliation, add audit events, and update the role matrix and threat model.

Until decided, payroll access is a release blocker because tests can only preserve whichever accidental policy is currently encoded.

## Flow assessment

### Tenant Admin

- Role routing is explicit: `/tenant/*` is wrapped by a Tenant Admin guard.
- API tenant scope comes from the verified session and most reviewed queries include `tenantId`.
- Branch creation/update is Tenant-Admin-capable through `manage_branches`, with ownership checked before update.
- Final petty-cash release and final staff-exit settlement use explicit Tenant Admin checks and state-transition guards.
- Current documented product gaps remain: refund discovery, L2 long-sick-leave queue, staff-exit settlement discovery, certificate-template retrieval, calendar update/delete, and social approval workflows.

### Branch Admin

- `/branch/*` is wrapped by a Branch Admin frontend guard.
- The dedicated dashboard and teacher-workflow endpoints first derive assigned branch IDs and reject unassigned requested branches.
- Course, attendance, HR, resources, and petty-cash paths reviewed generally combine branch authorization with tenant-constrained resource lookup.
- The branch workspace often asks users to select or manually enter `branchId`. This is safe only because APIs re-check scope, but it creates avoidable friction and ID-copy errors. Use the session-derived assigned-branch list and hide the selector for single-branch managers.
- Branch Admin navigation and backend policy are not generated from one shared capability source, increasing drift risk.

## Test coverage assessment

Working checks:

- `npm run test:access --workspace @tms/api` — passed.
- `npm run build --workspace @tms/api` — passed.
- `npm run build --workspace web` — passed with only Webpack bundle-size warnings (main bundle about 408 KiB).

Coverage gaps:

- The access-control unit test covers assigned/unassigned branch access and petty-cash L1/L2 separation, but not HTTP route exposure.
- The integration suite covers many cross-tenant IDOR cases but does not assert that low-privilege roles are denied `/api/branches` or `/api/finances/overview`.
- No test denies Branch Admin update/deactivation of a peer manager.
- No executable policy test settles the Branch Admin payroll contradiction.
- Frontend `RequireRole` tests are not a substitute for API authorization tests.

## Prioritized remediation roadmap

### P0 — policy decision (same day)

- Decide and document Branch Admin payroll authority; align `.memory`, README authority language, auth handoff, roles, API, UI, and tests.

### P1 — fix this sprint (about 1-2 days)

- Scope `/api/branches` by role and minimize its response fields.
- Guard `/api/finances/overview` with tenant-wide or branch-scoped finance permission.
- Add target-role hierarchy protection to user update/deactivation.
- Add negative integration tests for Student, Parent, Teacher, staff, Branch Admin cross-branch, peer-manager, and payroll cases.

### P2 — hardening (about 2-4 days)

- Replace manually entered Branch IDs with assigned-branch selectors sourced from a minimal authorized endpoint.
- Centralize endpoint capability metadata so frontend navigation and backend guards are reviewed against the same matrix.
- Add audit events for manager lifecycle changes and all payroll preparation actions.
- Inventory every authenticated-only reporting/config endpoint and explicitly classify it as self, branch, or tenant scope.

## Confidence calibration

- Confirmed security findings: 3
- HIGH: 2 (average confidence 8.5/10)
- MEDIUM: 1 (confidence 9/10)
- Governance blockers: 1
- False positives filtered: historical JWT findings, development-only Super Admin surface, example credentials, and intentional Branch Admin payroll code pending policy resolution.
- Mode: focused daily review, 8/10 reporting gate for security findings.
