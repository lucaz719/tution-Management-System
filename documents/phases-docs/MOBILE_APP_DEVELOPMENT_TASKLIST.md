# Mobile App Development Task List

**Verified:** 2026-08-12  
**Scope:** `apps/mobile` Flutter app for Android and iOS, with tablet support where practical.

## Verified status and planning corrections

The mobile application has a useful Flutter foundation: Riverpod, GoRouter,
Dio/cookie packages, adaptive helpers, authentication screens, and partial
Teacher, Student, and Parent UI. It is **not release-ready** and must not be
described as feature-complete.

| Area | Verified state | Planning implication |
| --- | --- | --- |
| Authentication | Sign-in and session restoration call Better Auth, but password recovery and 2FA screens still call `MockAuthService`. | Complete and test the full auth flow before role portals. |
| API configuration | The API base URL is hard-coded to Android-emulator localhost. | Add environment-specific configuration and HTTPS release settings. |
| Session storage | Cookies use an in-memory `CookieJar`; only a user summary is stored locally. | Decide and implement secure persistent session behaviour, or require re-login after restart. |
| Role coverage | Router supports only Teacher, Student, and Parent roles. | Define the mobile role matrix; unsupported roles need deliberate restricted experiences or no mobile access. |
| Portal data | Student screens rely heavily on `student_demo_data.dart` and `mock_portal_data.dart`; parent and teacher views are also not proven API-backed. | Replace demo data feature-by-feature with scoped repository/API implementations. |
| Offline-first | The architecture document specifies Drift/SQLite and optimistic sync, but neither is configured in the mobile package. | Deliver the offline foundation before claiming offline support. |
| Notifications | No Firebase Messaging/local-notification dependencies or lifecycle implementation were found. | Build push registration, notification routing, and preferences. |
| Quality | Existing tests cover utility functions, basic student models, and login rendering only. | Add repository, provider, widget, integration, accessibility, and device testing. |
| Plans | `PROGRESS_AND_TASKLIST.md` marks several mobile workflows complete while their Flutter code is missing, mock-backed, or unverified. `PHASES_AND_TASKS.md` is an older planned snapshot. | Treat this document and `.memory` as the mobile execution baseline; reconcile the older progress checklist after each delivery. |

## Delivery guardrails

- Keep Better Auth session cookies as the only identity authority; never store passwords, bearer tokens, or branch/tenant scope as authority on-device.
- Derive tenant, branch, child, and role scope from the verified session and server resource authorization.
- Follow feature-first MVVM: views are thin, ViewModels hold presentation state, repositories own reads/writes, and services wrap Dio/platform APIs.
- Build UI from layout constraints using compact (<600), medium (600–839), and expanded (840+) widths.
- Every loading, empty, error, denied, offline, and retry state must be explicit and accessible.

## Prioritized implementation backlog

### P0 — Release foundation

- [ ] **MOB-001: Establish the mobile delivery baseline.** Confirm supported OS versions, Android/iOS signing owners, package/bundle IDs, environments, analytics/error-reporting policy, and the role matrix. Create a Definition of Done and an API-contract ownership list.
- [ ] **MOB-002: Add build-time configuration.** Replace the hard-coded base URL with `--dart-define` configuration for local, staging, and production; reject insecure HTTP outside debug builds; document emulator, simulator, and physical-device setup.
- [ ] **MOB-003: Complete Better Auth integration.** Make forgot-password, OTP verification, password reset, 2FA send/resend/verify, logout, and session-expiry handling use `AuthService`; remove `MockAuthService` from production paths.
- [ ] **MOB-004: Resolve mobile cookie/session persistence.** Implement a platform-appropriate secure, persistent cookie strategy or explicitly require sign-in after restart. Ensure logout and 401 erase all local session state.
- [ ] **MOB-005: Harden authorization and routing.** Enforce role-specific route guards for every route, block direct deep links to other roles, handle disabled/deactivated users, and display 401/403/session-expired states.
- [ ] **MOB-006: Establish networking conventions.** Add typed DTOs, request cancellation, timeouts, correlation-ID/error mapping, pagination, idempotent mutation handling, retry policy, and test overrides for Dio.
- [ ] **MOB-007: Create the offline-first core.** Add Drift/SQLite, migrations, encrypted/sensitive-data policy, sync queue, connectivity monitoring, conflict rules, and a visible sync status. Do not cache credentials or unrestricted cross-user data.
- [ ] **MOB-008: Add app-wide quality infrastructure.** Configure flavors, lint rules, formatting, coverage reporting, CI commands, crash/error reporting, privacy-safe logs, and a release checklist.

**P0 acceptance:** A Teacher, Student, and Parent can sign in against staging, restore or intentionally re-establish a session, use only their permitted routes, receive clear failure states, and sign out. Debug and release builds target the correct backend without source changes.

### P1 — API-backed core journeys

- [ ] **MOB-101: Student home and timetable.** Replace demo schedules/cards with authenticated APIs; support daily/weekly timetable, course-type distinctions, loading/error/empty/offline states, and refresh.
- [ ] **MOB-102: Student academic records.** Integrate results, homework, attendance, performance insights, and approved-leave explanations. Restrict records to the signed-in student and implement pagination/detail views as required.
- [ ] **MOB-103: Student fees, payments, and certificates.** Integrate invoice list/detail, blocked status, Nepal Pay/connectIPS handoff rules, payment-return refresh, certificate list, and authenticated file download/open. Never mark payment successful on client redirect alone.
- [ ] **MOB-104: Student digital ID, calendar, and notifications inbox.** Back each screen with live scoped data; support expiry/status rules, event filtering, and read/unread lifecycle.
- [ ] **MOB-105: Parent child selection and dashboard.** Fetch authorized linked children, persist only a non-authoritative UI preference, include selected child in safe API calls, and prevent stale data from a previously selected child appearing after a switch.
- [ ] **MOB-106: Parent academic and finance journeys.** Deliver child-scoped timetable, attendance, performance, invoices/payment, certificates, and calendar with strict server authorization checks.
- [ ] **MOB-107: Parent communication workflows.** Integrate only contracts that safely scope parent, child, and assigned teacher: messages, appointments (including the 24-hour rule), and leave requests. Show unavailable state for missing contracts rather than simulated success.
- [ ] **MOB-108: Teacher schedule and geo-attendance.** Replace fixture data, request and explain location permissions, validate scheduled branch/session context through the API, support IN/OUT/re-IN/error states, and avoid trusting client geofence decisions.
- [ ] **MOB-109: Teacher operational workflow.** Implement API-backed daily updates, assigned roster attendance, fee-blocked and approved-leave states, homework distribution, score entry, leave requests, personal performance, and multi-branch scheduling.
- [ ] **MOB-110: Decide and implement non-core roles.** For Branch Admin, Accountant, Receptionist, Janitor, and Tenant Admin, either deliver narrowly defined mobile tasks with APIs and RBAC or redirect them to the web app with an intentional supported message.

**P1 acceptance:** Core journeys contain no production demo/mock source, all displayed data is session- and resource-scoped, mutations recover correctly after failures, and API integration tests cover authorized and unauthorized behaviour.

### P2 — Platform capabilities and polish

- [ ] **MOB-201: Push notifications.** Add Firebase/APNs setup, consent and token registration, device-token rotation/revocation, foreground/background handling, deep-link routing, and notification preference screens. Test fee, homework, leave, attendance, and appointment events.
- [ ] **MOB-202: File and media flows.** Add safe attachment selection, upload progress/retry, type/size validation, authenticated downloads, temporary-file cleanup, and permission fallbacks.
- [ ] **MOB-203: Adaptive UI completion.** Audit every screen at compact, medium, and expanded constraints; validate orientation, text scaling, keyboard navigation, safe areas, and platform input modalities.
- [ ] **MOB-204: Accessibility and localization.** Meet WCAG AA contrast, semantic labels, focus order, screen-reader descriptions, error announcements, 44px touch targets, reduced motion, Nepali/English localization, and Nepal date/currency formats.
- [ ] **MOB-205: Performance.** Profile startup, scrolling, image memory, API payloads, local database queries, and sync. Define budgets and correct regressions before release.
- [ ] **MOB-206: Observability and privacy.** Add privacy-safe crash reporting, analytics events only with approved consent, correlation IDs for support, and no PII/session data in logs or analytics.

### P3 — Verification and release

- [ ] **MOB-301: Unit tests.** Cover DTO parsing, repositories, ViewModels, validators, error mapping, sync/conflict rules, authentication state, and authorization redirects.
- [ ] **MOB-302: Widget and golden tests.** Cover every role’s main states: loading, empty, error, denied, offline, compact/medium/expanded layouts, text scaling, and dark mode if supported.
- [ ] **MOB-303: Integration tests.** Run Android and iOS flows against a disposable staging tenant: login/2FA/reset/logout, child switching, teacher geo-attendance, daily update, fee/payment return, certificate download, notifications, and offline recovery.
- [ ] **MOB-304: Security test pass.** Verify no secrets/tokens in storage/logs, TLS in release, certificate/network configuration, deep-link authorization, file access controls, rooted/jailbroken-device policy, and tenant/branch/child IDOR attempts.
- [ ] **MOB-305: Device and store readiness.** Test representative low-end Android devices, current Android/iOS versions, tablets, offline/poor-network conditions, app upgrades, app icons/splash screens, privacy policy, support links, and store metadata.
- [ ] **MOB-306: Release candidate and rollout.** Produce signed staging builds, complete UAT with each supported role, publish a monitored phased rollout, validate crash/error thresholds, and document rollback, support, and incident procedures.

## Suggested delivery order

1. MOB-001 through MOB-008
2. MOB-101 through MOB-104 (Student)
3. MOB-105 through MOB-107 (Parent)
4. MOB-108 through MOB-109 (Teacher)
5. MOB-110, then MOB-201 through MOB-206
6. MOB-301 through MOB-306 continuously, with final release sign-off

## Documentation maintenance tasks

- [ ] Update `apps/mobile/README.md` from the Flutter starter text to setup, environment, architecture, testing, and release instructions.
- [ ] Reconcile mobile completion claims in `documents/phases-docs/PROGRESS_AND_TASKLIST.md` with API-backed evidence.
- [ ] Update `docs/api/README.md` with mobile-owned contracts, DTOs, error codes, pagination, upload/download, payment return, and notification registration behaviour.
- [ ] Update `docs/testing/README.md` with the mobile test pyramid, staging fixture rules, and device matrix.
- [ ] Keep `.memory` current when verification results, known gaps, or the next delivery priority changes.
