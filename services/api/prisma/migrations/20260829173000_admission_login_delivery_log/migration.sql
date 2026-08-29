CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "AdmissionLoginRecipient" AS ENUM ('STUDENT', 'PARENT');

CREATE TABLE "AdmissionLoginDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipient" "AdmissionLoginRecipient" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "provider" TEXT NOT NULL DEFAULT 'AAKASH',
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionLoginDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdmissionLoginDelivery_studentId_recipient_key"
ON "AdmissionLoginDelivery"("studentId", "recipient");

CREATE INDEX "AdmissionLoginDelivery_tenantId_status_updatedAt_idx"
ON "AdmissionLoginDelivery"("tenantId", "status", "updatedAt");

ALTER TABLE "AdmissionLoginDelivery"
ADD CONSTRAINT "AdmissionLoginDelivery_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdmissionLoginDelivery"
ADD CONSTRAINT "AdmissionLoginDelivery_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdmissionLoginDelivery"
ADD CONSTRAINT "AdmissionLoginDelivery_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
