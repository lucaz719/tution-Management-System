# TMS UI/UX Implementation Plan
**Tuition Management System — Phase 1 Frontend**
*Based on TMS UI PRD v2.0 · Lucaz Soft Pvt. Ltd. · 7 July 2026*

---

## Project Context

Multi-tenant, multi-branch tuition management platform. Backend (all 3 phases) is **complete** in `services/`. This plan covers the **frontend only**: React web (`apps/web`) and Flutter mobile (`apps/mobile`).

### Monorepo Structure
```
tms-monorepo/
├── apps/
│   ├── web/          ← React 19 + TypeScript + Webpack (exists, partial)
│   └── mobile/       ← Flutter (to be scaffolded)
├── packages/
│   ├── types/        ← Shared TypeScript types
│   └── ui-login/     ← Login UI package (exists, partial)
└── services/         ← Backend (complete)
```

---

## Design System Tokens

### Brand Colors (PRD §5.1)
| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#0F4C8A` | Sidebar bg, page headings |
| `--color-primary-light` | `#1B5FA7` | Secondary buttons, links, focus |
| `--color-accent` | `#F39C12` | Primary CTA, KPI icons |
| `--color-accent-hover` | `#F7B733` | Button hover, decorative accents |
| `--color-bg` | `#FFFFFF` | Page/card backgrounds |
| `--color-surface` | `#F5F7FA` | Section bg, table zebra rows |
| `--color-text` | `#2C3E50` | Body text, headings |

> **Note:** STYLESEED.md locks `#24389c` accent with Outfit font. The PRD client-approved palette takes precedence. STYLESEED should be updated to match PRD values.

### Status Colors (PRD §5.2)
| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#2E9E5B` | Paid, confirmed, approved |
| `--color-warning` | `#E08E00` | Pending, grace-period |
| `--color-error` | `#D64545` | Invalid, blocked, failed |
| `--color-info` | `#1B5FA7` | Informational badges |

### Typography (PRD §5.3)
- **Fraunces** (Display, serif) — Hero headlines, page titles, KPI numerics
- **Roboto** — All UI text, labels, body, buttons

### Spacing Scale (PRD §5.4)
`4px · 8–10px · 14–18px · 18–22px · 26–30px · 44–56px`

### Radius & Elevation (PRD §5.5)
| Surface | Radius | Shadow |
|---|---|---|
| Buttons/Inputs | 7–8px | None at rest; gold glow on primary |
| Cards/Widgets | 10–14px | `0 10px 28px -14px rgba(15,76,138,0.18)` |
| Modals | 14–20px | `0 12px 32px -12px rgba(15,76,138,0.22)` |
| Pills/Badges | 20px (full) | None — flat fill |

### Responsive Breakpoints (PRD §5.6)
| Name | Width | Behavior |
|---|---|---|
| xs Mobile | 0–599px | Single col, temp drawer, bottom nav |
| sm Tablet Portrait | 600–959px | Single/two col, temp drawer |
| md Tablet Landscape | 960–1279px | Two col, temp drawer |
| lg Desktop | 1280–1919px | Full layout, persistent collapsible sidebar |
| xl Wide Desktop | 1920px+ | Full layout, wider content area |

---

## Module 01 — Authentication & Onboarding (Web + Mobile)

### Screens
| ID | Screen | Layout | Roles |
|---|---|---|---|
| 01.1 | Login | Split-screen (desktop), single col (mobile) | All |
| 01.2 | Forgot Password + OTP | Centered card | All |
| 01.3 | Reset Password | Centered card | All |
| 01.6 | Two-Factor Auth | Centered card | Super/Tenant Admin (mandatory), Branch Admin (optional) |

### Login Page (01.1)
- **Left panel**: Deep Academic Blue gradient, brand storytelling, institutional seal motif, feature bullets
- **Right panel**: White, sign-in form
- Collapses to single column below 980px (mobile: full-screen form)
- Components: EmailInput, PasswordInput (show/hide toggle), RememberMe checkbox, ForgotPasswordLink, SignInButton (Golden Orange), ErrorSnackbar (4s), AccountLockDialog
- **Post-login redirect by role**:
  - Super Admin → `/super-admin/dashboard`
  - Tenant Admin → `/tenant/dashboard`
  - Branch Admin → `/branch/dashboard`
  - Teacher → `/teacher/dashboard`
  - Accountant → `/staff/finance`
  - Receptionist → `/staff/reception`
  - Janitor/Cleaner → `/staff/tasks`
  - Student → `/student/home`
  - Parent → `/parent/home`
- 5th failed attempt locks account → AccountLockDialog (Reset Password / Contact Admin)

### Forgot Password + OTP (01.2)
- Step 1: Enter registered email → Send OTP button
- Step 2: 6-cell OTP input (auto-advance, auto-submit on 6th digit), 5:00 countdown, Resend OTP after expiry
- OTP: 6-digit SMS + email, 5-min expiry

### Reset Password (01.3)
- Live validation checklist (5 rules): min 8 chars, uppercase, lowercase, number, special char
- Confirm match + server-side "not previous 3 passwords"
- Strength indicator: Weak(1/4) → Fair(2/4) → Good(3/4) → Strong(4/4)

### Two-Factor Authentication (01.6)
- 6-digit OTP, 5-min expiry (admin-configurable 3–10 min)
- SMS primary, email fallback
- 3 max attempts before invalidation
- "Trust this device" 30-day cookie → bypasses 2FA for 30 days

---

## Smart Admin Dashboard (D9) — Phase 1

### Dashboard Shell (all roles)
- **Desktop (≥1280px)**: Persistent collapsible sidebar + scrollable widget grid
- **Tablet (768–1279px)**: Temporary drawer
- **Mobile**: Bottom navigation (Flutter app only)
- Sidebar nav items: Active = Golden Orange left border + tinted bg; Phase 2/3 items = disabled + "Soon" tag

### Tenant Admin Dashboard (`/tenant/dashboard`)
KPIs: Total Students (MoM delta) · Active Teachers · Collection vs Target MTD (progress bar) · Pending Alerts count
Widgets: Branch-wise Summary (horizontal comparison bars) · Pending Alerts Feed (tagged: Fee/Attendance/Setup/Leave)

### Branch Admin Dashboard (`/branch/dashboard`)
KPIs: Blocked Students count + today's override count · Pending Fee Invoices (count + NPR amount)
Widgets: Today's Teacher Attendance (animated progress ring) · Today's Student Attendance (animated progress ring) · Today's Timetable (time-ordered: class/room/teacher/status badge) · Resource Log Status (Logged/Pending/Overdue dots)

### Teacher Dashboard (`/teacher/dashboard`)
Widgets: My Classes Today (time-ordered: room/enrollment/status) · Pending Daily Update Log (one-click submit) · Recent Homework Submissions (Phase 2 preview, disabled)

### Student Dashboard (`/student/home`)
Widgets: Today's Timetable (room/teacher/attendance status) · Fee Status (Paid/Due + next invoice date) · Announcements (branch notices, newest first) · Digital Student ID (Download PDF action)

### Parent Dashboard (`/parent/home`)
Child Switcher (chip selector, all widgets scope to selected child)
Widgets: Today's Attendance (Present/Absent/Excused) · Pending Fee Balance (NPR) · Upcoming Timetable (remaining classes today) · Recent Results (Phase 2 preview) · School Announcements

### Shared Dashboard Behavior
- All KPI cards: shimmer skeleton on load → animate to live value
- Progress rings + comparison bars: SVG stroke animates 0→target on first load (once per view)
- Live data: "Updated just now" label + 5-min polling interval
- Role isolation: separate screen + menu per role (no shared admin surface visible to lower roles)
- Phase 2/3 features: disabled (not hidden), with phase tag in nav

---

## Navigation Structure by Role

### Tenant Admin Sidebar
- **Main**: Dashboard, Branches
- **Academic**: Students, Teachers, Timetables, Courses
- **Finance**: Fee & Billing *(live)* · Payroll, Petty Cash, P&L Reports *(Phase 3)*
- **Operations**: Leave Management, Resource Logs *(live)* · HR Management *(Phase 2)*
- **Communication**: Messages, Appointments, Social Media *(Phase 2)*
- **Settings**: Tenant Settings, RBAC & Roles, Integrations

### Branch Admin Sidebar
- **Main**: Dashboard
- **Academic**: Students, Teachers, Timetable, Attendance, Personalized Classes *(live)* · Homework, Results *(Phase 2)*
- **Finance**: Fee & Billing *(live)* · Petty Cash *(Phase 3)*
- **Operations**: Leave Requests, Resource Logs *(live)* · Appointments, Certificates *(Phase 2)*
- **Communication**: Messages, Announcements, Social Media *(Phase 2)*
- **Calendar**: Academic Calendar *(Phase 2)*

### Teacher Sidebar
- **Overview**: Today's Classes, My Timetable
- **Classroom**: Attendance, Daily Update Log *(live)* · Homework, Results *(Phase 2)*
- **Personal**: My Profile, Leave Requests *(live)* · Salary Slips *(Phase 3)*

### Student (Web)
Home · Timetable · Fees · Digital ID *(live)* · Homework, Results *(Phase 2)*

### Parent (Web)
Home · Attendance · Fees *(live)* · Homework, Messages, Appointments *(Phase 2)*

---

## Flutter Mobile App Plan

### Target: Teacher, Student, Parent roles on Android (primary)
- **Architecture**: Flutter + Riverpod (state) + go_router (routing) + Dio (HTTP)
- **Design system**: FlutterTheme matching PRD tokens — MaterialColor from #0F4C8A, accentColor #F39C12, Roboto default, GoogleFonts.fraunces for headlines
- **Optimization**: Low-bandwidth, one-handed, large tap targets (≥48dp), no heavy libraries

### Mobile Routes
| Route | Screen | Role |
|---|---|---|
| `/login` | Login | All |
| `/forgot-password` | Forgot Password | All |
| `/otp` | OTP Verification | All |
| `/reset-password` | Reset Password | All |
| `/2fa` | Two-Factor Auth | Admin roles |
| `/teacher/home` | Teacher Home | Teacher |
| `/teacher/attendance/:classId` | Mark Attendance (Geo) | Teacher |
| `/teacher/timetable` | My Timetable | Teacher |
| `/teacher/leave` | Leave Requests | Teacher |
| `/student/home` | Student Home | Student |
| `/student/timetable` | Timetable | Student |
| `/student/fees` | Fee Status | Student |
| `/student/id` | Digital ID | Student |
| `/parent/home` | Parent Home (child switcher) | Parent |
| `/parent/attendance` | Child Attendance | Parent |
| `/parent/fees` | Fee Balance | Parent |

### Mobile Navigation Pattern
- **Teacher/Student/Parent**: Bottom NavigationBar (4 tabs max)
- No sidebar on mobile — all complexity at admin level stays on web

### Flutter Auth Screens
- Login: Centered card layout (no split panel), brand logo top, Outfit/Fraunces title, Golden Orange CTA
- OTP: 6-cell digit input (auto-advance), countdown timer, Resend link
- Same validation rules as web

### Flutter Teacher — Geo-Attendance Screen
- Large "MARK IN / MARK OUT" button (Golden Orange, full-width, 56dp height)
- GPS status indicator (inside/outside radius badge)
- Session timer showing current in-premises duration
- Auto-departure notice + Branch Admin notification on exit without Mark OUT
- Graceful degradation: show last known status if GPS unavailable

### Flutter Parent — Child Switcher
- Horizontal chip row at top of Home screen
- All widgets (Attendance, Fee Balance, Timetable, Announcements) re-scope on chip tap
- No re-login required for child switch

---

## Accessibility Requirements (PRD §9.1)
- All interactive elements: visible Royal Blue focus ring (never `outline:none`)
- WCAG AA contrast: Dark Slate (#2C3E50) on White/Light Gray minimum
- Form errors: always paired with visible text (never color-alone)
- Animations: run once on load, respect `prefers-reduced-motion`
- SMS treated as first-class channel (not fallback) for low-connectivity users
- Flutter: minimum 48dp tap targets on all interactive elements

---

## Component Library (Core)

### Shared Components (React)
- `<TMSButton variant="primary|secondary|text" loading disabled />`
- `<TMSInput type="email|password|text" label error helperText />`
- `<OTPInput digits={6} onComplete autoFocus />`
- `<PasswordStrengthBar score={1|2|3|4} />`
- `<KPICard title value delta loading />`
- `<ProgressRing percent animated />`
- `<StatusBadge status="success|warning|error|info|gold" />`
- `<SidebarNavItem label icon active disabled phase="2|3" />`
- `<DashboardShell role sidebar />`
- `<SkeletonCard rows />`

### Flutter Widgets
- `TMSButton` — Golden Orange ElevatedButton, silk curve animation
- `TMSTextField` — Royal Blue focus, error state, helper text
- `OTPTextField` — 6 individual digit boxes with auto-advance
- `KPICard` — shimmer loading → animated count-up
- `ProgressRing` — SVG-style AnimatedContainer arc
- `StatusChip` — tinted background + colored label
- `ChildSwitcherBar` — horizontal chip scroll
- `GeoAttendanceButton` — large CTA with GPS status

---

## Phase 1 Route Map (Web)

| Route | Page | Role | Auth |
|---|---|---|---|
| `/login` | Login | All | No |
| `/forgot-password` | Forgot Password | All | No |
| `/reset-password/:token` | Reset Password | All | No |
| `/tenant/dashboard` | Tenant Admin Dashboard | Tenant Admin | Yes |
| `/tenant/branches` | Branch Management | Tenant Admin | Yes |
| `/branch/dashboard` | Branch Admin Dashboard | Branch Admin | Yes |
| `/branch/students` | Student Management | Branch Admin | Yes |
| `/branch/attendance` | Attendance Overview | Branch Admin | Yes |
| `/branch/fees` | Fee & Billing | Branch Admin, Accountant | Yes |
| `/teacher/dashboard` | Teacher Dashboard | Teacher | Yes |
| `/teacher/attendance/:classId` | Mark Attendance | Teacher | Yes |
| `/student/home` | Student Home | Student | Yes |
| `/parent/home` | Parent Home | Parent | Yes |

---

## Agent Work Breakdown

| Agent | Scope | Status |
|---|---|---|
| `design-system` | CSS tokens, Tailwind config, base component styles (React) | 🟢 Complete |
| `react-auth` | Login, ForgotPassword, OTP, ResetPassword, 2FA pages (React) | 🟢 Complete |
| `react-dashboards` | All 5 role-scoped dashboards + DashboardShell (React) | 🟢 Complete |
| `flutter-scaffold` | Flutter app structure, theme, routing, design system | 🟢 Complete |
| `flutter-auth` | Login, OTP, Reset, 2FA screens (Flutter) | 🟢 Complete |
| `flutter-mobile` | Teacher geo-attendance, Student home, Parent home (Flutter) | 🟢 Complete |

---

## Developer Handoff Notes (PRD §9.3)
1. Role-based redirect must be implemented at the **auth-response layer** (not client-side routing guesses)
2. Phase-gating: "Soon"-tagged nav items driven by **feature-flag config**, not hardcoded
3. Session-status logic (IN/OUT/AUTO-OUT/RE-IN) computed **server-side** — UI only renders result
4. Dashboard refresh: poll every **5 minutes** (or WebSocket subscribe) in production
5. Nepal Pay QR: **unique per invoice per billing cycle** (D7.8)
6. Flutter GPS: 20m accuracy gate; auto-departure after grace period; total from all stamps (not single in/out pair)

---

*Last updated: 7 July 2026 · v1.0*
