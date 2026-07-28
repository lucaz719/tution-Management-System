# Tuition Management System (TMS)

Single-institution, multi-branch management software for tuition and education operations in Nepal.

TMS keeps one institution isolated across its branches. It is not a production white-label SaaS platform. The client-facing authority is the Tenant Admin; Super Admin exists only as a development provisioning tool and must be disabled before production.

## Authority model

```text
Development only: Super Admin
                    ↓ provisions
Production:        Tenant Admin
                    └── Branch Admin
                        ├── Teacher
                        ├── Accountant
                        ├── Receptionist
                        └── Janitor
                            └── Student / Parent
```

- **Tenant Admin:** branches, Branch Admin assignment, tenant settings, cross-branch reports, templates, and final financial approvals.
- **Branch Admin:** assigned branch operations, staff, schedules, attendance, resources, and first-level approvals.
- **Staff and teachers:** personal or explicitly assigned records.
- **Students and parents:** their own or linked records only.
- **Super Admin:** development-only institution provisioning; never a production client role.

## Authentication and authorization

Better Auth is the only supported authentication mechanism. It uses PostgreSQL-backed sessions and secure cookies.

```text
Client → Better Auth sign-in → session cookie → API middleware
       → actor scope → tenant/branch authorization → Prisma query
```

The API does not accept `tenantId`, `branchId`, user IDs, or authorization headers as identity authority. Scope is derived from the verified session and checked centrally through:

- `services/api/src/middleware/auth.ts`
- `services/api/src/utils/access-control.ts`
- `services/api/src/utils/roles.ts`

JWT login, bearer-token authorization, and hardcoded credentials have been removed.

## Technology stack

- **API:** Node.js, Express, TypeScript, Better Auth, Prisma, PostgreSQL.
- **Web:** React 19, TypeScript, Webpack, Better Auth client.
- **Mobile:** Flutter, Dio, Better Auth session cookies.
- **Shared types:** `packages/types`.
- **CI:** npm builds, Prisma validation, authorization tests, and credential scanning.

## Repository structure

```text
apps/web/                    React web dashboard
apps/mobile/                 Flutter mobile application
packages/types/              Shared TypeScript types
services/api/                Express API and Prisma schema/migrations
documents/                   Audits and team handoff documentation
.github/workflows/ci.yml     Pull-request validation pipeline
```

## Local setup

### Prerequisites

- Node.js compatible with the repository lockfile.
- npm.
- PostgreSQL.
- Flutter SDK for mobile work.

### Configure the API

Copy `services/api/.env.example` to `services/api/.env` and set local values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tms?schema=public"
BETTER_AUTH_SECRET="<strong-random-secret>"
BETTER_AUTH_URL="http://localhost:3001"
WEB_ORIGIN="http://localhost:5173"

# Development provisioning only
PLATFORM_ADMIN_ENABLED="true"
SEED_ADMIN_EMAIL="dev-superadmin@example.local"
SEED_ADMIN_PASSWORD="<development-password>"
NODE_ENV="development"
SEED_DEMO="false"
```

Generate a secret without committing it:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env`, passwords, session cookies, reset tokens, or OAuth tokens.

### Install, migrate, and seed

```powershell
cd D:\Downloads\tution-Management-System
npm ci

cd services\api
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

### Start the API and web app

Terminal 1:

```powershell
cd D:\Downloads\tution-Management-System\services\api
npm run dev
```

Terminal 2:

```powershell
cd D:\Downloads\tution-Management-System\apps\web
npm run dev
```

Open `http://localhost:5173/login` and check the API at `http://localhost:3001/api/health`.

## Docker setup

Docker Compose starts PostgreSQL, applies all Prisma migrations, and then starts
the API and web application.

```powershell
Copy-Item .env.docker.example .env
# Replace BETTER_AUTH_SECRET and POSTGRES_PASSWORD in .env.
docker compose up --build -d
docker compose ps
```

Open `http://localhost:5173/login`. The API health endpoint is
`http://localhost:3001/api/health`.

Useful commands:

```powershell
docker compose logs -f api
docker compose down
# Explicitly remove the local database volume only when a full reset is wanted:
docker compose down --volumes
```

The database persists in the named `tms_postgres_data` volume. The migration
container runs `prisma migrate deploy` on every startup and exits successfully
when the schema is current.

### connectIPS payments

connectIPS is disabled by default. Configure the `CONNECTIPS_*` values shown in
`services/api/.env.example` using NCHL-issued UAT credentials. The creditor PFX
must be supplied as base64 and must never be committed.

Register these static API return URLs with NCHL:

```text
http://localhost:3001/api/finances/connectips/return/success
http://localhost:3001/api/finances/connectips/return/failure
```

Use the corresponding HTTPS production URLs for live certification. Run
`connectips-revalidate` through the protected cron endpoint on a five-minute
schedule to reconcile successful payments when the customer closes the browser
before returning.

## Development provisioning flow

When `PLATFORM_ADMIN_ENABLED=true`, the seeded development Super Admin can provision the initial institution and Tenant Admin. After the Tenant Admin is created:

1. Sign in as Tenant Admin.
2. Change the temporary password immediately.
3. Create branches.
4. Assign Branch Admins.
5. Create branch staff and teachers.
6. Disable platform administration:

```env
PLATFORM_ADMIN_ENABLED="false"
```

Restart the API after changing the flag. Production must not mount or compile a client-facing Super Admin surface.

## Verification commands

Run the standard checks from the repository root:

```powershell
npm run build

cd services\api
npx prisma validate --schema prisma\schema.prisma
npx ts-node src\utils\access-control.test.ts
```

Manual acceptance tests must cover:

- Better Auth login, session restoration, logout, and session expiry.
- Unauthenticated protected-route rejection with `401` or `403`.
- Tenant Admin cross-branch access.
- Branch Admin access limited to assigned branches.
- Tenant and branch IDOR attempts.
- Role escalation attempts.
- Petty-cash level-one versus final-release authority.
- No credentials or bearer tokens in browser storage, bundles, logs, or fixtures.

For web smoke testing, credentials must be supplied through the environment:

```powershell
$env:TMS_SMOKE_EMAIL = "tenant-admin@example.local"
$env:TMS_SMOKE_PASSWORD = "<local-password>"
cd apps\web
npx testcafe chrome tests\smoke.js
```

For mobile work:

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```

## Release gates

```text
Backup database
  → prisma migrate deploy
  → deploy immutable API/web artifacts
  → /api/health check
  → Better Auth login/logout smoke test
  → tenant/branch authorization tests
  → audit and error-log review
```

Production requirements:

- `PLATFORM_ADMIN_ENABLED=false`.
- Secrets loaded from a secret manager.
- Protected branch and reviewed CI checks.
- Database backup and migration rollback plan.
- No hardcoded credentials or platform-admin navigation.

## Documentation

- [Authentication and authorization handoff](documents/AUTH_AND_AUTHORIZATION_HANDOFF.md)
- [Authentication security audit](documents/audit-auth-security.md)
- [Web/backend audit](documents/audit-web-backend-codebase.md)

The handoff document is the operational source of truth for continuing authentication, authorization, testing, and deployment work.
