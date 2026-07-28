# Tuition Management System (TMS) — Multi-Tenant SaaS Platform

A modern, cloud-based multi-tenant SaaS platform tailored for private tuition and educational institutions in Nepal. The system provides integrated tools for institution management, billing, employee payroll, accounting, vehicle tracking, and automated background notifications.

---

## 🚀 Technology Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (supporting multi-tenant row-level data isolation).
- **Web Frontend**: React 19, Vite, Vanilla CSS (with Outﬁt typography and fluid glassmorphic widgets).
- **Shared Packages**:
  - `packages/types`: Core TypeScript definitions.
  - `packages/ui-login`: Legacy Tailwind UI transactional login template.
- **Testing**: Native integration test suite running under ts-node.

---

## 🛠️ Project Architecture & Structure

```
tms-monorepo/
├── apps/
│   └── web/                  # Vite React 19 Frontend Web Dashboard
├── packages/
│   ├── types/                # Shared TypeScript Type Definitions
│   └── ui-login/             # Tailwind UI transactional login template
├── services/
│   └── api/                  # Node.js Express Backend API
│       ├── prisma/           # Prisma DB schema & migrations
│       └── src/
│           ├── middleware/   # JWT authentication & Row-level Tenant Isolation
│           ├── routes/       # API endpoints (finances, hr, attendance, etc.)
│           ├── utils/        # Notification gateways (mock SMS & Push)
│           └── test-tms.ts   # Comprehensive 25-step integration tests
└── tasklist.md               # Master phase tracking document
```

---

## 🔑 Core Features & Modules

### 1. Multi-Tenant Row-Level Isolation & RBAC
- Each database query is strictly scoped by `tenantId` context using `tenantMiddleware`.
- Strict RBAC validation using `hasPermission` middleware across all 9 roles: Super Admin, Tenant Admin, Branch Admin, Teacher, Accountant, Receptionist, Janitor, Student, and Parent/Guardian.

### 2. Geo-Attendance System
- **GPS geofence radius gate** (validated to under 20-meter precision).
- **Auto-departure trigger** logs exit and notifies Branch Admins when teachers leave the premises without marking out.
- **Attendance lockouts** prevent teachers from marking IN if previous day's class lesson updates are pending.

### 3. Financial & ERP Engine
- **Category Expenses**: Logs operation outlays (RENT, UTILITIES, MARKETING, SALARY, etc.).
- **Two-Level Petty Cash approval workflow**: Accountant Request $\rightarrow$ Branch Admin L1 approval $\rightarrow$ Tenant Admin L2 approval (fund release) $\rightarrow$ receipt verification $\rightarrow$ closure.
- **Salary Payroll calculations**: Supports fixed basic monthly salary and session-based hourly rates.
- **P&L dashboard**: Real-time compilations of revenues (invoices + canteen reloads) vs. outflows (expenses + payrolls + petty cash).
- **Ledger Export**: Excel Double-Entry ledger sheet export.

### 4. Specialized Courses & Refund Policies
- Configures specialized installment settings for `MUSIC` courses and fixed end-dates for `SHORT_TERM` courses.
- Course refund request system with policy-based pro-rata calculations.

### 5. Automated Background Operations
- **Monthly Dues check**: Escalates unpaid invoices to OVERDUE and blocks student roster attendance.
- **Notifications**: Mock Nepalese SMS gateway and FCM push dispatches for payment alerts, reminders, and emergencies.
- **Task Escalation**: Automatically escalates unresolved maintenance check log tasks older than 3 days.

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js v18.x or v20.x
- npm v9.x+ or yarn v3.x+
- PostgreSQL database

### 2. Installation
Install all dependencies in the root monorepo:
```bash
npm install
```

### 3. Database Migration
Ensure your PostgreSQL database environment is running, load migrations, and generate types:
```bash
cd services/api
npx prisma generate
```

### 4. Running the Dev Servers
Start both the backend API and React frontend dev server concurrently:
```bash
# In the root workspace
npm run dev
```
Alternatively, run them separately:
```bash
# Start backend API (Port 3001)
cd services/api
npm run dev

# Start Vite React Dashboard (Port 5173)
cd apps/web
npm run dev
```

### 5. Running the Integration Tests
Execute the 25-step verification test suite covering core, operational, and ERP workflows:
```bash
cd services/api
npx ts-node src/test-tms.ts
```
