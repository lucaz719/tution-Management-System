# Web & Backend Codebase Audit

> **Historical assessment — not current release posture.** This review reflects
> a static review on 2026-07-27 and predates the Better Auth hardening and later
> portal work. Use `.memory` for current implementation status and
> `documents/auth-docs/AUTH_AND_AUTHORIZATION_HANDOFF.md` for the active
> authentication and authorization runbook. Revalidate every finding against
> the current code before scheduling work from this document.

**Scope:** `apps/web`, `services/api`, and `packages/types` only. The mobile application was intentionally not inspected.  
**Method:** static review plus `npm run build` on 2026-07-27. The build passed; Webpack reported two asset-size warnings.

## Executive summary

This is a TypeScript npm-workspace monorepo for a single-institution, multi-branch tuition-management system. The React web client calls an Express API, the API uses Prisma to access PostgreSQL, and Better Auth owns the database-backed session cookie. The project has a wide backend feature surface, but the web product currently implements only a subset of that surface and several older/prototype paths remain alongside it.

The most important structural work is to make authorization and tenant scoping a deliberate, centralized boundary, then separate real product modules from prototype/unfinished modules. See the accompanying authentication audit for the urgent security findings.

## How the running web/backend system connects

```text
Browser
  React 19 web app (apps/web, Webpack, :5173)
    -> AuthContext: user/session/role routing
    -> services/api.ts: fetch wrapper sends the Better Auth session cookie
    -> route pages, dashboards, forms
  Express API (services/api, :3001)
    -> CORS + JSON parser
    -> tenantMiddleware (header-derived context before a route's auth middleware)
    -> route-level authMiddleware / hasPermission
    -> route handlers and utility services
    -> Prisma client
  PostgreSQL
    -> Tenant, User, Role/UserRole, Branch and domain tables
```

`packages/types` provides shared TypeScript payload/domain types to the client and API. It is a useful start, but it is not a complete API contract: the web API client contains many anonymous `any` payloads and independently declared response shapes.

## Main areas and connections

| Area | Primary code | Connects to | Observations |
|---|---|---|---|
| Web entry and routing | `apps/web/src/main.tsx`, `router/index.tsx` | AuthContext, dashboard shells, page components | Client-side role guards provide navigation UX, not API security. Several role workspaces resolve to placeholders. |
| Client API boundary | `apps/web/src/services/api.ts` | Express `/api/*` | One fetch wrapper is good, but the base URL is hard-coded and the file has grown into a large hand-written contract. |
| Authentication/session | `features/auth/*`, `context/AuthContext.tsx` | `/api/auth/*`, browser storage | Handles login, password reset, 2FA UX, role redirects and remember-me storage. Details and risks are in the auth audit. |
| API composition | `services/api/src/server.ts` | 21 mounted routers | Express composition is easy to trace, but each router is responsible for remembering its own auth/permission rules. |
| Identity and tenancy | `middleware/auth.ts`, `middleware/tenant.ts` | JWT claims, request headers, Prisma filters | JWT tenant is restored for non-super-admins after authentication; route ordering still leaves a brittle header-first tenant stage. |
| Domain API | `services/api/src/routes/*.ts` | Prisma and notification utilities | Covers onboarding, users, courses, attendance, finance, HR, communication, etc. It is route-heavy rather than service-layer based. |
| Database | `services/api/prisma/schema.prisma` | PostgreSQL | Relational model is broad and supports tenant-aware entities, roles and verification codes. Most tenant/foreign-key query paths do not declare explicit composite indexes. |

## What is connected versus incomplete or legacy

1. `server.ts` mounts the main API routers, but `src/routes/vehicles.ts` and `src/routes/canteen.ts` are present and are **not imported or mounted**. Their endpoints are unreachable in the running API.
2. `packages/ui-login` is a separate legacy Tailwind login project. The React web app does not import it; the API separately serves its built assets at `/login`. This creates two login UIs and two deployment paths. Keep one canonical login experience, or move the legacy project to an explicit archive/example area.
3. The README calls the API test file a comprehensive suite, but `services/api/package.json` has no `test` script and the root `npm test` therefore does not execute it. The test is an opt-in script (`npx ts-node src/test-tms.ts`) rather than CI-enforced coverage.
4. The web router intentionally sends many routes to `PlaceholderPage` / `RoleWorkspacePlaceholder`. The navigation is ahead of the implemented feature wiring, so users can reach screens that do not perform real work.
5. Notifications and OTP delivery are console-backed mocks. They support development workflows, but they are not production integrations.

## Maintainability and performance findings

| Priority | Finding | Evidence | Recommended change |
|---|---|---|---|
| High | Route handlers combine transport, authorization, business rules and Prisma queries. | Large route files such as `courses.ts`, `finances.ts`, and `users.ts`. | Introduce domain services (e.g., billing, enrollment, people), input validators, and thin controllers. This makes rules reusable and unit-testable. |
| High | Tenant scoping is convention-based rather than enforced at a single data-access boundary. | Individual route queries manually use `req.tenantId`; `tenantMiddleware` runs before endpoint auth. | Authenticate first, derive tenant context once, and expose a tenant-scoped repository/Prisma extension. Reject unscoped access by default. |
| Medium | The client API file mixes many domains and uses `any` extensively. | `apps/web/src/services/api.ts`. | Split it by domain, generate or share request/response schemas, and replace `any` with inferred types (Zod/Valibot + OpenAPI is a practical route). |
| Medium | Production bundle size is high. | Successful build emitted a 365 KiB main bundle and 919 KiB vendor bundle; both exceed Webpack's warning threshold. | Add bundle analysis, lazy-load feature pages/components, defer ExcelJS to export screens, and set performance budgets in CI. |
| Medium | Database indexes are sparse for a multi-tenant system. | Schema explicitly declares only a small set of unique/index constraints (e.g., verification-code lookup). | Use query logs and add composite indexes aligned with common filters: `tenantId + status`, `tenantId + branchId`, and date/order columns. Do not add indexes blindly. |
| Medium | The cron trigger is implemented as a public API operation rather than a scheduler/worker. | `/api/cron/trigger` executes business tasks in a web request. | Move recurring work to a job runner/queue with a service credential, retries, idempotency, monitoring, and per-tenant execution. |
| Low | The API's error handler returns `err.message` to clients. | `services/api/src/server.ts`. | Return a stable generic error in production and log a correlation ID plus the internal error server-side. |
| Low | API origin is hard-coded to localhost. | `apps/web/src/services/api.ts`. | Use build-time environment configuration and validate it in deployment. |

## Suggested target shape

```text
Web page -> typed domain client -> API controller -> authenticated tenant context
        -> schema validation     -> application service -> tenant-scoped repository -> Prisma
                                                        -> job/notification ports
```

This keeps browser concerns, HTTP concerns, authorization, business rules, persistence, and external delivery adapters separate. It also makes it possible to test each layer without starting the full server.

## Recommended delivery order

1. Fix the auth and authorization issues in `audit-auth-security.md` before expanding features.
2. Make the mounted API surface explicit: wire, remove, or archive vehicle/canteen and legacy login modules.
3. Create a CI test command and separate integration tests from seed/demo scenarios.
4. Add validation, service-layer extraction, and a tenant-scoped data-access convention for the highest-risk domains: users, finance, courses, attendance, and cron jobs.
5. Type and split the web client; then reduce bundle size based on a bundle report.

## Verification result

`npm run build` completed successfully for `web`, `@tms/types`, and `@tms/api`. The web build emitted two size warnings; no automated tests were run because no workspace test script is defined.
