# TMS Hosting and DNS Implementation Plan

**Client:** Sanskardip Shikshalaya  
**Purpose:** Choose a safe, cost-conscious hosting model for the Tuition Management System (TMS) while preserving the existing public website.  
**Status:** Planning guide — no infrastructure changes are authorized by this document.  
**Last updated:** 2026-08-02

## 1.0 Decision Summary

Keep the existing public website at `sanskardipshikshalaya.com.np` on cPanel. The TMS application must use separate application subdomains and a PostgreSQL database.

Two deployment models are possible:

| Model | Suitable when | Decision |
|---|---|---|
| A. cPanel hosts the public site, DNS, and TMS Node application | The cPanel plan demonstrably supports Node.js 20, PostgreSQL, persistent processes, HTTPS, environment secrets, logs, backups, cron, and public webhooks. | Lower-cost pilot option; approve only after every checklist item passes. |
| B. cPanel hosts the public site and DNS; TMS runs on separate application hosting | The application needs reliable payments, background work, stronger operational controls, or any cPanel requirement is unavailable. | Recommended production option. |

The existing public website must not be replaced during either model.

## 2.0 Target Domain Layout

| Purpose | Staging | Production | Hosting owner |
|---|---|---|---|
| Public marketing website | Not required | `https://sanskardipshikshalaya.com.np` | Existing cPanel website |
| TMS web client | `https://staging.sanskardipshikshalaya.com.np` | `https://app.sanskardipshikshalaya.com.np` | Chosen TMS host |
| TMS API and authentication | `https://api.staging.sanskardipshikshalaya.com.np` | `https://api.sanskardipshikshalaya.com.np` | Chosen TMS host |
| Payment callbacks/webhooks | API staging URL | API production URL | Chosen TMS host |

The web client and API intentionally use the same parent domain. This supports secure browser session-cookie behavior while keeping the public website independent.

## 3.0 Model A: Host TMS on cPanel Node.js

### 3.1 When this model is acceptable

Choose Model A only if the hosting provider confirms every requirement below in writing or through a staging trial.

| Requirement | Pass condition |
|---|---|
| Node.js runtime | Node.js 20 or newer; application can run continuously and restart automatically. |
| PostgreSQL | A supported PostgreSQL database is available, backed up, and reachable from the Node application. MySQL alone is not sufficient. |
| Process controls | Developer can start, stop, restart, and inspect application logs. The process does not sleep because of inactivity. |
| Environment secrets | Private environment variables can be configured outside Git and outside public web roots. |
| TLS/SSL | Certificates can be issued and renewed for all four TMS subdomains. |
| Webhooks | Public HTTPS `POST` requests from Nepal Pay/connectIPS UAT and production can reach the API. |
| Database migration | Developer can execute `npx prisma migrate deploy` against staging and production safely. |
| Cron/background work | A dependable scheduler exists, or the application has a separate supported job mechanism. |
| Backup and recovery | Database backup frequency, restore procedure, and retention are documented. |
| Resource limits | CPU, memory, connection, request timeout, and storage limits suit expected staff use. |

### 3.2 Advantages

- Lower monthly cost when the current plan already includes the required features.
- One provider and one control panel for the public site, DNS, and application.
- Simple initial deployment for a small pilot.

### 3.3 Risks and limitations

- Shared hosting may suspend or recycle Node applications.
- PostgreSQL, reliable logs, long-running jobs, and Docker Compose are often unavailable.
- Payment webhook troubleshooting, database restore, and deployment rollback can be harder.
- Capacity can become a problem as staff, parents, payments, and notifications increase.

### 3.4 Developer implementation outline

1. Create the staging subdomains and enable SSL.
2. Create an isolated staging PostgreSQL database and non-superuser database account.
3. Deploy the API as a Node application outside the public website directory.
4. Store production-style secrets in cPanel’s private Node environment configuration.
5. Run Prisma generation and `npx prisma migrate deploy` once per deployment.
6. Deploy the web build to the staging web subdomain.
7. Configure the API/web URLs shown in Section 5.0.
8. Run the staging security and payment acceptance checks in Section 7.0.

If any requirement fails, stop and use Model B. Do not work around missing controls by placing secrets in source files or disabling security settings.

## 4.0 Model B: Keep cPanel for Public Site and DNS; Host TMS Separately

### 4.1 Recommended architecture

```text
Existing cPanel
  ├─ serves sanskardipshikshalaya.com.np (public website)
  └─ manages DNS records for TMS subdomains

Separate TMS application host
  ├─ serves staging/app web client
  ├─ serves api.staging/api API
  ├─ runs PostgreSQL or connects to managed PostgreSQL
  ├─ stores application secrets
  └─ receives payment callbacks and runs supported scheduled work
```

### 4.2 Advantages

- Suitable for the project’s Docker-based deployment model.
- Better control over Node process health, logs, backups, monitoring, and scaling.
- More reliable foundation for authentication, payment webhooks, and background work.
- The public website remains untouched.

### 4.3 Trade-offs

- A separate hosting bill and deployment account are required.
- DNS must point the cPanel-managed subdomains to the separate host.
- The developer must manage the deployment pipeline and operational runbook.

## 5.0 DNS, TLS, and Application Configuration

### 5.1 DNS records

The TMS host supplies either IP addresses or CNAME targets. Create only the records it specifies.

| Record | Type | Target | Use |
|---|---|---|---|
| `staging` | A or CNAME | Staging web host | TMS staging client |
| `api.staging` | A or CNAME | Staging API host | TMS staging API and UAT webhooks |
| `app` | A or CNAME | Production web host | TMS production client |
| `api` | A or CNAME | Production API host | TMS API and live webhooks |

Do not change the root-domain record or the existing `www` record while setting up TMS.

### 5.2 TLS requirements

- Force HTTPS for every TMS subdomain.
- Use valid certificates with automatic renewal.
- Do not expose login, sessions, or payment callbacks over HTTP.
- Verify the API receives the original HTTPS host/protocol correctly behind a reverse proxy.

### 5.3 Required application environment values

Staging:

```env
NODE_ENV=production
WEB_ORIGIN=https://staging.sanskardipshikshalaya.com.np
BETTER_AUTH_URL=https://api.staging.sanskardipshikshalaya.com.np
PLATFORM_ADMIN_ENABLED=false
```

Production:

```env
NODE_ENV=production
WEB_ORIGIN=https://app.sanskardipshikshalaya.com.np
BETTER_AUTH_URL=https://api.sanskardipshikshalaya.com.np
PLATFORM_ADMIN_ENABLED=false
```

Set `BETTER_AUTH_SECRET`, `DATABASE_URL`, payment credentials, webhook secrets, and SMS credentials in the host’s secret manager or private environment configuration. Never commit or paste their values into documentation, browser code, or repository files.

## 6.0 Payment Integration Requirements

Use ConnectIPS UAT credentials only in staging. ConnectIPS redirects the payer's
browser after OTP; the return endpoint must target the staging API, never
localhost, and the backend must validate `TXNID` server-to-server before it
marks an invoice paid.

```text
Success: https://api.staging.sanskardipshikshalaya.com.np/api/finances/connectips/return/success
Failure: https://api.staging.sanskardipshikshalaya.com.np/api/finances/connectips/return/failure
```

Before production payment activation:

1. Register the exact static URLs with NCHL and confirm the UAT merchant/app is mapped to them.
2. Confirm the browser can reach the endpoint over public HTTPS.
3. Configure `CONNECTIPS_*` values as private API environment variables; never expose them to the web application or Git.
4. Configure the host scheduler to run `npm run connectips:reconcile --workspace @tms/api` every five minutes. This command is safe while ConnectIPS is disabled and becomes active only when `CONNECTIPS_ENABLED=true`.
5. Test duplicate returns, failed payments, successful payments, interrupted browser returns, and server-side amount/reference validation.
6. Replace UAT credentials with production credentials only after the staging acceptance record is approved.

## 7.0 Staging Acceptance Checklist

### 7.1 Infrastructure

- [ ] DNS resolves all staging subdomains to the intended host.
- [ ] HTTPS certificate is valid for web and API URLs.
- [ ] Database migration succeeds and has a tested backup/restore path.
- [ ] `GET /api/health` returns `200`.
- [ ] API logs, error correlation IDs, and database backups are accessible to authorized operators.

### 7.2 Authentication and sessions

- [ ] Login cookie is `Secure`, `HttpOnly`, and has the intended `SameSite` behavior.
- [ ] Browser refresh retains a valid session.
- [ ] Sign-out invalidates the session server-side.
- [ ] Password reset invalidates prior sessions.
- [ ] 2FA challenge cannot access protected routes before OTP verification.
- [ ] A disabled/deactivated user cannot continue using an existing session.

### 7.3 Security and payments

- [ ] API CORS permits only the staging web origin.
- [ ] Security headers and HSTS are present over HTTPS.
- [ ] Authentication rate limiting returns `429` after the configured threshold.
- [ ] ConnectIPS UAT return reaches the staging API and an invoice is paid only after server-side validation.
- [ ] The server scheduler runs the ConnectIPS reconciliation command every five minutes and recovers an interrupted browser return.
- [ ] No secrets, OTPs, passwords, session cookies, or payment credentials appear in logs.

## 8.0 cPanel Provider Questionnaire

Send these questions to the hosting provider before choosing Model A:

1. Does this plan support a continuously running Node.js 20 application, without sleeping after inactivity?
2. Does it provide PostgreSQL, and can the Node application connect using a private database URL?
3. Can we create private environment variables for the Node application?
4. Can we run `npx prisma migrate deploy` during controlled releases?
5. Can public HTTPS `POST` webhooks reach the Node application without a proxy restriction?
6. Can we create SSL-enabled subdomains for `staging`, `api.staging`, `app`, and `api`?
7. Can the developer view application logs and restart the process?
8. What are the CPU, memory, process, timeout, connection, and storage limits?
9. What database backup, retention, restore, and disaster-recovery controls are included?
10. Is a dependable cron/scheduled-task facility available for application jobs?
11. Is Docker supported? If not, what is the documented Node deployment process?

## 9.0 Decision Gate

Approve cPanel Node.js hosting only after Sections 3.1, 5.0, and 7.0 pass in staging. If PostgreSQL, persistent process execution, private secrets, HTTPS webhooks, migration control, backups, or logs are missing, select Model B before payment integration or production rollout.
