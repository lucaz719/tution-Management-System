ALTER TABLE "Payroll"
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "settlementReference" TEXT,
  ADD COLUMN "reconciledBy" TEXT;

ALTER TABLE "RefundRequest"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "settlementReference" TEXT,
  ADD COLUMN "settledAt" TIMESTAMP(3),
  ADD COLUMN "settledBy" TEXT,
  ADD COLUMN "settlementRemarks" TEXT;
