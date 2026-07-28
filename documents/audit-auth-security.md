# Authentication, Authorization & Security Audit

**Scope:** web and backend authentication/authorization only; mobile excluded.  
**Assessment:** do not deploy this authentication design to production until the critical 2FA bypass is corrected and the authorization/cron findings are addressed.

## Current authentication flow

```text
1. Web posts email/password to POST /api/auth/login.
2. API loads the globally unique User, checks ACTIVE status and bcrypt password.
3. API immediately signs and returns a 24-hour JWT containing tenant, roles and permissions.
4. Web stores the JWT (localStorage for "remember me", sessionStorage otherwise).
5. If twoFactorEnabled, the web requests and verifies an OTP.
6. The web only then changes its local `requiresTwoFactor` flag and permits protected routes.
7. For API calls, the browser sends Authorization: Bearer <JWT> and X-Tenant-Id.
8. API verifies the JWT; for non-super-admins it replaces tenant context with the JWT tenant claim.
```

Password reset uses a short-lived OTP stored as a hashed verification-code record, then exchanges it for a 15-minute reset token. OTP issuance and retry limiting are present, but delivery currently prints codes to server logs.

## Findings

| Severity | Finding | Why it matters | Evidence |
|---|---|---|---|
| **Critical** | 2FA is a client-only gate and can be bypassed. | A user who knows a valid password receives a fully authorized JWT before the OTP is verified. They can call any API directly with that token and never complete 2FA. | Login signs a 24-hour token and returns it with `requiresTwoFactor`; `/2fa/verify` only returns `{ success: true }`; `AuthContext.verify2FA()` only changes browser state. |
| **High** | Any authenticated user can trigger cron tasks. | The cron route has `authMiddleware` but no permission/service identity check. A low-privilege user can invoke operational actions and notifications. | `services/api/src/routes/cron.ts`. |
| **High** | Cron operations can cross tenant boundaries. | Monthly enrollment blocking filters by a student's overdue invoices without a tenant restriction; task escalation updates all matching maintenance tasks. A caller from one tenant may affect others. | `cron.ts` `enrollment.updateMany` and `maintenanceTask.updateMany` filters. |
| **High** | Branch-scoped permission checking is permissive when no branch context is supplied. | A branch-scoped role passes `hasPermission` whenever the request lacks `branchId`; each route must then correctly enforce resource branch ownership. This is easy to miss and can create horizontal privilege escalation. | `middleware/auth.ts`: `branchId === undefined` is accepted. |
| **High** | Access token is readable by JavaScript. | Any successful XSS can take a 24-hour bearer token from localStorage/sessionStorage and replay it. | `apps/web/src/services/api.ts` and `AuthContext.tsx`. |
| Medium | CORS is open to all origins. | It widens exposure of browser-accessible endpoints and should not be a production default. | `app.use(cors())` in `server.ts`. |
| Medium | Authorization data is embedded in a 24-hour JWT with no revocation/version check. | Disabling a user or changing their roles does not invalidate already-issued tokens; logout only clears the browser copy. | Login token claims include roles/permissions; `authMiddleware` only verifies signature/expiry. |
| Medium | OTP rate limiting is process-local and fixed-window. | It resets on restart, is not shared across instances, and can be bypassed by distributed traffic. | `utils/otp.ts` uses an in-memory `Map`. |
| Medium | OTP codes are printed to logs and delivery is a mock. | Logs become an authentication secret store; this is unacceptable outside a tightly controlled development environment. | `utils/delivery.ts`. |
| Medium | JWT validation lacks explicit issuer, audience, algorithm allow-list and key rotation strategy. | Strong secret validation exists, but these controls make token acceptance and rotation safer across environments. | `utils/env.ts`, `middleware/auth.ts`. |
| Medium | Tenant handling is split across a header-first middleware and later JWT correction. | It is harder to reason about and invites future endpoints to use `req.tenantId` before authentication. Super-admin tenant switching also needs explicit audit logging and allow rules. | `server.ts`, `middleware/tenant.ts`, `middleware/auth.ts`. |
| Low | Authentication failures are only locally counted in the browser. | Five failed login attempts lock only the current browser state; the server does not protect the account from repeated password guessing. | `AuthContext.tsx` `attemptCount`. |
| Low | Password hashing uses bcrypt cost 10. | It is functional but should be recalibrated for current server capacity or replaced with Argon2id. | `routes/auth.ts` password reset uses `bcrypt.hash(..., 10)`. |
| Design decision | Email is globally unique across all tenants. | This prevents one email being used at two institutions. That may be intentional, but it conflicts with many multi-tenant expectations. | `User.email @unique` and global login lookup. |

## Required fixes

### 1. Make 2FA an API-enforced state machine

Do not issue an access token after password validation when 2FA is enabled. Instead:

1. Return a short-lived, signed **pre-auth challenge** with no application permissions.
2. Bind the OTP request and verification to that challenge/user/device context.
3. On successful OTP verification, issue the normal short-lived access token plus a rotating refresh token.
4. Reject all protected API calls unless the access token has an `amr`/`mfa` claim (or equivalent completed-authentication session state).
5. Make trusted-device status server-controlled and revocable; do not rely on a localStorage email-to-expiry map.

### 2. Centralize authorization and tenant scoping

- Run authentication before tenant derivation for protected routes.
- Use the authenticated JWT/session tenant as the only tenant source for normal users. Treat tenant headers as a super-admin switching feature only, validate and audit it.
- Require a concrete branch ID for branch-scoped permissions, then load the target record and compare its branch/tenant server-side.
- Add a default-deny authorization policy for every endpoint. The cron endpoint should use a separate scheduler/service credential, not normal user JWTs.
- Add tenant predicates to every bulk update and query, including maintenance-task and enrollment operations.

### 3. Harden session and credential handling

- Prefer short-lived access tokens held in memory and rotating refresh tokens in `Secure`, `HttpOnly`, `SameSite` cookies. Add CSRF protection if cookie auth is used.
- Add token/session versioning (or a session table) so password reset, role change, user suspension and logout-all revoke existing credentials.
- Restrict CORS to configured frontend origins; add Helmet/security headers, body limits and request logging with sensitive-field redaction.
- Use Redis or another shared rate-limit store for login, OTP issuance and OTP verification. Apply server-side account/IP throttling.
- Send OTPs through a real provider; never log codes in production. Consider HMAC or a slow hash for stored OTP values.
- Validate JWT `issuer`, `audience`, permitted algorithms and key ID; support secret/key rotation.

## Password reset assessment

The reset design has good foundations: normalized emails, generic forgot-password responses to reduce account enumeration, 5-minute OTP expiry, attempt counters, replacement of previous codes, one-time reset tokens, password policy checks, and server-side validation before the password update.

To complete it for production, use a shared rate limiter, add audit events, invalidate all active sessions after reset, use a production delivery channel, and ensure reset-token lookup is indexed and monitored.

## Minimal security test suite to add

1. Password-only login for a 2FA user cannot access any protected endpoint.
2. A verified 2FA flow returns an access token with the MFA claim and can access allowed endpoints.
3. A branch admin cannot read or modify another branch's resource, with and without a `branchId` request field.
4. A normal user cannot call `/api/cron/trigger`.
5. Bulk cron updates affect only the target tenant.
6. Suspending a user, changing a role, and resetting a password invalidate existing sessions.
7. Requests with spoofed `X-Tenant-Id` do not escape the JWT tenant.
8. OTP/login rate limits hold across multiple API instances.

## Implementation order

1. Fix the 2FA token issuance flaw and add tests for it.
2. Lock down cron and add tenant filters to bulk updates.
3. Tighten branch-resource authorization and add cross-tenant/branch tests.
4. Adopt session revocation, shared rate limits, controlled CORS and production OTP delivery.
5. Replace browser-token persistence with the selected hardened session model.
