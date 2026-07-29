# Developer Local Setup and Test-Account Provisioning

**Audience:** Frontend developer after cloning the repository  
**Prepared:** 2026-07-29  
**Recommended setup:** Docker Compose for PostgreSQL, migrations, API, and web

This runbook takes a new developer from a fresh clone to:

1. A running local TMS stack.
2. A seeded development Super Admin.
3. A real Tenant Admin account.
4. A branch and additional role accounts for frontend testing.

## 1. Important facts before starting

- The Compose file is named `compose.yml`.
- Use `.env.docker` with `--env-file .env.docker`.
- Compose automatically starts PostgreSQL and applies Prisma migrations.
- Compose does **not** automatically seed a Super Admin.
- The Super Admin seed email and password are chosen by the developer; there are no shared hard-coded credentials.
- Platform administration must be enabled locally for Super Admin onboarding routes to exist.
- `/setup/tenant` is currently a frontend-only mock wizard. Do not use it to create the real local tenant.
- The real Tenant Admin is created by approving an onboarding request.
- Do not commit `.env.docker`, credentials, cookies, or generated temporary passwords.

## 2. Prerequisites

Install:

- Git
- Docker Desktop with the WSL 2 engine
- Node.js and npm, for running checks or the web/API outside Docker
- A Chromium-based browser

Check the tools:

```powershell
git --version
docker --version
docker compose version
node --version
npm --version
```

Docker Desktop must be running before continuing.

## 3. Clone and enter the repository

```powershell
git clone https://github.com/lucazsoft/tution-Management-System.git
Set-Location .\tution-Management-System
```

Confirm the expected files:

```powershell
Get-Item .\compose.yml
Get-Item .\.env.docker.example
Get-Item .\package.json
```

## 4. Create the local Docker environment

Create the ignored local environment file:

```powershell
Copy-Item .\.env.docker.example .\.env.docker
```

Generate two local secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Open `.env.docker` and make these changes:

```env
POSTGRES_DB=tms
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<choose-a-local-database-password>
POSTGRES_PORT=5432

API_PORT=3001
WEB_PORT=5173
BETTER_AUTH_SECRET=<paste-first-generated-secret>
BETTER_AUTH_URL=http://localhost:3001
WEB_ORIGIN=http://localhost:5173

# Required temporarily for local Super Admin provisioning
PLATFORM_ADMIN_ENABLED=true

SMS_PROVIDER=MOCK
NEPALPAY_WEBHOOK_SECRET=<paste-second-generated-secret>

# Keep real payment integration disabled for normal frontend development
CONNECTIPS_ENABLED=false
```

Use a password that contains uppercase, lowercase, a number, and a special character. Do not reuse a personal password.

## 5. Start the complete stack

From the repository root:

```powershell
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps -a
```

Expected containers:

| Service | Expected state |
|---|---|
| `db` | Running and healthy |
| `migrate` | Exited with code `0` |
| `api` | Running and healthy |
| `web` | Running |

The `migrate` service exiting successfully is normal. It applies migrations and then stops.

Check the API:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

Open:

- Web login: `http://localhost:5173/login`
- API health: `http://localhost:3001/api/health`

If a container is not healthy:

```powershell
docker compose --env-file .env.docker logs --tail 200 db
docker compose --env-file .env.docker logs --tail 200 migrate
docker compose --env-file .env.docker logs --tail 200 api
docker compose --env-file .env.docker logs --tail 200 web
```

## 6. Create the local development Super Admin

Choose local-only credentials:

```powershell
$devSuperAdminEmail = "dev-superadmin@example.local"
$devSuperAdminPassword = "LocalOnly!Change123"
```

Run the seed in a one-off API container:

```powershell
docker compose --env-file .env.docker run --rm `
  -e PLATFORM_ADMIN_ENABLED=true `
  -e SEED_ADMIN_EMAIL="$devSuperAdminEmail" `
  -e SEED_ADMIN_PASSWORD="$devSuperAdminPassword" `
  -e SEED_ADMIN_2FA=false `
  api npm run db:seed
```

Expected output includes:

```text
[seed] Bootstrap complete.
[seed]   Tenant:  TMS Platform (...)
[seed]   Account: dev-superadmin@example.local (role: Super Admin)
```

Notes:

- The password is not generated or printed by the seed. It is the value selected above.
- Running the command again with the same email rotates that account to the supplied password.
- `SEED_ADMIN_2FA=false` makes initial local login simpler.
- Do not place these values in tracked source files.

## 7. Verify that platform administration is enabled

Verify the running API configuration:

```powershell
Select-String -Path .env.docker -Pattern "PLATFORM_ADMIN_ENABLED"
docker compose --env-file .env.docker exec api printenv PLATFORM_ADMIN_ENABLED
```

Both must report `true`. If `.env.docker` was changed after the API started, recreate the API container:

```powershell
docker compose --env-file .env.docker up --build -d --force-recreate api web
```

### Current Super Admin web limitation

Do not try to use the browser Super Admin dashboard for provisioning in the current revision.

The backend seed and onboarding APIs support `Super Admin`, and Super Admin page components exist, but the current web `UserRole` union and router do not register `SUPER_ADMIN` or `/super-admin/*`. A Super Admin browser login therefore redirects incorrectly instead of opening the control center.

Use the authenticated PowerShell API session in the next sections. Fixing and registering the Super Admin web routes is a separate frontend task; it is not required to begin Tenant Admin work.

## 8. Submit a real tenant onboarding request

There is currently no public production-ready onboarding-request page. The authenticated `/setup/tenant` wizard only simulates saving and must not be used for this step.

Open a new PowerShell terminal and submit a unique request:

```powershell
$tenantRequest = @{
  name = "Frontend Dev Academy"
  email = "tenantadmin@frontend-dev.local"
  phone = "9800000000"
  panNumber = "987654321"
  remarks = "Local frontend development tenant"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/onboarding/request" `
  -ContentType "application/json" `
  -Body $tenantRequest
```

Use a different email and nine-digit PAN if the request or tenant already exists in the persistent local database.

Expected result:

```text
Your onboarding request has been submitted successfully for administrative review.
```

## 9. Approve the request and create the Tenant Admin

Create an authenticated Super Admin PowerShell session:

```powershell
$superAdminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$superAdminLogin = @{
  email = "dev-superadmin@example.local"
  password = "LocalOnly!Change123"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/auth/sign-in/email" `
  -ContentType "application/json" `
  -Body $superAdminLogin `
  -WebSession $superAdminSession
```

Load pending requests:

```powershell
$onboardingRequests = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3001/api/onboarding/requests" `
  -WebSession $superAdminSession

$onboardingRequests.requests |
  Select-Object id, name, email, panNumber, status
```

Select the request created in the previous step:

```powershell
$pendingTenant = $onboardingRequests.requests |
  Where-Object {
    $_.email -eq "tenantadmin@frontend-dev.local" -and
    $_.status -eq "PENDING"
  } |
  Select-Object -First 1

if (-not $pendingTenant) {
  throw "Pending frontend development tenant request was not found."
}
```

Approve it:

```powershell
$approvalBody = @{
  defaultBranchName = "Main Center"
  branchAddress = "Kathmandu, Nepal"
  latitude = 27.7172
  longitude = 85.3240
} | ConvertTo-Json

$approval = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/onboarding/approve/$($pendingTenant.id)" `
  -ContentType "application/json" `
  -Body $approvalBody `
  -WebSession $superAdminSession

$approval.provisioned |
  Select-Object tenantName, primaryAdminUser, defaultBranch, temporaryPassword
```

This approval creates:

- The tenant.
- A default `Main Center` branch.
- The Tenant Admin role and permissions.
- The primary Tenant Admin user.
- A random temporary Tenant Admin password.

Copy the returned Tenant Admin email and temporary password immediately.

The temporary password is returned only by the approval response. If it is lost, use the local password-reset flow or create a new unique test tenant after resetting the database.

Expected credentials:

```text
Email: tenantadmin@frontend-dev.local
Password: <random password shown after approval>
```

## 10. Log in as Tenant Admin

Sign out of the Super Admin account, then sign in with the generated Tenant Admin credentials.

The role router should send the account to:

```text
/tenant/dashboard
```

Verify these implemented routes:

```text
/tenant/dashboard
/tenant/branches
/tenant/people
/tenant/students
/tenant/teachers
/tenant/grades
/tenant/courses
/tenant/timetables
/tenant/fees
```

Some other navigation items still lead to a placeholder because their frontend screens have not been implemented. Follow `TENANT_ADMIN_FRONTEND_API_HANDOFF.md` for the assigned backlog.

### Temporary-password limitation

The current application does not force a first-login password-change screen. For local development, keep the generated password in a local password manager. The forgot/reset-password flow is available, but local OTP delivery uses development behavior and may require checking API logs. Do not implement an insecure browser-only password change.

## 11. Create a Branch Admin and other test users

The onboarding approval already creates `Main Center`. The Tenant Admin may create or edit branches from:

```text
/tenant/branches
```

Create users from:

```text
/tenant/people
```

Recommended order:

1. Create or confirm the test branch.
2. Create a Branch Admin assigned to that branch.
3. Create Teacher, Accountant, Receptionist, and Janitor accounts assigned to the branch.
4. Create Student accounts and select a grade.
5. Use bulk student import only after one manual student workflow succeeds.

Each successful user-creation response returns a temporary password. Copy it once and store it locally. Do not log or commit it.

Test the role handoff by signing out and signing in as the new Branch Admin:

```text
Expected route: /branch/dashboard
```

Then return to the Tenant Admin account to continue Tenant Admin frontend development.

## 12. Recommended daily development flow

At the start of the day:

```powershell
Set-Location .\tution-Management-System
git pull
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps -a
```

Follow API logs while integrating:

```powershell
docker compose --env-file .env.docker logs -f api
```

After code changes, rebuild the affected service:

```powershell
docker compose --env-file .env.docker up --build -d web
```

If API code or Prisma dependencies changed:

```powershell
docker compose --env-file .env.docker up --build -d migrate api web
```

Run frontend checks:

```powershell
npm ci
npm run lint --workspace web
npm run build --workspace web
```

Run the Tenant Admin backend regression suite when an integration workflow changes:

```powershell
npm run test:tenant-admin:integration --workspace @tms/api
```

At the end of the day:

```powershell
docker compose --env-file .env.docker down
```

This stops containers but preserves the database and accounts.

## 13. Database persistence and reset

Normal restart—the data remains:

```powershell
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d
```

Do not run `down -v` during normal work.

Only when the developer intentionally wants to delete every local account, tenant, and record:

```powershell
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build -d
```

After a volume reset, repeat:

1. Super Admin seed.
2. Tenant onboarding request.
3. Super Admin approval.
4. Tenant Admin and test-user provisioning.

## 14. Common problems

### `Platform administration is disabled`

Cause: `PLATFORM_ADMIN_ENABLED` is false in the running API container.

Fix:

```powershell
# Set PLATFORM_ADMIN_ENABLED=true in .env.docker, then:
docker compose --env-file .env.docker up --build -d --force-recreate api web
```

### Super Admin login fails

Rerun the seed with the intended email and password. This rotates the password:

```powershell
docker compose --env-file .env.docker run --rm `
  -e PLATFORM_ADMIN_ENABLED=true `
  -e SEED_ADMIN_EMAIL="dev-superadmin@example.local" `
  -e SEED_ADMIN_PASSWORD="LocalOnly!Change123" `
  -e SEED_ADMIN_2FA=false `
  api npm run db:seed
```

### Onboarding request fails with a duplicate error

Use a unique Tenant Admin email and PAN number, or reuse the already provisioned Tenant Admin account. The database persists between Compose restarts.

### Browser shows old frontend code

```powershell
docker compose --env-file .env.docker up --build -d --force-recreate web
```

Then hard-refresh the browser.

### API returns `401`

The session is missing or expired. Sign in again. API calls must include the Better Auth cookie with `credentials: 'include'`.

### API returns `403`

The signed-in role is not allowed to perform that action. Do not fix this by sending tenant or branch headers.

### API returns `404` for another tenant’s record

This is expected tenant-isolation behavior. The API intentionally hides foreign records.

### API returns `409`

The action is stale, duplicated, or already completed. Show the error and refresh the record.

### API returns `501`

That backend module is intentionally unfinished. Do not add mock success behavior. Record it as a backend dependency.

## 15. Platform Admin safety after provisioning

For normal Tenant Admin-only frontend work, the developer may disable development provisioning after the required local tenant exists:

```env
PLATFORM_ADMIN_ENABLED=false
```

Then recreate the API:

```powershell
docker compose --env-file .env.docker up --build -d --force-recreate api web
```

The existing Tenant Admin continues to work. Only the development Super Admin onboarding surface becomes unavailable.

Re-enable it locally only when another test tenant must be provisioned. It must always remain disabled in production.
