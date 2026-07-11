# Backend Architecture & Security Audit Report
**Project:** Tuition Management System (TMS) Monorepo  
**Focus:** Express API, Prisma Schema, Tenant Isolation, Financial Integrity, and Security  
**Date:** July 11, 2026

---

## 1. Introduction & Objectives

This report performs a comprehensive security and architectural audit of the Tuition Management System (TMS) backend API (`services/api`). The objectives are to:
1. Review the tech stack, structural patterns, and code quality.
2. Evaluate tenant isolation, context propagation, and database integrity.
3. Identify security vulnerabilities, potential leak points, and implementation risks.
4. Provide actionable, phased recommendations to prepare the backend for enterprise production.

---

## 2. Technology Stack & Architectural Overview

The backend is built as a modular REST API:
- **Runtime & Framework**: Node.js, TypeScript, Express.js.
- **ORM & Database**: Prisma client mapping to a PostgreSQL instance.
- **Routing**: Domain-specific express routers mounted in `server.ts`.
- **Tenancy Model**: Logical isolation (multi-tenant, single database, row-level isolation scoped by `tenantId` and `branchId`).

### 2.1 Code Execution Context
The backend utilizes two main custom Express middlewares:
1. `tenantMiddleware` (`middleware/tenant.ts`): Automatically extracts the active tenant ID from request headers or authenticated user claims.
2. `authMiddleware` (`middleware/auth.ts`): Parses stateless JWT bearer tokens to load user payloads and roles.

---

## 3. Key Vulnerabilities & Architectural Issues

During our deep-dive review of the backend code, we identified several critical vulnerabilities and design flaws:

### 3.1 Silent Database Fallback (Simulation Mode)
Almost every route handler across all routers contains `try-catch` blocks that wrap database operations. If Prisma throws a connection error, query timeout, or validation exception, the catch block intercepts it and returns a **simulated/mock response** (200 OK or 201 Created) containing fake data.

**Example from `routes/onboarding.ts` (Tenant Approval):**
```typescript
try {
  // Database provisioning...
  const tenant = await prisma.tenant.create({ ... });
} catch (error: any) {
  if (error.code === 'P2002' || error.message.includes('DATABASE_URL')) {
    // Returns 200 OK with fake provisioned tenant data!
    return res.status(200).json({
      message: 'Simulation Mode: Request approved successfully (In-Memory).',
      provisioned: { tenantId: 'simulated-tenant-999', ... }
    });
  }
}
```
* **Security & Operational Risk (CRITICAL)**: 
  - **Silenced Database Down States**: If the PostgreSQL database crashes or credentials expire, the API server will continue to respond with success codes and mock data instead of returning a proper `500 Internal Server Error` or triggering service alerts.
  - **Stale/Fake State Confusion**: Web clients will receive success notifications for actions (e.g., student attendance logging, expense logging, onboarding approvals) that never actually mutated state in the database.

### 3.2 Unverified Webhook Authenticity (Nepal Pay Webhook)
The payment callback route `/api/finances/nepalpay/webhook` processes payment success notifications, updates invoice states to `PAID`, and automatically reactivates blocked student enrollments.

**Code Analysis (`routes/finances.ts`):**
```typescript
router.post('/nepalpay/webhook', async (req: TenantRequest, res: Response) => {
  const { invoiceId, transactionId, status, paymentAmount } = req.body;
  // Directly updates database status if status === 'SUCCESS' without signature verification!
});
```
* **Security Risk (CRITICAL)**: 
  - **Payment Spoofing**: There is **no signature check**, secret token validation, or source IP verification. Anyone can send a forged POST request to this endpoint with a random `invoiceId` and `status: "SUCCESS"` to mark any invoice as paid and unblock student access without transferring any real funds.

### 3.3 Tenant Isolation Context Overrides
The `tenantMiddleware` checks for tenant headers and user authentication states:
```typescript
let tenantId = req.headers['x-tenant-id'] as string;
if (!tenantId && req.user) {
  tenantId = req.user.tenantId;
}
```
* **Security Risk (MEDIUM)**:
  - **Cross-Tenant Request Tampering**: If a user logges in as Tenant A but manually sets the request header `X-Tenant-Id` to Tenant B's ID, the middleware binds Tenant B's ID to `req.tenantId`. If downstream routes query the database using `req.tenantId` instead of the cryptographic claim in `req.user.tenantId`, Tenant A can successfully view/manipulate Tenant B's records.

### 3.4 Permissive CORS Configuration
The server initializes CORS without defining an origin allowlist:
```typescript
app.use(cors()); // Resolves to Access-Control-Allow-Origin: *
```
* **Security Risk (MEDIUM)**:
  - **Cross-Origin Exposure**: Allows any third-party domain to make credential-less requests to the API. In combination with stateless sessions stored in local storage, it broadens the exposure path for XSS-led request forging.

### 3.5 Lack of Input Validation Schemas
Request payloads are destructured directly from `req.body` and checked using basic javascript null checks (e.g., `if (!name || !email)`).
* **Security Risk (LOW/MEDIUM)**:
  - **Type & Payload Injection**: There is no enforcement of email formats, PAN numbers (should be exactly 9-digits in Nepal), string lengths, or numeric ranges. This makes database queries vulnerable to data corruption, buffer overflows, or validation failure rollbacks.

---

## 4. Deep-Dive Module Audits

### 4.1 Attendance Geofencing (`routes/attendance.ts`)
- **GPS Verification**:
  ```typescript
  if (Number(gpsAccuracy) > MAX_GPS_ACCURACY_METERS) { // 20m limit
    return res.status(422).json({ error: 'GPS accuracy too low...' });
  }
  ```
  This is a good guard. However, geofencing checks (`calculateDistanceInMeters`) depend on math calculations performed in JS memory. 
- **Recommendation**: To optimize query performance and improve historical audit reliability, database geofence evaluations should transition to PostgreSQL **PostGIS** queries (e.g., using `ST_DWithin` on geometry/geography data columns).

### 4.2 HR & Payroll Logic (`routes/finances.ts` & `routes/hr.ts`)
- **Salary Computation**:
  The payroll engine computes base salaries, bonus allocations, and attendance deductions. However, salary configurations are stored as raw JSON payloads (`salaryStructure` in `StaffRecord` table).
- **Recommendation**: Define a strict JSON schema for salary calculations. Storing unvalidated formulas in a JSON column leads to calculation discrepancies if data structures change between app releases.

### 4.3 Removed Optional Modules (July 2026 Update)
Following a scope optimization review, the optional **Cashless Canteen Wallet** (`routes/canteen.ts`) and **Live Bus tracking / Vehicle Routing** (`routes/vehicles.ts`) modules were completely removed from the core codebase:
- **Schema Cleanup**: Deleted `CanteenWallet`, `CanteenTransaction`, `VehicleRoute`, and `StudentVehicle` models and their associations from `schema.prisma`.
- **Backend Routing**: Detached route handlers from the Express `server.ts` entry point.
- **Frontend Dashboards**: Cleaned up the web admin dashboards, removing GPS map tracking components and canteen stats.
This eliminates the critical risk of canteen transaction PIN bypass and GPS spoofing vulnerabilities identified in our mobile services audit.

---

## 5. Actionable Roadmap & Recommendations

To bring the TMS backend to production readiness, we recommend addressing the discovered issues in three distinct phases:

### Phase 1: Security Hardening (Immediate)
1. **Disable Global Mock Fallbacks**:
   - Separate the database simulation logic from core handlers. Use an environment variable flag (e.g., `ALLOW_OFFLINE_SIMULATION=true`) to permit fallback behavior in development, but default to strict database errors (`throw error` resulting in HTTP 500) in staging and production.
2. **Nepal Pay Webhook Cryptographic Validation**:
   - Implement Hashing/Signature verification (e.g., HMAC-SHA256) matching the specification of the Nepal Pay payment gateway. Reject any incoming webhook request that fails validation.
3. **Tenant Context Verification**:
   - Update `tenantMiddleware` to assert that if both `req.headers['x-tenant-id']` and `req.user.tenantId` are present, they **must match**. If they mismatch, throw a `403 Forbidden` error.

### Phase 2: Structural Integrity (Medium-Term)
1. **API Input Validation**:
   - Integrate a validation library like **Zod** to validate schemas on all input request bodies. 
   - Define strict constraints (e.g., Nepal PAN format: 9 digits, phone format: starting with 9, valid email patterns).
2. **CORS Restrictions**:
   - Restrict the CORS origin configuration to the client's domain (e.g., `http://localhost:3000` or production domain) instead of wildcard `*`.
3. **Database Constraints**:
   - Move validation from application logic to database triggers or PostgreSQL constraints where possible (such as PAN format validation).

### Phase 3: Auditability & Operations (Long-Term)
1. **Rate Limiting**:
   - Install `express-rate-limit` to restrict request frequencies on critical endpoints (specifically `/api/auth/login`, `/api/auth/nepalpay/webhook`, and onboarding paths).
2. **Centralized Logging & Alerting**:
   - Implement a logging framework (like Winston or Pino) that logs database exceptions to cloud alerting mechanisms (e.g., Sentry, Datadog) rather than silently returning mock data.
