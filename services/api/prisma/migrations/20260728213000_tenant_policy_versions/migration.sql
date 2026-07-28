CREATE TYPE "RefundPolicy" AS ENUM ('PRO_RATA', 'FIXED_DEDUCTION', 'NO_REFUND');
CREATE TYPE "LateFeeMode" AS ENUM ('FLAT', 'PERCENTAGE');

ALTER TABLE "Tenant"
  ADD COLUMN "refundPolicy" "RefundPolicy" NOT NULL DEFAULT 'NO_REFUND',
  ADD COLUMN "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lateFeeMode" "LateFeeMode",
  ADD COLUMN "lateFeeValue" DECIMAL(12,2),
  ADD COLUMN "lateFeeGraceDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "appointmentWindowHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "maintenanceEscalationDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "leavePolicy" JSONB,
  ADD COLUMN "performanceWeights" JSONB;

ALTER TABLE "Invoice"
  ADD COLUMN "panNumberSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "vatRateSnapshot" DECIMAL(5,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "Leave" ADD COLUMN "policySnapshot" JSONB;
ALTER TABLE "PettyCash" ADD COLUMN "policySnapshot" JSONB;
ALTER TABLE "MaintenanceTask" ADD COLUMN "escalationDaysSnapshot" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "RefundRequest" ADD COLUMN "policySnapshot" JSONB;

CREATE TABLE "TenantPolicyVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "config" JSONB NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantPolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantPolicyVersion_tenantId_version_key" ON "TenantPolicyVersion"("tenantId", "version");
CREATE INDEX "TenantPolicyVersion_tenantId_effectiveFrom_idx" ON "TenantPolicyVersion"("tenantId", "effectiveFrom");
ALTER TABLE "TenantPolicyVersion"
  ADD CONSTRAINT "TenantPolicyVersion_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
