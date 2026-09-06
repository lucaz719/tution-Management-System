ALTER TABLE "PaymentAttempt"
ADD COLUMN "receiptProof" TEXT,
ADD COLUMN "receiptMimeType" TEXT,
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewRemarks" TEXT;
