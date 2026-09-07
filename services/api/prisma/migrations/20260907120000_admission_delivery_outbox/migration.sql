ALTER TABLE "AdmissionLoginDelivery"
  ADD COLUMN "encryptedPayload" TEXT,
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseUntil" TIMESTAMP(3),
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "AdmissionLoginDelivery_status_nextAttemptAt_leaseUntil_idx"
  ON "AdmissionLoginDelivery"("status", "nextAttemptAt", "leaseUntil");
