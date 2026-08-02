# TMS Authentication and Authorization Handoff

**Document status:** Active implementation runbook for authentication and authorization
**Last reconciled:** 2026-08-02
**Audience:** API, web, mobile, database, security, and release engineers

> **Authority boundary:** `.memory` is the repository-wide operational source
> of truth. This document is authoritative only for the detailed
> authentication, authorization, tenant-isolation, and related release
> procedures described here. Reconcile it with `.memory` whenever either
> boundary changes.

This document explains how the Tuition Management System (TMS) authentication, tenant isolation, branch authority, testing, and deployment flow work after the security and Better Auth update. A new team member should be able to use this document to run the system locally, validate the security model, and continue implementation safely.

## 1.0 Product and authority model

TMS is a **single-institution, multi-branch** product. It is not a white-label multi-tenant platform for production clients.

### 1.1 Production hierarchy

```text
Tenant Admin
└── Branch Admin
    ├── Teacher
    ├── Accountant
    ├── Receptionist
    └── Janitor
        └── Student / Parent (linked records only)
```

- **Tenant Admin:** highest client-facing authority. Manages branches, Branch Admin assignments, tenant-wide settings, cross-branch reports, templates, approvals, and financial controls.
- **Branch Admin:** operates only within assigned branch(es). Manages branch staff, schedules, attendance, branch resources, branch events, and first-level approvals.
- **Staff and teachers:** access only explicitly assigned or personal records.
- **Students and parents:** access only their own or linked records.
- **Super Admin:** development operator only. It must be disabled and absent from the production client release.

### 1.2 Financial authority

Branch Admins may prepare or approve branch-level requests such as petty cash at level one. Tenant Admin retains final release and tenant-wide financial authority. Every approval must record the actor, reason, amount, status, and timestamp.

## 2.0 Authentication architecture

### 2.1 Primary authentication flow

```text
Web/mobile client
  -> Better Auth sign-in endpoint
  -> PostgreSQL-backed session and secure cookie
  -> API auth middleware
  -> resolveActorScope()
  -> requireBranchAccess() / permission check
  -> route handler and scoped Prisma query
```

Better Auth is configured in `services/api/src/utils/auth.ts`. The Prisma adapter stores users, accounts, sessions, and verification records in PostgreSQL. The client uses `credentials: include` so the session cookie is sent to the API.

Primary Better Auth endpoints:

```text
POST /api/auth/sign-in/email
GET  /api/auth/get-session
POST /api/auth/sign-out
```

There is no JWT compatibility path. Better Auth is the only supported authentication mechanism in this deployment.

### 2.2 Scope resolution

`services/api/src/middleware/auth.ts` verifies the session and attaches the authenticated user to the request. `services/api/src/utils/access-control.ts` provides the central scope functions:

- `resolveActorScope()` derives tenant, role, permissions, and assigned branches.
- `requireBranchAccess()` rejects access to branches outside the actor scope.
- Route queries must include tenant ownership and, where applicable, branch ownership.

Request headers such as `X-Tenant-Id` and `X-Branch-Id` are not authority inputs in production.

## 3.0 Local setup

### 3.1 Required software

- Node.js and npm compatible with the repository lockfile.
- PostgreSQL.
- A database named `tms` or another database referenced by `DATABASE_URL`.

### 3.2 Environment configuration

Copy `services/api/.env.example` to `services/api/.env` and set real local values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tms?schema=public"
BETTER_AUTH_SECRET="<different-strong-random-value>"
BETTER_AUTH_URL="http://localhost:3001"
WEB_ORIGIN="http://localhost:5173"
PLATFORM_ADMIN_ENABLED="true"
SEED_ADMIN_EMAIL="dev-superadmin@example.local"
SEED_ADMIN_PASSWORD="<development-only-password>"
NODE_ENV="development"
SEED_DEMO="false"
```

Generate secrets locally without committing them:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

In production, load secrets from a secret manager. Do not place passwords or tokens in source files, test fixtures, browser code, logs, or CI YAML.

### 3.3 Install, generate, and migrate

```powershell
cd D:\Downloads\tution-Management-System
npm ci

cd services\api
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

Use `prisma migrate deploy` for staging and production. Use `prisma migrate dev` only when deliberately creating a new migration during local development.

## 4.0 Running the applications

Start the API in one terminal:

```powershell
cd D:\Downloads\tution-Management-System\services\api
npm run dev
```

Start the web application in a second terminal:

```powershell
cd D:\Downloads\tution-Management-System\apps\web
npm run dev
```

Verify the API health endpoint:

```powershell
Invoke-WebRequest http://localhost:3001/api/health
```

Expected response: HTTP `200` and a JSON body containing `"status":"UP"`.

Open `http://localhost:5173/login` in the browser. The production login page must not contain demo quick-fill controls or Super Admin navigation.

## 5.0 Development provisioning flow

The development-only provisioning flow is:

1. Start with `PLATFORM_ADMIN_ENABLED=true`.
2. Seed the development Super Admin using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
3. Submit an onboarding request.
4. Approve the request using the development Super Admin flow.
5. Capture the generated temporary Tenant Admin password through a secure local channel.
6. Sign in as Tenant Admin and immediately change the password.
7. Create branches and assign Branch Admins from the Tenant Admin context.
8. Set `PLATFORM_ADMIN_ENABLED=false` and restart the API before any production-like test.

The onboarding routes are not mounted when `PLATFORM_ADMIN_ENABLED=false`. Production must never expose the platform operator surface.

## 6.0 Verification plan

Run the following layers in order. Do not skip a lower layer when a higher layer fails.

### 6.1 Static and build checks

```powershell
cd D:\Downloads\tution-Management-System
npm run build

cd services\api
npx prisma validate --schema prisma\schema.prisma
npx ts-node src\utils\access-control.test.ts
git diff --check
```

The build must pass for the web, API, and shared types. The authorization scope test must pass before integration testing.

### 6.2 Authentication smoke tests

Test with a real development Tenant Admin account:

| Test | Expected result |
|---|---|
| Valid email/password | Session cookie issued; user reaches the correct dashboard |
| Invalid password | Generic authentication failure; no session |
| `GET /api/auth/get-session` after login | Returns the authenticated user and roles |
| Browser refresh | Session remains valid until expiry or logout |
| `POST /api/auth/sign-out` | Session is invalidated server-side and client-side |
| Protected route without cookie | `401` or `403`; no data returned |
| Expired or revoked session | `401` or `403` |
| Password reset | Old password/session cannot continue to authenticate |

The smoke test can use environment-provided credentials only:

```powershell
$env:TMS_SMOKE_EMAIL = "tenant-admin@example.local"
$env:TMS_SMOKE_PASSWORD = "<local-password>"
cd apps\web
npx testcafe chrome tests\smoke.js
```

Never add those values to `apps/web/tests/smoke.js`.

### 6.3 Authorization and IDOR tests

For every protected route, test both a valid and invalid scope:

- Tenant Admin can read and manage records for the institution.
- Branch Admin can read and manage assigned branch records only.
- Branch Admin cannot access another branch by changing `branchId`.
- Any authenticated user cannot access another tenant by changing `tenantId`.
- A user cannot impersonate another `userId`, `staffId`, teacher, manager, or parent/student relationship.
- Header values `X-Tenant-Id` and `X-Branch-Id` cannot expand scope.
- Branch Admin cannot perform Tenant Admin financial release or tenant-wide settings actions.
- Tenant Admin and Branch Admin approval actions write an audit record.

Use database fixtures with at least two branches and two users in different scopes. Do not use production-like passwords in fixtures.

### 6.4 Role acceptance matrix

| Capability | Tenant Admin | Branch Admin | Teacher/staff | Student/parent |
|---|---:|---:|---:|---:|
| Create branch | Yes | No | No | No |
| Assign Branch Admin | Yes | No | No | No |
| Manage branch staff | Yes | Assigned branches | No | No |
| Manage schedules/attendance | Yes | Assigned branches | Assigned records | Own/linked only |
| Petty cash level-one action | Yes | Assigned branches | As explicitly assigned | No |
| Petty cash final release | Yes | No | No | No |
| Tenant-wide settings/templates | Yes | No | No | No |
| Branch calendar/resources | Yes | Assigned branches | Assigned tasks | No |
| Cross-branch reports | Yes | No | No | No |

## 7.0 CI and release gates

Every pull request must pass:

1. `npm ci`.
2. Web lint and build.
3. API and shared-type builds.
4. Prisma schema validation.
5. Authorization scope tests.
6. Secret and fixed-ID scans.
7. Authentication and authorization integration tests as they are added.

Staging release order:

```text
Backup database
  -> prisma migrate deploy
  -> deploy immutable API/web artifacts
  -> /api/health check
  -> Better Auth login/logout check
  -> role and branch-scope tests
  -> review error and audit logs
```

Production requires protected branch approval, a migration backup, an explicit rollback plan, and `PLATFORM_ADMIN_ENABLED=false`.

## 8.0 Security rules for future work

- Never accept tenant, branch, actor, manager, or staff authority from request data alone.
- Derive identity and scope from the verified session.
- Keep tenant ownership in every Prisma query.
- Keep branch ownership in every branch-scoped Prisma query.
- Do not add fake database fallbacks or simulated records on errors.
- Do not log passwords, reset tokens, session cookies, OAuth tokens, or temporary credentials.
- Do not restore demo login controls to a client build.
- Add an authorization test whenever a new protected route is added.
- Rotate any secret that was ever committed or exposed.

## 9.0 Remaining implementation work

The next engineering priorities are:

1. Finish migrating all web and mobile authentication calls to Better Auth.
2. Add automated integration tests for login, logout, session expiry, password reset, IDOR, and role escalation.
3. Add rate limiting and lockout monitoring for repeated failed logins.
4. Verify secure cookie flags in staging over HTTPS.
5. Review and remediate the outstanding dependency audit findings.
6. Run a full staging acceptance test using two branches and separate role accounts.

## 10.0 Key files

- `services/api/src/utils/auth.ts` — Better Auth configuration.
- `services/api/src/middleware/auth.ts` — session verification and actor attachment.
- `services/api/src/utils/access-control.ts` — tenant and branch scope enforcement.
- `services/api/src/utils/roles.ts` — role permissions.
- `services/api/src/middleware/tenant.ts` — tenant isolation middleware.
- `services/api/prisma/schema.prisma` — user, account, session, and role data model.
- `services/api/prisma/migrations/20260728170000_add_better_auth_core/` — Better Auth database migration.
- `services/api/src/server.ts` — Better Auth mounting and route registration.
- `.github/workflows/ci.yml` — CI and security checks.

This runbook is the operational source of truth for continuing the authentication and authorization work. Update it whenever the session model, role matrix, provisioning flow, migration process, or release gates change.
