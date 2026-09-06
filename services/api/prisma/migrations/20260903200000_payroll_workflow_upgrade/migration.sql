CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'APPROVED_FOR_MANUAL_PAYMENT', 'MANUALLY_PAID');

ALTER TABLE "Payroll"
  ADD COLUMN "payslipNumber" TEXT,
  ADD COLUMN "calculationBreakdown" JSONB,
  ADD COLUMN "adjustmentRemarks" TEXT,
  ADD COLUMN "calculatedBy" TEXT,
  ADD COLUMN "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "paymentEvidence" TEXT,
  ADD COLUMN "settlementDate" TIMESTAMP(3);

UPDATE "Payroll"
SET
  "payslipNumber" = 'PS-' || "year"::text || LPAD("month"::text, 2, '0') || '-' || UPPER(SUBSTRING("id", 1, 8)),
  "calculationBreakdown" = jsonb_build_object(
    'baseSalary', ROUND("baseSalary"::numeric, 2),
    'bonuses', ROUND("bonuses"::numeric, 2),
    'deductions', ROUND("attendanceDeductions"::numeric, 2),
    'netPayable', ROUND("netPayable"::numeric, 2),
    'source', 'LEGACY_MIGRATION'
  ),
  "settlementDate" = "paymentDate"
WHERE "payslipNumber" IS NULL;

ALTER TABLE "Payroll"
  ALTER COLUMN "payslipNumber" SET NOT NULL,
  ALTER COLUMN "calculationBreakdown" SET NOT NULL,
  ALTER COLUMN "baseSalary" TYPE DECIMAL(12,2) USING ROUND("baseSalary"::numeric, 2),
  ALTER COLUMN "attendanceDeductions" TYPE DECIMAL(12,2) USING ROUND("attendanceDeductions"::numeric, 2),
  ALTER COLUMN "bonuses" TYPE DECIMAL(12,2) USING ROUND("bonuses"::numeric, 2),
  ALTER COLUMN "netPayable" TYPE DECIMAL(12,2) USING ROUND("netPayable"::numeric, 2),
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PayrollStatus" USING "status"::"PayrollStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "Payroll_payslipNumber_key" ON "Payroll"("payslipNumber");
CREATE INDEX "Payroll_tenantId_year_month_status_idx" ON "Payroll"("tenantId", "year", "month", "status");
