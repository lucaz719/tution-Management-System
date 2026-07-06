# TMS Phase-wise Implementation Tracker

This document tracks the completion status of the Tuition Management System (TMS) across its three development phases.

---

## 🟢 PHASE 1: Core Foundation (100% COMPLETE)
All foundational components required to launch multi-tenant institution onboarding, billing setup, and geofenced attendance.

### Deliverables:
- [x] **Multi-tenant setup** — Scopes all database queries by `tenantId` context using `tenantMiddleware`.
- [x] **RBAC** — Defines core roles (Super Admin, Tenant Admin, Branch Admin, Teacher, Student, Parent) and validates actions with `hasPermission` middleware.
- [x] **Student & teacher enrollment** — Handles course-level configurations and student allocations under `coursesRouter`.
- [x] **Regular class timetable (UKG-12)** — Defines daily/weekly slot intervals for classes.
- [x] **Full geo-attendance system for teachers** — Performs teacher mark-in/out GPS geofence checks (under 20m accuracy gate).
- [x] **Student attendance (teacher-managed)** — Marks student rosters while checking for fee blocks and approved leaves.
- [x] **Fee billing engine** — Auto-calculates invoicing, discounts, and standard 13% Nepalese VAT.
- [x] **Nepal Pay QR & webhook** — Generates merchant strings and processes payment confirmations.
- [x] **Student fee blocking & admin override** — Blocks attendance for unpaid dues and supports branch override waivers.
- [x] **Smart admin dashboard** — Aggregates metrics (active counts, overdue totals, pending approvals) in one view.
- [x] **Digital student ID & Lifetime record** — Generates profile card metadata and tracks student history.
- [x] **Leave and early out system** — Staff & student leave submissions with approval chains (Branch Admin / Tenant Admin).
- [x] **Student emergency departure** — Branch Admins check out students, auto-notifying parents via SMS.
- [x] **Push + SMS notification foundation** — Mock utilities for FCM and Nepalese SMS gateway dispatches.

---

## 🟢 PHASE 2: Academic, Operations & Intelligence (100% COMPLETE)
Extending the platform to include assignment flows, social media marketing, canteen/bus trackers, and basic analytics.

### Deliverables:
- [x] **Homework management + auto-distribution** — Post, submit, and grade assignments under `homeworkRouter`.
- [x] **Results & performance tracking** — Records student test scores and evaluates averages.
- [x] **Teacher verification daily update gate** — Blocks mark-in if class summaries are pending.
- [x] **Communication hub** — Threaded messaging between parents and assigned teachers with privacy guards.
- [x] **Appointment booking** — Booking window slots, parent-teacher privacy constraints, and alternative slot proposal flows.
- [x] **Resource & infrastructure logging** — Classroom checklists with auto-assigned Maintenance Tasks to janitor staff.
- [x] **Certificate generation** — Manages master templates and issues PDF certificate metadata.
- [x] **Academic & payment calendar** — Generates tenant/branch holiday calendars and color-coded fee due dates.
- [x] **Social media post scheduling** — Meta/LinkedIn drafts approval flows under `socialRouter`.
- [x] **Personalized classes** — 1-on-1 private scheduling and attendance tracking.
- [x] **Student performance tracking** — Flags upgrade/downgrade performance trends.
- [x] **HR Management** — Document uploads, expiration alerts, and exit clearance processes.
- [x] **Staff performance scoring** — Computes composite scores (attendance, session updates, feedback).
- [x] **AI-driven financial suggestions** — Generates monthly alerts for missing expenses or payroll anomalies.
- [x] **Yearly financial tracking** — Displays yearly income/expense forecast lists.
- [x] **Canteen management system** — Cashless student wallet reloads and purchase debits (with PIN checks).
- [x] **Vehicle tracking system** — Bus routes, student assignments, and driver GPS location updates.
- [x] **Report exports** — PDF/Excel reports export endpoints.

---

## 🟢 PHASE 3: ERP & Advanced (100% COMPLETE)
Advanced ledger operations, automated payroll, petty cash lifecycles, and backend automations.

### Deliverables:
- [x] **Full expense management** — Category expense tracking (rent, utilities, etc.).
- [x] **Payroll auto-calculation** — Process monthly salaries using contract types and session tracking.
- [x] **Petty cash approval engine** — Multi-level approvals and accountant receipt submissions.
- [x] **P&L dashboard** — Real-time revenue vs. expense aggregates.
- [x] **Double-entry ledger export** — Bookkeeping export sheets.
- [x] **Music class module** — Custom independent schedules, curriculum, and installment fees.
- [x] **Short/long-term course engine** — Scopes custom duration courses and fixed end-dates.
- [x] **Refund management** — Pro-rata, fixed deduction, or no-refund rule calculations.
- [x] **Full cron automation suite** — Background handlers for cap resets, alerts, and due blocks.
- [x] **Task escalation engine** — Escalates unresolved maintenance log items.
- [x] **Performance analytics deep-dive** — In-depth student grading and teacher scorecard analytics.
