# Auth Hardening & Local Environment Bootstrap — Work Log

**Project:** Tuition Management System (TMS) Monorepo
**Date:** July 12, 2026
**Scope:** Removal of hardcoded credentials, real API-backed authentication, database bootstrap
**Related:** Follows up on findings in `betterauth_audit_report.md`

---

## 1. Summary

This session removed every hardcoded credential, mock account, and fixed verification code from the web client, hardened the API's JWT secret handling, fixed the tenant chicken-and-egg problem at login, and stood up a real local PostgreSQL environment with a seeded Super Admin — making the app testable end-to-end against the real backend for the first time.

Before this work, **every successful login ever observed was the frontend mock fallback**: the machine had no PostgreSQL installed, so the API could never authenticate anyone.

---

## 2. Change 1 — Removed the Frontend Mock Authentication Layer

### `apps/web/src/features/auth/service.ts` (rewritten)
- Deleted all 9 hardcoded mock accounts (`superadmin@tms.edu.np`, `admin@pinnacle.edu.np`, etc.) together with their plaintext passwords.
- Deleted `FIXED_DEMO_CODE = '123456'` (the universal OTP/2FA bypass code).
- Deleted the silent fallback in `authenticateUser()` that faked a successful login whenever the API call failed. Login now surfaces a real error instead.
- On module load, the service deletes the legacy `tms_mock_accounts` / `tms_two_factor_challenge` localStorage keys left in browsers by earlier builds.
- User normalization now understands the actual backend payload: `firstName`/`lastName`, and `roles[].roleName` values like `'Super Admin'` → `SUPER_ADMIN`. An unrecognized role **fails login** instead of silently defaulting to `PARENT`.
- Password-reset and 2FA functions now call real API endpoints. The client keeps only a UI-gating record of a server-verified reset token; the server re-validates on submission.

### `apps/web/src/services/api.ts`
- Added endpoint calls: `/auth/forgot-password`, `/auth/verify-reset-otp`, `/auth/reset-password`, `/auth/2fa/request`, `/auth/2fa/verify`.
- `login()` no longer unconditionally writes the token to localStorage — `AuthContext` owns persistence and honours the "Remember Me" choice, so non-remembered sessions no longer leak into persistent storage.
- `getTenantId()` now also checks sessionStorage, matching how sessions are scoped.

### Consumer updates
- `context/AuthContext.tsx` — 2FA challenges are requested from the server after login; local challenge bookkeeping removed.
- `pages/auth/ForgotPasswordPage.tsx` — removed the client-side "is this email registered" check against the mock directory; the server decides.
- `pages/auth/TwoFactorPage.tsx` — verifies codes server-side (`verifyTwoFactorChallenge(email, code)`), shows a masked email instead of a mock phone hint, and reports resend failures via toast.

> **Note:** The recovery/2FA screens now call backend endpoints that do not exist yet (see §7). Until those land, they show an error notification instead of faking success — intended behavior.

---

## 3. Change 2 — JWT Secret Fail-Fast

- Removed the hardcoded fallback secret `'tms_default_secret_jwt_2026'` from:
  - `services/api/src/routes/auth.ts`
  - `services/api/src/middleware/auth.ts`
  - `services/api/src/test-tms.ts`
- New `services/api/src/utils/env.ts` throws at startup if `JWT_SECRET` is unset — the API refuses to run with no secret.
- `dotenv` was a declared dependency but **never imported**; `import 'dotenv/config'` is now loaded in `server.ts` and `utils/env.ts`.
- Created `services/api/.env` (gitignored) holding `DATABASE_URL` and a freshly generated 384-bit random `JWT_SECRET`, plus a committed `services/api/.env.example` template.

---

## 4. Login Tenant Chicken-and-Egg Fix

**Problem:** `/api/auth/login` sat behind `tenantMiddleware`, which required an `x-tenant-id` header — but a fresh browser cannot know its tenant before logging in.

**Fix:**
- `middleware/tenant.ts`: `/api/auth` added to the bypass paths.
- `routes/auth.ts`: since `User.email` is globally unique, the tenant scope is derived from the user record itself. Login input is normalized (trim + lowercase) and the response now includes `tenantId` at the top level, which the frontend stores for subsequent `X-Tenant-Id` headers.

---

## 5. Database Seed Script (no credentials in code)

New `services/api/prisma/seed.ts` (`npm run db:seed`, also auto-runs after `prisma migrate dev`):

- Idempotently creates the **TMS Platform** system tenant (reserved PAN `000000000`), the global **Super Admin** role (`tenantId: null`), and one admin account (default `superadmin@tms.local`, override with `SEED_ADMIN_EMAIL`).
- Password policy: uses `SEED_ADMIN_PASSWORD` from the environment if set; otherwise generates a cryptographically random password and prints it **once** to the console. Re-running with `SEED_ADMIN_PASSWORD` set rotates an existing account's password.
- No password or secret ever appears in committed code.

---

## 6. Local Environment Bootstrap (performed this session)

1. Discovered the machine had **no PostgreSQL, no Docker, no psql** — confirming the API had never authenticated anyone.
2. Installed **PostgreSQL 16.14** via winget (`postgresql-x64-16` service, port 5432). The PG17 mirror returned HTTP 403; PG16 installed cleanly.
3. Created the `tms` database and ran `npx prisma migrate dev --name init` — full schema applied.
4. Seeded the Super Admin and rotated its password via `SEED_ADMIN_PASSWORD` (credentials communicated privately; not recorded here).
5. Verified end-to-end over HTTP: correct credentials → JWT + `tenantId` + `Super Admin` role → frontend routes to `/super-admin/dashboard`; wrong password → `401 Invalid credentials`.

### Runbook (fresh machine)
```bash
cd services/api
cp .env.example .env        # set DATABASE_URL and a random JWT_SECRET
npx prisma migrate dev      # creates schema, auto-runs seed
npm run db:seed             # idempotent; prints generated admin password once
npm run dev                 # API on :3001
# then: apps/web → npm run dev → sign in at /login
```

---

## 7. Housekeeping — Vite Scaffold Leftovers

The web app is pure **React 19 + TypeScript + webpack 5** (no Vite dependency exists). Removed dead scaffold remnants:
- `apps/web/src/assets/vite.svg` (unreferenced)
- `apps/web/src/App.css` (unimported `.vite` logo styles)
- `apps/web/README.md` rewritten to describe the real webpack toolchain.

---

## 8. Change 3 — Server-Side OTP & 2FA Endpoints (completed 2026-07-12, same session)

All five endpoints the frontend was already calling are now implemented in `services/api/src/routes/auth.ts`:

| Endpoint | Behavior |
|---|---|
| `POST /auth/forgot-password` | Issues a crypto-random 6-digit OTP (5 min TTL). Always answers `{success:true}` so registered emails cannot be enumerated. |
| `POST /auth/verify-reset-otp` | Validates the OTP (hashed compare, max 5 attempts per code) and returns a single-use 256-bit reset token (15 min TTL). |
| `POST /auth/reset-password` | Enforces the password policy server-side, bcrypt-hashes the new password, consumes the token, and invalidates all outstanding codes for the account. |
| `POST /auth/2fa/request` | Issues a 2FA code only for active accounts with `twoFactorEnabled`; generic success otherwise. |
| `POST /auth/2fa/verify` | Validates the code; single-use, attempt-capped, expiring. |

Supporting pieces:
- **`VerificationCode` table** (Prisma migration `add_verification_codes_and_2fa_flag`) — codes stored as SHA-256 hashes with expiry, attempt counter, and consumption timestamp; issuing a new code invalidates the previous one.
- **`User.twoFactorEnabled`** flag — login now returns `requiresTwoFactor` from the database, activating the previously dormant frontend 2FA path. Toggle for the seed admin with `SEED_ADMIN_2FA=true|false npm run db:seed`.
- **Rate limiting** — fixed-window in-memory limiter (`src/utils/otp.ts`), 5 requests per 15 min per endpoint+email+IP; swap for Redis when multi-instance.
- **Delivery transport** (`src/utils/delivery.ts`) — codes are printed to the API console in dev (`[otp] ...`). When SMTP/SMS exists, only this one function changes.

### Verified end-to-end (HTTP, 2026-07-12)
- Forgot-password: real account gets a console code; unknown email gets identical success with **no** code issued.
- Wrong OTP → 401; correct OTP → reset token; weak password → 400; valid reset → old password rejected (401), new password logs in.
- Used/bogus reset token → 410 (no replay).
- 2FA: login returns `requiresTwoFactor:true` when enabled; wrong code → 401; correct code → success; code reuse → 401.
- Rate limiter: 5th+ rapid forgot-password request within the window → 429.

---

## 9. White-Label Deployment for Sanskardip Shikshalaya (2026-07-13)

This deployment is licensed **exclusively** to [Sanskardip Shikshalaya](https://sanskardipshikshalaya.com.np/). The vendor retains Super Admin; the client gets one tenant and manages growth through branches.

- **Super Admin workspace built** (`/super-admin/dashboard`, `/super-admin/tenants`): sidebar navigation, KPI row, onboarding request queue with Approve/Reject, provisioning modal that shows the tenant admin's one-time temporary password, and a tenant registry table. Routes are now role-guarded (`SUPER_ADMIN` only). New API endpoints: `POST /api/onboarding/reject/:id`, `GET /api/onboarding/tenants`.
- **White-label license cap**: `WHITE_LABEL_TENANT_LIMIT=1` in `services/api/.env`. The approve endpoint refuses (HTTP 403) to provision beyond the licensed number of client tenants; internal tenants (platform PAN `000000000`, demo PAN `111111111`) are excluded from the count. Verified live: second-tenant approval blocked with the license message.
- **Branch management** so the client scales via branches, not tenants: new `services/api/src/routes/branches.ts` (`GET/POST /api/branches`, `PUT /api/branches/:id`, tenant-scoped, `manage_branches` permission) and a full Branch Network page at `/tenant/branches` (list, create, edit — geofence lat/lng/radius and attendance grace per branch).
- **Sanskardip tenant provisioned** through the real onboarding flow: tenant *Sanskardip Shikshalaya*, branch *Damak Main Center* (Devkota Chowk, NIC Asia Bank Building, Damak-6, Jhapa; geofence 26.6586, 87.7025), tenant admin `sanskardipoffice@gmail.com` (temporary password communicated privately; PAN is a placeholder `999999999` until the client provides the real 9-digit PAN/VAT).
- `nodemon` now watches `.env` (`nodemonConfig` in `services/api/package.json`) so env changes apply on save.

---

## 10. Tenant Workspace Refinement & Cross-Tenant Leak Fix (2026-07-13)

Made the Tenant Admin (Sanskardip) surface real, and fixed a serious isolation bug found while verifying it.

**Security fix — cross-tenant data leak (high severity):** `/api/onboarding/*` bypasses the tenant middleware, so `req.tenantId` was `undefined` on `/api/onboarding/dashboard`. Prisma treats `where: { tenantId: undefined }` as *no filter*, so any tenant admin calling that endpoint received counts and branch lists **across all tenants**. Fixed in `middleware/auth.ts` by making the JWT tenant claim authoritative (audit report §3 recommendation): non-super-admin users always operate in their token's tenant regardless of the `X-Tenant-Id` header (spoof-proof); Super Admin may target another tenant via the header for inspection. Verified: tenant with a forged header still only sees its own data; Super Admin inspection works.

**Backend:**
- `Tenant` gained real policy columns (`vatRate`, `gracePeriodMinutes`, `pettyCashCapNpr`) via migration `add_tenant_policy_config`; new `GET/PUT /api/finances/config` (PUT requires `manage_billing`, validated ranges). Previously the dashboard's settings card saved to endpoints that did not exist.
- `/api/finances/pl` now returns the flat shape the dashboard consumes plus dynamic month, and its fake fallback numbers (NPR 250k revenue etc. on DB error) were removed — errors surface honestly.
- `/api/onboarding/dashboard` computes a real per-branch summary (students/staff via `UserRole.branchId`) instead of a hardcoded "Baneshwor Center", and no longer fabricates counts on DB errors.
- Removed the remaining "simulation mode" fake-success fallbacks in onboarding (submit/list/approve); duplicate PAN on approve now returns 409.
- Added `GET /api/finances/petty-cash` (tenant-scoped list); web client's petty-cash approve now targets the real `approve-l1`/`approve-l2` routes.

**Frontend (`TenantAdminDashboard.tsx` rewritten):**
- Removed all hardcoded mock data (fake 1,248 students, Damak/Birtamod/Charali collection bars, canned alerts) and the mock fallback on API failure.
- Removed the onboarding-requests card (Super-Admin-only endpoint — returned 403 for tenant admins).
- Now driven entirely by real endpoints: KPI row (students, teachers, overdue NPR, pending leaves), live branch network summary, derived action queue, real P&L, and working policy settings (load + save verified end-to-end as the Sanskardip account).

---

## 11. Secured User Provisioning Hierarchy & Isolation Hardening (2026-07-13)

Built the core access model: **Tenant Admin → branches → Branch Admin (manager) per branch → teachers/students scoped to that branch.** Previously no user-creation path existed beyond the tenant admin.

**New role catalogue** (`services/api/src/utils/roles.ts`): single source of truth mapping each role to its permission set, plus `ensureTenantRole()` (find-or-create per tenant — role rows are tenant-scoped so they can't be cross-referenced) and the allow-lists of who may create whom.

**New provisioning API** (`services/api/src/routes/users.ts`):
- `POST /api/users/branch-admin` — Tenant-Admin-only; creates a branch manager bound to one branch.
- `POST /api/users` — creates staff/students; Tenant Admin for any branch in the tenant, Branch Admin only for branches they manage. Cannot create Branch Admins or escalate.
- `GET /api/users` — directory; Tenant Admin sees all tenant users, Branch Admin sees only their branch's users.
- Every creation generates a temp password (returned once), creates the matching `StaffRecord`/`Student`/`Parent` domain record in a transaction, and enforces email uniqueness (409 on conflict).

**Authorization is explicit**, not delegated to the generic `hasPermission`: dedicated `isTenantAdmin()` / `branchAdminScopes()` checks, and every target branch is validated against `req.tenantId` (the authoritative JWT claim) via `resolveBranchInTenant()`.

**Additional leak fixes** in `hr.ts` (same undefined-scope class as §10): `GET /hr/documents/alerts` now filters `staffDocument` by tenant (was returning every tenant's expiring documents); `POST /hr/documents` verifies the staff record belongs to the caller's tenant before writing. Removed the simulation-mode fallbacks there too.

**Verified end-to-end (11 live scenarios):** tenant admin creates a Damak manager → manager logs in → manager creates teacher + student in Damak (with domain records) → manager blocked (403) from creating another Branch Admin, from role-escalating via the `role` field, from creating in the demo tenant's branch (404), from the same attack with a spoofed `X-Tenant-Id` header (404, JWT wins), and from creating in a *sibling* branch of its own tenant (403). Directory isolation confirmed: manager sees only Damak users, tenant admin sees all. Test artifacts were removed afterward — Sanskardip's tenant is back to just the office admin + Damak.

---

## 12. People Management UI (HR-grade) (2026-07-13)

Built the browser UI for the provisioning hierarchy from §11 — a "Staff & Students" directory shared by Tenant Admin (`/tenant/people`) and Branch Admin (`/branch/people`), self-configuring by role.

- **New capabilities endpoint** `GET /api/users/me` returns `isTenantAdmin`, `creatableRoles`, and `manageableBranches` so the page renders the correct roles/branches for whoever is signed in (tenant admin sees all branches + Branch Admin role; branch manager sees only their branch + branch-level roles).
- **New page** `apps/web/src/pages/PeopleDirectory.tsx`: stat strip (total / managers / teachers / students / support staff), search + role + branch filters, a proper data table (avatar initials, name/email, role tag, branch, status, added date), a right-side slide-over "Add Person" drawer (role chips, name/email/phone, branch — locked when only one), and a one-time credentials modal with copy button showing the generated temp password.
- **Design**: dedicated HR-grade CSS section in `index.css` built entirely on the locked StyleSeed tokens (Fraunces/Roboto, blue/gold palette, silk easing), high-contrast text, full light/dark theme support, responsive (drawer goes full-width, field rows stack on mobile).
- Wired into both dashboards' sidebars; routes are role-guarded via the existing `RequireRole`.
- Verified end-to-end against the live API as the Sanskardip account: capabilities, both create paths, and the directory listing all work. Two flagged test rows (`ui.manager@` / `ui.teacher@sanskardip.local`) were left in Damak for visual demo — remove before handover.

---

## 13. Teacher Portal — Real Logic Wiring (2026-07-13)

Replaced the fully-mocked Teacher portal with live, backend-driven logic and fixed the bugs that would have made it non-functional.

**Bugs fixed:**
- **Permission mismatch:** attendance routes require `mark_geo_attendance` but the Teacher role only had `mark_attendance` — teachers would have been 403'd from marking in. Added `mark_geo_attendance` to the Teacher role catalogue, and made `ensureTenantRole()` re-sync permissions on every call so existing role rows aren't left stale.
- **Wrong API paths/bodies:** the web client called `/attendance/mark-in|mark-out` (don't exist; real routes are `/attendance/in|out`) and omitted the required `branchId` + `gpsAccuracy`; daily summary posted to a nonexistent `/courses/lesson-update`. All corrected.

**New backend** (`services/api/src/routes/teacher.ts`):
- `GET /teacher/dashboard` — consolidated real data: today's sessions (class + course), the pending daily-update gate (sessions with `dailyUpdateSubmitted=false`), current attendance state (from today's stamps), and the branch geofence needed to mark in.
- `POST /teacher/session/:id/update` — ownership-checked; submitting a summary sets `dailyUpdateSubmitted=true` / `PRESENT_CONFIRMED`, clearing it from the gate.

**Frontend** (`TeacherPortal.tsx` rewritten): all mock arrays removed. "My Classes Today" and "Pending Daily Update Log" are live; each pending item has an inline update form. Mark In/Out uses the browser's real geolocation and posts to the geofenced endpoint. Homework card is an honest Phase-2 placeholder; parent chat is real.

**Verified end-to-end** as the Sanskardip teacher: pending gate blocks mark-in (403) → submitting both updates clears the gate → mark-in at branch coords succeeds (0m) → a distant coordinate is rejected as a geofence violation → checked-in state tracks correctly. Seeded a Grade 10 Physics course + two classes + today's sessions in Damak so the portal is populated (reset to a clean "2 pending / not marked in" starting state).

> Browser note: mark-in uses the device's actual GPS, so it will report a geofence violation unless you're physically at Damak (26.6586, 87.7025) — that's the security working as designed. The pending-gate and update-submission flows are fully testable from any location.

---

## 14. Remaining Work

| Item | Status |
|---|---|
| OTP delivery | Console transport in dev (no domain/SMTP yet). Plan: Mailtrap for staging → verified single-sender (Brevo/SendGrid/Resend) or SMS (Sparrow SMS) for production; TOTP needs no delivery channel at all. Only `src/utils/delivery.ts` changes. |
| Better Auth migration | Blueprint only (`betterauth_audit_report.md`); `better-auth` is **not** installed or imported anywhere yet |
| 2FA token gating | Login still issues the JWT before 2FA verification; the dashboard is gated client-side. A stricter design (provisional token until 2FA passes) is a natural follow-up or comes free with Better Auth. |
| Session revocation / HttpOnly cookies | Unresolved (tracked in the Better Auth audit) |
| Rate limiter store | In-memory (single process). Move to Redis/shared store before running multiple API instances. |
