# Tenant Admin, Branch Manager, and Janitor Mobile Roles Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add secure, scoped mobile portals for Tenant Admin, Branch Manager, and Janitor, with role-aware authentication redirects, navigation, permissions, and verified API-backed workflows.

**Architecture:** Keep the API’s canonical roles as `TENANT_ADMIN`, `BRANCH_ADMIN`, and `JANITOR`; expose **Branch Manager** only as the product-facing label for `BRANCH_ADMIN`. Add one mobile feature directory per portal, preserve the existing GoRouter role-prefix guard, and enforce authorization at the API layer rather than trusting hidden mobile UI controls. Reuse the existing adaptive layout primitives, `AppShell`, authentication provider, and feature-flag pattern.

**Tech Stack:** Flutter/Dart, Riverpod, GoRouter, Dio, SharedPreferences, TypeScript/Express API, Prisma, existing web role/permission catalogue.

---

## Current Context and Confirmed Constraints

- API canonical roles already exist in `services/api/src/utils/roles.ts`:
  - `Tenant Admin` — tenant-wide branch, people, course, billing, report, and L2 approval permissions.
  - `Branch Admin` — branch-scoped people, attendance, courses, L1 approval, calendar, resource-task, and communication permissions.
  - `Janitor` — `view_tasks` and `update_task_status`.
- The web app already maps the API roles to `TENANT_ADMIN`, `BRANCH_ADMIN`, and `JANITOR` in `apps/web/src/features/auth/types.ts`, `apps/web/src/features/auth/service.ts`, and `apps/web/src/components/patterns/dashboardNavigation.ts`.
- The mobile app currently only routes `TEACHER`, `STUDENT`, and `PARENT` in:
  - `apps/mobile/lib/core/providers/auth_provider.dart`
  - `apps/mobile/lib/core/router/app_router.dart`
- `AuthUser.fromJson` in `apps/mobile/lib/features/auth/data/auth_service.dart` currently passes role names through without normalization. This is unsafe because the API’s canonical catalogue uses human-readable names such as `Tenant Admin` and `Branch Admin`, while mobile route guards compare uppercase role codes.
- Existing API routes include tenant, branch, user, resource, finance, attendance, communication, HR, and academic modules. The plan must first verify exact endpoint contracts before adding mobile repositories.

## Role Boundaries

| Product label | Canonical API role | Mobile route prefix | Initial mobile scope | Explicit exclusions |
|---|---|---|---|---|
| Tenant Admin | `TENANT_ADMIN` | `/tenant/` | tenant dashboard, branch overview, people directory, cross-branch reports, approvals | direct manipulation of another tenant; platform/super-admin operations |
| Branch Manager | `BRANCH_ADMIN` | `/branch/` | branch dashboard, people, branch attendance, approvals, resources, announcements | cross-branch data; tenant setup; L2/tenant approvals |
| Janitor | `JANITOR` | `/janitor/` | assigned maintenance tasks, task detail, status/notes/evidence updates | staff/student records, finance, global task dispatch, cross-branch access |

> **Naming decision:** Keep `BRANCH_ADMIN` in API payloads, database roles, permissions, and route authorization. Use “Branch Manager” only in visible titles, navigation labels, and documentation. Do **not** create a separate `BRANCH_MANAGER` database role unless product policy explicitly requires it.

---

## Task 1: Freeze the role and permission contract

**Objective:** Prevent role-name drift and define the minimum API contracts before any mobile UI is written.

**Files:**
- Read: `services/api/src/utils/roles.ts`
- Read: `services/api/src/routes/users.ts`
- Read: `services/api/src/routes/branch-admin.ts`
- Read: `services/api/src/routes/resources.ts`
- Read: `services/api/src/routes/finances.ts`
- Read: `services/api/src/routes/communication.ts`
- Read: `services/api/src/middleware/auth.ts`
- Read: `services/api/src/middleware/tenant.ts`
- Create: `docs/api/mobile-role-portals.md`
- Create: `apps/mobile/test/auth_role_normalization_test.dart`

**Step 1: Document canonical codes and visible labels**

Create a role matrix in `docs/api/mobile-role-portals.md`:

```md
| API role name | Mobile code | UI label | Default route |
|---|---|---|---|
| Tenant Admin | TENANT_ADMIN | Tenant Admin | /tenant/home |
| Branch Admin | BRANCH_ADMIN | Branch Manager | /branch/home |
| Janitor | JANITOR | Janitor | /janitor/home |
```

**Step 2: Verify API endpoints and authorization middleware**

For each initial portal action, document method, path, required permission, tenant/branch scope, pagination shape, and error shape. Do not invent endpoints; add a minimal API endpoint only if no authorized endpoint exists.

**Step 3: Add role-normalization tests first**

Test `Tenant Admin`, `TENANT_ADMIN`, `Branch Admin`, `BRANCH_ADMIN`, `Janitor`, and `JANITOR` inputs. Invalid roles must normalize to `null` rather than defaulting to a privileged portal.

**Step 4: Run test red phase**

Run:

```bash
cd apps/mobile && flutter test test/auth_role_normalization_test.dart
```

Expected: failing until the normalizer exists.

**Step 5: Commit**

```bash
git add docs/api/mobile-role-portals.md apps/mobile/test/auth_role_normalization_test.dart
git commit -m "test(auth): define mobile role normalization contract"
```

---

## Task 2: Add a single mobile role normalizer and safe redirect mapping

**Objective:** Ensure any API role presentation maps deterministically to an allowed mobile role and never falls back to Teacher.

**Files:**
- Create: `apps/mobile/lib/core/auth/role_codes.dart`
- Modify: `apps/mobile/lib/features/auth/data/auth_service.dart:37-64`
- Modify: `apps/mobile/lib/core/providers/auth_provider.dart:36-47`
- Test: `apps/mobile/test/auth_role_normalization_test.dart`

**Step 1: Implement `MobileRole` values and parser**

Use a finite role enum/value set:

```dart
enum MobileRole {
  tenantAdmin,
  branchAdmin,
  janitor,
  teacher,
  student,
  parent,
}

MobileRole? parseMobileRole(String rawRole) {
  return switch (rawRole.trim().toUpperCase().replaceAll(' ', '_')) {
    'TENANT_ADMIN' => MobileRole.tenantAdmin,
    'BRANCH_ADMIN' => MobileRole.branchAdmin,
    'JANITOR' => MobileRole.janitor,
    'TEACHER' => MobileRole.teacher,
    'STUDENT' => MobileRole.student,
    'PARENT' => MobileRole.parent,
    _ => null,
  };
}
```

**Step 2: Preserve raw role only for diagnostics; store normalized role code**

`AuthUser.fromJson` must use the normalizer and throw an `AuthFailure` for unknown or unsupported roles. Remove the insecure `TEACHER` fallback.

**Step 3: Extend role redirect mapping**

Add the following canonical defaults to `AuthState.roleRedirectPath`:

```dart
'TENANT_ADMIN' => '/tenant/home',
'BRANCH_ADMIN' => '/branch/home',
'JANITOR' => '/janitor/home',
```

**Step 4: Run green phase**

```bash
cd apps/mobile && flutter test test/auth_role_normalization_test.dart
```

Expected: all normalizer and redirect cases pass.

**Step 5: Commit**

```bash
git add apps/mobile/lib/core/auth/role_codes.dart \
  apps/mobile/lib/features/auth/data/auth_service.dart \
  apps/mobile/lib/core/providers/auth_provider.dart \
  apps/mobile/test/auth_role_normalization_test.dart
git commit -m "feat(auth): support tenant branch and janitor role redirects"
```

---

## Task 3: Strengthen router authorization and add route tests

**Objective:** Add protected route prefixes without allowing cross-role deep links.

**Files:**
- Modify: `apps/mobile/lib/core/router/app_router.dart:36-84`
- Create: `apps/mobile/test/app_router_role_guard_test.dart`

**Step 1: Write failing guard tests**

Cover these cases:
- Tenant Admin can reach `/tenant/home`; is redirected from `/branch/home` and `/janitor/home`.
- Branch Manager can reach `/branch/home`; is redirected from `/tenant/home` and `/janitor/home`.
- Janitor can reach `/janitor/home`; is redirected from `/tenant/home` and `/branch/home`.
- An unknown authenticated role is sent to `/login` or a dedicated unsupported-role screen—not an unrelated portal.

**Step 2: Add allowed prefixes**

Extend the router prefix switch:

```dart
'TENANT_ADMIN' => '/tenant/',
'BRANCH_ADMIN' => '/branch/',
'JANITOR' => '/janitor/',n```

Use the correct Dart syntax in implementation; the literal above is only the route mapping intent.

**Step 3: Add placeholder route builders only after guards pass**

Register `/tenant/home`, `/branch/home`, and `/janitor/home` with their portal root screens. Do not create wildcard routes that bypass role checks.

**Step 4: Verify**

```bash
cd apps/mobile && flutter test test/app_router_role_guard_test.dart
flutter analyze lib/core/router/app_router.dart lib/core/providers/auth_provider.dart
```

**Step 5: Commit**

```bash
git add apps/mobile/lib/core/router/app_router.dart apps/mobile/test/app_router_role_guard_test.dart
git commit -m "feat(router): protect tenant branch and janitor portals"
```

---

## Task 4: Build shared scoped-admin primitives

**Objective:** Avoid duplicating tenant/branch app chrome, scope badges, loading states, and approval cards.

**Files:**
- Create: `apps/mobile/lib/features/admin/widgets/scoped_admin_shell.dart`
- Create: `apps/mobile/lib/features/admin/widgets/scope_header.dart`
- Create: `apps/mobile/lib/features/admin/widgets/approval_summary_card.dart`
- Create: `apps/mobile/lib/features/admin/models/admin_portal_models.dart`
- Test: `apps/mobile/test/scoped_admin_shell_test.dart`

**Step 1: Write widget tests**

Assert that:
- Tenant scope displays tenant name and has no branch selector requirement.
- Branch scope displays a branch identity badge.
- Back, change-password, and logout controls remain present through `AppShell` integration.

**Step 2: Implement reusable models and widgets**

Keep models presentation-focused initially:
- `PortalKpi`
- `ApprovalSummary`
- `BranchSummary`
- `ScopedAdminShellConfig`

Do not duplicate DTOs from API repositories.

**Step 3: Verify**

```bash
cd apps/mobile && flutter test test/scoped_admin_shell_test.dart
flutter analyze lib/features/admin
```

**Step 4: Commit**

```bash
git add apps/mobile/lib/features/admin apps/mobile/test/scoped_admin_shell_test.dart
git commit -m "feat(admin): add scoped portal shell primitives"
```

---

## Task 5: Implement Tenant Admin portal MVP

**Objective:** Give Tenant Admin a tenant-wide, read-first operational dashboard with safe navigation to management workspaces.

**Files:**
- Create: `apps/mobile/lib/features/tenant_admin/screens/tenant_home_screen.dart`
- Create: `apps/mobile/lib/features/tenant_admin/screens/tenant_branches_screen.dart`
- Create: `apps/mobile/lib/features/tenant_admin/screens/tenant_people_screen.dart`
- Create: `apps/mobile/lib/features/tenant_admin/screens/tenant_reports_screen.dart`
- Create: `apps/mobile/lib/features/tenant_admin/data/tenant_admin_repository.dart`
- Create: `apps/mobile/lib/features/tenant_admin/viewmodels/tenant_admin_viewmodel.dart`
- Modify: `apps/mobile/lib/core/router/app_router.dart`
- Test: `apps/mobile/test/tenant_admin_viewmodel_test.dart`
- Test: `apps/mobile/test/tenant_admin_navigation_test.dart`

**MVP capabilities:**
1. KPI cards: active branches, active staff, active students, pending L2 approvals.
2. Branch list with status and drill-down route.
3. Tenant-wide people directory search/filter, backed by a scoped API endpoint.
4. Reports landing page with role-approved summary metrics.
5. L2 approval queue entry point for petty cash and leave approvals.

**Security rules:**
- Every repository request sends no tenant ID supplied by UI unless API explicitly requires it; backend derives tenant context from the authenticated session.
- Branch details must be limited to branches belonging to the tenant.
- Tenant Admin cannot access `/platform/` or Super Admin endpoints.

**Verification:**

```bash
cd apps/mobile
flutter test test/tenant_admin_viewmodel_test.dart test/tenant_admin_navigation_test.dart
flutter analyze lib/features/tenant_admin lib/core/router/app_router.dart
```

---

## Task 6: Implement Branch Manager portal MVP

**Objective:** Add a branch-scoped operational dashboard using the canonical `BRANCH_ADMIN` role and visible “Branch Manager” label.

**Files:**
- Create: `apps/mobile/lib/features/branch_manager/screens/branch_home_screen.dart`
- Create: `apps/mobile/lib/features/branch_manager/screens/branch_people_screen.dart`
- Create: `apps/mobile/lib/features/branch_manager/screens/branch_approvals_screen.dart`
- Create: `apps/mobile/lib/features/branch_manager/screens/branch_resources_screen.dart`
- Create: `apps/mobile/lib/features/branch_manager/data/branch_manager_repository.dart`
- Create: `apps/mobile/lib/features/branch_manager/viewmodels/branch_manager_viewmodel.dart`
- Modify: `apps/mobile/lib/core/router/app_router.dart`
- Test: `apps/mobile/test/branch_manager_viewmodel_test.dart`
- Test: `apps/mobile/test/branch_manager_navigation_test.dart`

**MVP capabilities:**
1. Branch KPIs: attendance, staff on duty, pending admissions/tasks, L1 approvals.
2. Branch-only people directory and role-aware staff/student actions.
3. L1 leave and petty-cash approval list; show final/L2 state clearly.
4. Resource-task overview with assignment status and overdue task alerts.
5. Branch announcements/calendar launch points, initially read-only unless API contract supports write actions.

**Security rules:**
- The selected/current branch comes from server-side role assignment, not a client-controlled query parameter.
- Every detail route must validate that the target person/task belongs to the authenticated manager’s branch.
- User creation options must exactly match `BRANCH_ADMIN_CREATABLE_ROLES` in `services/api/src/utils/roles.ts`.

**Verification:**

```bash
cd apps/mobile
flutter test test/branch_manager_viewmodel_test.dart test/branch_manager_navigation_test.dart
flutter analyze lib/features/branch_manager lib/core/router/app_router.dart
```

---

## Task 7: Implement Janitor task portal MVP

**Objective:** Give Janitors a focused, low-friction, mobile-first work queue with no administrative data exposure.

**Files:**
- Create: `apps/mobile/lib/features/janitor/screens/janitor_home_screen.dart`
- Create: `apps/mobile/lib/features/janitor/screens/janitor_task_detail_screen.dart`
- Create: `apps/mobile/lib/features/janitor/data/janitor_repository.dart`
- Create: `apps/mobile/lib/features/janitor/models/janitor_task.dart`
- Create: `apps/mobile/lib/features/janitor/viewmodels/janitor_task_viewmodel.dart`
- Modify: `apps/mobile/lib/core/router/app_router.dart`
- Test: `apps/mobile/test/janitor_task_viewmodel_test.dart`
- Test: `apps/mobile/test/janitor_task_screen_test.dart`

**MVP capabilities:**
1. “Today”, “Upcoming”, and “Completed” task lists.
2. Task detail: location, checklist, priority, due time, requester instructions.
3. Status transitions: `assigned → in_progress → completed`; reject invalid backward transitions unless API permits them.
4. Completion note and optional evidence attachment only after the API upload contract is verified.
5. Offline queue for status/note updates only if current offline infrastructure can guarantee idempotency; otherwise show an explicit retry state rather than pretending updates are saved.

**Security rules:**
- Query only tasks assigned to the authenticated janitor and authorized branch.
- Do not include staff/student lists, finance data, branch analytics, or task dispatch controls.

**Verification:**

```bash
cd apps/mobile
flutter test test/janitor_task_viewmodel_test.dart test/janitor_task_screen_test.dart
flutter analyze lib/features/janitor lib/core/router/app_router.dart
```

---

## Task 8: Wire authorized API repositories and validate server enforcement

**Objective:** Replace demo data only where the corresponding server endpoint is verified and protected.

**Files:**
- Modify/create repositories from Tasks 5–7.
- Modify only necessary API routes under `services/api/src/routes/`.
- Modify: `services/api/src/utils/roles.ts` only if a permission is genuinely missing.
- Create integration tests next to affected API routes or in `services/api/src/integration/`.

**Step 1: Add server-side denial tests first**

For each endpoint, prove:
- unauthenticated request → `401`;
- authenticated wrong role → `403`;
- valid role from another tenant/branch cannot access the resource → `403` or `404`, according to API policy;
- valid in-scope role succeeds.

**Step 2: Add mobile repository tests**

Mock Dio responses for loading, empty state, `401`, `403`, validation errors, and retryable network errors.

**Step 3: Verify API and mobile suites**

```bash
cd services/api && npm test -- --runInBand
cd ../../apps/mobile && flutter test
```

**Step 4: Commit by portal/API boundary**

```bash
git commit -m "feat(api): add scoped tenant portal endpoints"
git commit -m "feat(api): add scoped branch manager endpoints"
git commit -m "feat(api): add janitor task workflow endpoints"
```

---

## Task 9: Add role-specific feature flags and visibility tests

**Objective:** Ensure optional capabilities can be enabled/disabled without presenting unreachable UI.

**Files:**
- Modify: `apps/mobile/lib/core/providers/feature_flags_provider.dart`
- Modify: tenant, branch-manager, and janitor screens created above.
- Create: `apps/mobile/test/role_feature_flags_test.dart`

**Initial flags:**

```dart
FeatureFlags.tenantReports
FeatureFlags.tenantApprovals
FeatureFlags.branchApprovals
FeatureFlags.branchResourceTasks
FeatureFlags.janitorEvidenceUpload
```

**Rules:**
- Default visibility must match server permissions.
- If a feature is disabled, remove its navigation entry; do not route users to a broken page.
- The API remains authoritative if a stale client feature flag exposes an action.

---

## Task 10: End-to-end acceptance, accessibility, and release verification

**Objective:** Prove each role lands in the correct portal, cannot cross scope, and has usable mobile navigation.

**Files:**
- Create: `apps/mobile/integration_test/role_portal_flow_test.dart` if emulator/driver setup exists.
- Create/update: `docs/testing/mobile-role-acceptance.md`
- Modify: `docs/architecture/README.md` with the new role/portal matrix.

**Acceptance checklist:**

- [ ] Tenant Admin login redirects to `/tenant/home`; Branch Manager to `/branch/home`; Janitor to `/janitor/home`.
- [ ] Direct URL attempts to another role’s prefix redirect to the authenticated user’s own home.
- [ ] Tenant Admin sees tenant data only; Branch Manager sees their branch only; Janitor sees assigned tasks only.
- [ ] All portal screens offer logout and change-password entry points.
- [ ] Back navigation uses `context.pop()` only for pushed sub-screens; primary navigation uses `context.go()`.
- [ ] Compact layouts support 360 px width with no clipped primary controls.
- [ ] Loading, empty, failure, and forbidden states are explicit and accessible.
- [ ] No API client call accepts a client-provided tenant ID that could override session scope.

**Final commands:**

```bash
cd apps/mobile
flutter analyze
flutter test --coverage
flutter build apk --debug

cd ../../services/api
npm test
```

---

## Risks and Decisions Required Before Execution

1. **Role vocabulary:** Confirm that “Branch Manager” is the display name for the existing `BRANCH_ADMIN` role. This plan assumes yes.
2. **Portal priority:** Tenant Admin and Branch Manager should be delivered before Janitor because they require shared scope/approval infrastructure; Janitor can then reuse resource-task contracts.
3. **API coverage:** Existing web capabilities suggest many routes exist, but exact mobile-safe response contracts must be verified before repositories are written.
4. **Offline behavior:** Janitor task completion may need offline support; defer evidence upload/offline sync until idempotency and storage policy are approved.
5. **Attachments:** Evidence images can affect storage, security, and privacy. Do not implement uploads without size limits, signed-upload/auth rules, retention policy, and virus/content scanning requirements.
6. **Auditability:** Approval actions and task status changes should include actor, timestamp, prior state, and scope on the server; mobile should render that audit history but not fabricate it locally.

## Expected Delivery Slices

1. **Slice A — Auth and guards:** Tasks 1–3.
2. **Slice B — Shared admin components:** Task 4.
3. **Slice C — Tenant Admin:** Task 5 and tenant API tests.
4. **Slice D — Branch Manager:** Task 6 and branch API tests.
5. **Slice E — Janitor:** Task 7 and task API tests.
6. **Slice F — Hardening and release:** Tasks 8–10.
