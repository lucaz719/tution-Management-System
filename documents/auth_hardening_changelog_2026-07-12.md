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

## 14. Academic Section — API Integration (2026-07-13)

Wired the tenant dashboard's Academic nav group (Students, Teachers, Timetables, Courses) to real endpoints; these were placeholder routes before.

**Backend** (`services/api/src/routes/courses.ts`):
- `GET /courses` now returns branch name + class/enrollment counts (removed the fake simulation course list).
- `GET /courses/classes` (new) — lists all tenant classes with course/branch names and enrollment/session counts.
- `POST /courses` and `POST /courses/classes` — removed simulation fallbacks; both now validate the target branch/course belongs to the caller's tenant (course/class creation is tenant-scoped; a class inherits its course's branch).

**Frontend** — new `api.academics` client (list/create courses & classes) and four pages built on the shared HR-grade design language:
- `AcademicCourses` — course table (type, branch, monthly fee, tax-exempt, class/enrolment counts) + "Add Course" drawer.
- `AcademicTimetables` — class cards with human-readable schedules + "Add Class" drawer (course picker, day chips, start/end time).
- `AcademicStudents` / `AcademicTeachers` — role-filtered rosters from `/api/users` (`AcademicRoster` shared component).
- Routed under `/tenant/{students,teachers,courses,timetables}`, role-guarded to Tenant Admin.

**Verified end-to-end** as the Sanskardip account: list/create course, list/create class all work; creating a course in another tenant's branch is blocked (404). Seeded Grade 10 Physics (2 classes) + Grade 9 Mathematics so the pages are populated — demo data, removable before handover.

---

## 15. Timetable CRUD, Teacher Assignment & User Profile Cards (2026-07-13)

**Timetable management (full CRUD + assignment):**
- Schema: added `Class.teacherId` (assignable teacher) via migration `add_class_teacher_assignment`.
- `PUT /courses/classes/:id` — rename, reschedule, or (re)assign a teacher; assigning a teacher auto-generates their `TeacherSession` for today when the class is scheduled today (the per-day generation a cron would do), so the teacher portal populates immediately.
- `DELETE /courses/classes/:id` — blocked when students are enrolled (409); otherwise cascades sessions + attendance.
- `GET /courses/classes` now includes the assigned teacher's name.
- Frontend Timetables page: each class card shows its schedule + assigned teacher, with Manage (edit name/days/times/teacher) and Delete actions; assigned/unassigned counts in the stat strip.

**User profile cards (`GET /users/:id/profile`):** role-appropriate overview for any user in the tenant (branch admins limited to their branch's users):
- Student → fee ledger (billed / paid / due), enrolments, attendance breakdown.
- Parent → each child with paid / due / overdue and active class count — the admin↔parent connection.
- Teacher → assigned classes, session totals, pending-update count.
- Staff → designation, contract, joining date.
- Frontend: clicking any row in People, Students, or Teachers opens a `UserProfileDrawer` with these cards.

**Verified end-to-end:** teacher assignment sets the class + generates today's session; rename and delete work; delete is blocked with enrolments. Seeded a parent (Rajesh Koirala) ↔ student (Aarav Koirala) with an enrolment and two invoices (one paid NPR 2,825, one overdue NPR 2,825). Profiles return correctly: student shows billed 5,650 / paid 2,825 / due 2,825 / 1 overdue; parent shows the child with the same paid/due and 1 active class.

---

## 16. Nepali (Bikram Sambat) Billing (2026-07-13)

Monthly billing now aligns to the Nepali calendar, so parents and admins are billed per BS month (e.g. Asar 2083), not Gregorian.

- Installed `nepali-date-library` (v1.1.14, zero deps, TS types) in `services/api` and `apps/web`.
- **Gotcha:** the package's CommonJS build is broken (empty exports); only its ESM build works. The web app (webpack/ESM) imports it directly. The API compiles to CommonJS, so `utils/nepali.ts` loads the ESM build via a `Function`-wrapped dynamic import (which TypeScript does not downlevel to `require`) and caches it.
- **Backend** (`utils/nepali.ts`): `getBillingPeriod(ref, graceDays)` returns the BS month containing `ref` with its AD boundaries + due date; `formatBsDate()` for labels. Wired into `POST /courses/enroll` — invoices now use BS-month-aligned `billingCycleStart/End` and a due date `graceDays` after cycle start. New `GET /finances/billing-period` returns the current BS period.
- **Frontend** (`utils/nepaliDate.ts`): `toBsLabel` / `toBsMonthLabel`. Student profile invoice ledger shows due dates in BS ("Due Asar 25, 2083 BS"); tenant dashboard P&L card shows a "Billing: Asar 2083 BS" badge.
- **Also fixed** (surfaced once BS wiring removed the mask): the enroll endpoint still had simulation fallbacks that swallowed the real error when `studentId` was a User id instead of a Student id — an invoice FK violation was silently faked. Removed all three sims and added tenant-ownership checks for course/student/class; the endpoint now fails honestly (404) on a bad id.
- **Verified:** `GET /finances/billing-period` → "Asar 2083 (32 days), AD 2026-06-15→2026-07-16, due 2026-06-25". A real enrollment created a persisted invoice (NPR 2,486 = 2,200 + 13% VAT) with those exact BS-aligned AD dates. Both typecheck; web production build bundles the ESM library cleanly.

> Contract note surfaced: `/courses/enroll` expects the **Student record id**, not the user id — the future Fee & Billing UI must map user→student.

---

## 17. Bulk Student Import via Excel (2026-07-13)

Institutions can prepare a spreadsheet matching the schema and import students in bulk.

- Installed `exceljs` in `apps/web` (client-side template generation + parsing; no server multipart needed).
- **Template** (`BulkStudentImport.tsx` → "Download Excel Template"): a branded `.xlsx` with the exact columns — First/Last Name, Email, Phone, Branch, Emergency Contact, and optional Parent First/Last Name, Parent Email, Parent Phone — plus an example row and a second sheet listing the tenant's valid branch names.
- **Upload flow**: parses the uploaded `.xlsx` in the browser (header-name mapped, so column order is flexible), shows a preview table, then POSTs JSON rows to the backend. Results view shows each student's generated temp password (with a "Download Credentials" CSV) and per-row errors.
- **Backend** `POST /api/users/bulk-students`: tenant/branch-admin scoped, max 500 rows. Per row: validates, resolves branch by name (defaults to the sole branch), creates the student (+ Student record), and when a Parent Email is present, creates-or-links a parent account. Independent per-row results — one bad row never rolls back the good ones; catches missing fields, unknown/out-of-scope branch, existing email, in-file duplicates.
- Wired a "Bulk Import" button into the People directory.
- **Verified** with a 6-row batch: 3 created (one with an auto-created + linked parent, confirmed via the parent's profile showing the child), 3 correctly skipped (unknown branch, missing name, in-file duplicate). Test rows removed afterward.

---

## 18. Fee & Billing Module + Overdue Flagging (2026-07-13)

Wired the previously-placeholder Finance section and surfaced fee status in the student roster so overdue students are visible without opening each profile.

**Backend** (`finances.ts`): overdue = explicitly OVERDUE or unpaid past due date.
- `GET /finances/overview` — collected, outstanding, overdue amount, overdue student count, invoice count, current BS period.
- `GET /finances/students` — per-student fee summary (billed/paid/due/overdue), branch-scoped for branch admins, sorted by dues owed.
- `GET /finances/students/:id/invoices` — a student's invoice ledger.
- `POST /finances/invoices/:id/pay` — record a cash/bank payment (marks PAID, sets paymentDate/transactionId); rejects double-payment (400).
- `POST /finances/generate-invoices` — monthly billing run: one BS-month invoice per active student (summing their active enrolments' fees), deduped by (student, cycle start) so re-running is idempotent.

**Frontend:**
- **Students roster** now shows a Fees column (Overdue NPR x / Due NPR x / Cleared), a "Fee Overdue" count stat, and an "Overdue only" filter — the effective flagging requested.
- **New Fee & Billing page** (`/tenant/fees`): overview KPIs, a student fee table sorted by dues with a Collect/View action, a payment drawer listing invoices (BS due dates) with per-invoice "Mark Paid", and a "Generate [BS month] Invoices" button.
- Dashboard's Overdue Fees KPI and the "Fee" action-queue alert now deep-link to `/tenant/fees`.

**Verified:** overview + per-student flagging (Aarav flagged NPR 5,311 overdue across 2 invoices, sorted top); recording a payment moved collected 2,825→5,650 and reduced outstanding; double-pay blocked (400); billing run deduped correctly (0 created / 1 skipped on re-run).

---

## 19. Grade Levels (UKG–Class 12) + CRUD (2026-07-13)

Students can now be assigned a grade level, and the grade list is fully manageable. Note: modelled as a new `Grade` entity (grade *level*) distinct from the existing `Class` model (a course's timetable section) to avoid terminology collision.

**Backend:**
- Schema: new `Grade` model (`tenantId`, `name`, `sortOrder`, unique per tenant) + `Student.gradeId` (migration `add_grades`).
- `routes/grades.ts`: list, create, rename/reorder (PUT), delete, and `POST /grades/seed-defaults` (idempotent — seeds Nursery, LKG, UKG, Class 1–12). Delete is blocked (409) when students are assigned. All gated by `manage_students`.
- Student creation (`POST /users`) and bulk import both accept a grade (by id / by name); the profile endpoint returns the student's grade.

**Frontend:**
- New **Grades** page under Academic (`/tenant/grades`): "Add Standard Grades" one-click seed, inline add/rename/delete, per-grade student counts.
- **Add Person** drawer shows a Grade dropdown when the role is Student.
- **Bulk import** template gains a Grade column, with valid grade names listed on the reference sheet; unknown grades are reported per-row.
- Student's grade shows as a tag on their profile card.

**Verified:** seed produced the 15-grade ladder; a student created with Class 10 shows "Class 10" on their profile and bumps that grade's student count; deleting an in-use grade is blocked (409); rename works. (Sanskardip's grades were already seeded via the seed script, so seed-defaults added 0.)

---

## 20. Grades as a First-Class Link Across Courses, Teachers & Students (2026-07-13)

Made grade a real cross-cutting dimension rather than a student label. Engineering note: the key link is **Course → Grade**; teachers-per-grade is *derived* (course → class → assigned teacher) rather than a redundant join table — one source of truth, no denormalization.

**Backend:**
- Schema: `Course.gradeId` (optional FK) via migration `link_course_to_grade`.
- `POST /courses` accepts + validates `gradeId`; `GET /courses` returns `gradeName`.
- `GET /grades` now includes `courseCount`.
- New `GET /grades/:id` — the aggregation endpoint: the grade's students, its courses (with class/enrolment counts), and the distinct teachers who teach those courses' classes.
- Teacher profile (`/users/:id/profile`) now returns `gradesTaught` (distinct, ladder-ordered) and each assigned class's `gradeName`.

**Frontend:**
- Courses: grade selector in the create drawer + a Grade column in the table.
- Grades page: a Courses count column, and clicking a grade opens a detail drawer showing its courses, teachers, and students.
- Teacher profile card shows the grades they teach; student profile already shows their grade.

**Verified end-to-end:** created a course linked to Class 10 (list shows the grade); after linking Grade 10 Physics → Class 10 and a student → Class 10, `GET /grades/:id` returned students=1, courses=2, teachers=1 (Bishnu, derived from his class assignment), and Bishnu's profile listed "Class 10" under gradesTaught. Both sides typecheck; production build clean.

---

## 21. Grade Filter on Roster + Enrollment Grade Guard (2026-07-13)

- **Students roster:** `GET /users` now returns each student's `gradeId`/`gradeName`. The Students roster shows a Grade column and a **grade filter** ("show all Class 10 students", plus a "No grade set" option to catch unassigned students).
- **Enrollment grade guard:** `POST /courses/enroll` now rejects (400) enrolling a student into a course whose grade differs from the student's — with a clear message ("This course is for Class 9, but the student is in Class 10"). A graded course only accepts matching-grade students; ungraded courses or ungraded students are unaffected. Also added a check that the chosen class actually belongs to the course.
- **Verified:** roster carries grades (Class 12 / Class 10 / none); a Class-10 student blocked from a Class-9 course (400); matching/ungraded enrolments still pass.

---

## 22. Course CRUD + Grade Auto-Propagation to Timetables (2026-07-13)

- **Course update/delete** (was create-only): `PUT /courses/:id` (name, description, type, fee, tax, grade — validated/clearable) and `DELETE /courses/:id` (409 when the course has classes or enrolments). Courses page gained Edit (reuses the drawer; branch locked on edit) and Delete actions.
- **Grade flows to timetables:** `GET /courses/classes` returns the course-derived `gradeName`; the Add Class course picker shows each course's grade and auto-displays "Grade auto-set from course: Class X"; class cards badge the grade. A class inherits its grade through its course — nothing extra to keep in sync.
- **Verified:** rename + grade-clear via PUT; delete blocked (409) on an in-use course; empty course deleted; classes carry the derived grade.

---

## 23. User (Student/Teacher) Update/Deactivate + Unenroll (2026-07-13)

Filled the missing U/D on users, and added the unenroll path that course deletion needs.
- `PUT /users/:id` — edit firstName/lastName/phone/status + gradeId (students); tenant/branch scoped.
- `DELETE /users/:id` — **soft-delete** (status INACTIVE) and drops the student's active enrolments; preserves invoices/history for audit; can't deactivate your own account (400).
- `DELETE /courses/enrollments/:id` — unenroll a student (removes the enrolment row) so an over-enrolled course can then be deleted. Profile now returns enrolment ids.
- **UI:** the profile drawer gained Edit (inline name/phone/grade), Deactivate/Reactivate, and a per-enrolment unenroll (person_remove); lists refresh via a new `onChanged` callback.
- **Verified:** edit phone; unenroll all → course enrolled=0 (then blocked only by "delete its classes first" — correct cascade); self-deactivate blocked (400); deactivate→reactivate round-trip.

---

## 24. Grade Promotion → Billing Reconciliation (2026-07-13)

Promoting a student (e.g. Class 9 → Class 10) now keeps billing correct, because the monthly amount is derived from active enrolments.
- `PUT /users/:id`: when a student's grade changes, active enrolments in courses tied to a *different graded* level are auto-set to COMPLETED (ungraded/generic courses untouched). Response returns `droppedEnrollments`. The admin then enrols in the new grade's courses, which sets the new monthly amount.
- Profile now returns `monthlyFee` (sum of active enrolments' net course fees, tax-aware) and shows it as "Recurring monthly fee NPR x/mo" — so the change is visible.
- Edit toast surfaces the reconciliation ("Grade updated — N old-grade enrolments completed…").
- **Verified:** Class 9 student with a Grade-9 course showed 2,486/mo; promoting to Class 10 completed that enrolment (`droppedEnrollments=1`) and the monthly fee dropped to 0, ready for new-grade enrolment.

Design note: billing is never a stored number — it's always the live sum of active enrolments, so it stays correct through promotions, unenrolments, and fee edits without any denormalized field to sync. Future promotions/transfers reuse this same path.

---

## 25. Student Analytics (KPIs + Knowledge Graph) (2026-07-13)

Per-student analytics — the parent-facing selling point.
- `GET /users/:id/analytics`: computes attendance (present/absent/excused + rate), homework (assigned/submitted/graded/pending + completion %), fees (paid/due/overdue + collection %), active courses, and a connections map (grade, courses, teachers, parents) for the graph. **Access: tenant admin (all), branch admin (scoped), the assigned teacher, a linked parent, or the student themselves** — so the same endpoint serves admin, teacher, and the future parent portal.
- Frontend `StudentAnalytics` drawer: KPI tiles with progress rings, an attendance breakdown bar chart, and a toggle-able **radial knowledge graph** (student at centre → grade/courses/teachers/parents). Opened via an **Analytics** button on any student's profile card.
- Empty states are honest (attendance/homework show "No data" until those records exist).
- **Verified:** endpoint returns structured KPIs (fees 100% collected, parent connection present); both sides typecheck.

Note: attendance & homework will populate once those flows record data (student-attendance marking exists; homework is Phase-2). The KPI/graph framework is data-driven and fills in automatically.

---

## 26. Fee Model Reframe: Grade Tuition + Extra Activities (2026-07-13)

Corrected the billing model to match the business: **grade = monthly tuition covering all subjects; courses = opt-in extra activities (Drum Class, etc.) with their own fees.**
- `Grade.monthlyFee` added (migration `grade_monthly_fee`); editable on the Grades page (new "Monthly Tuition" column, inline edit).
- **Monthly bill = grade tuition + active extra-activity enrolments.** Both the `generate-invoices` run and the profile's live `monthlyFee` now sum grade base + extras. Profile shows the breakdown (tuition line + extras line).
- **Enrolment no longer creates an invoice** (that double-billed against the monthly run and was the source of the intermittent enroll 500). `POST /courses/enroll` now just creates the enrolment and returns `monthlyDelta`; billing is the monthly run only. Also added a duplicate-active-enrolment guard (409).
- **New enrol UI:** the student profile has an "Enroll" action listing ungraded courses (extra activities) + their class/time; enrolling shows the monthly delta. Grade tuition breakdown is shown in the fee card.
- **Verified:** Class 10 tuition 3,500 → Aarav's monthly fee 3,500 (tuition only); enrolling in Drum Class (ungraded, +1,000) → monthly fee 4,500, no invoice/500. Enroll endpoint healthy.

---

## 27. Remaining Work

| Item | Status |
|---|---|
| OTP delivery | Console transport in dev (no domain/SMTP yet). Plan: Mailtrap for staging → verified single-sender (Brevo/SendGrid/Resend) or SMS (Sparrow SMS) for production; TOTP needs no delivery channel at all. Only `src/utils/delivery.ts` changes. |
| Better Auth migration | Blueprint only (`betterauth_audit_report.md`); `better-auth` is **not** installed or imported anywhere yet |
| 2FA token gating | Login still issues the JWT before 2FA verification; the dashboard is gated client-side. A stricter design (provisional token until 2FA passes) is a natural follow-up or comes free with Better Auth. |
| Session revocation / HttpOnly cookies | Unresolved (tracked in the Better Auth audit) |
| Rate limiter store | In-memory (single process). Move to Redis/shared store before running multiple API instances. |
