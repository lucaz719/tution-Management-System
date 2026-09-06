ALTER TABLE "Enrollment"
ADD COLUMN "validFrom" TIMESTAMP(3),
ADD COLUMN "validUntil" TIMESTAMP(3);

WITH "paidAdmissions" AS (
  SELECT "studentId", MAX("paymentDate") AS "paidAt"
  FROM "Invoice"
  WHERE "invoiceType" = 'ADMISSION'
    AND "status" = 'PAID'
    AND "paymentDate" IS NOT NULL
  GROUP BY "studentId"
)
UPDATE "Enrollment" AS enrollment
SET
  "validFrom" = admission."paidAt",
  "validUntil" = admission."paidAt" + INTERVAL '1 year'
FROM "paidAdmissions" AS admission
WHERE enrollment."studentId" = admission."studentId"
  AND enrollment."status" IN ('ACTIVE', 'BLOCKED');

CREATE INDEX "Enrollment_studentId_validUntil_idx"
ON "Enrollment"("studentId", "validUntil");
