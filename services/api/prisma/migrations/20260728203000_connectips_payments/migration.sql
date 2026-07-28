CREATE TYPE "PaymentProvider" AS ENUM ('CONNECTIPS', 'NEPALPAY', 'CASH', 'BANK');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'VALIDATING', 'SUCCESS', 'FAILED', 'INCOMPLETE');

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "txnId" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "amountPaisa" BIGINT NOT NULL,
  "gatewayStatus" TEXT,
  "gatewayMessage" TEXT,
  "validationAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastValidatedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_txnId_key" ON "PaymentAttempt"("txnId");
CREATE INDEX "PaymentAttempt_tenantId_status_createdAt_idx" ON "PaymentAttempt"("tenantId", "status", "createdAt");
CREATE INDEX "PaymentAttempt_invoiceId_provider_status_idx" ON "PaymentAttempt"("invoiceId", "provider", "status");

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
