-- Keep the most authoritative invoice when an older deployment created the
-- same recurring student charge more than once. Paid records win, followed by
-- records with payment activity, then the oldest ledger entry.
WITH ranked AS (
  SELECT
    i."id",
    FIRST_VALUE(i."id") OVER (
      PARTITION BY i."studentId", i."invoiceType", i."billingCycleStart"
      ORDER BY
        CASE WHEN i."status" = 'PAID' THEN 0 ELSE 1 END,
        CASE WHEN EXISTS (SELECT 1 FROM "PaymentAttempt" p WHERE p."invoiceId" = i."id") THEN 0 ELSE 1 END,
        i."createdAt" ASC,
        i."id" ASC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY i."studentId", i."invoiceType", i."billingCycleStart"
      ORDER BY
        CASE WHEN i."status" = 'PAID' THEN 0 ELSE 1 END,
        CASE WHEN EXISTS (SELECT 1 FROM "PaymentAttempt" p WHERE p."invoiceId" = i."id") THEN 0 ELSE 1 END,
        i."createdAt" ASC,
        i."id" ASC
    ) AS duplicate_rank
  FROM "Invoice" i
), duplicates AS (
  SELECT "id", keeper_id FROM ranked WHERE duplicate_rank > 1
)
UPDATE "PaymentAttempt" p
SET "invoiceId" = d.keeper_id
FROM duplicates d
WHERE p."invoiceId" = d."id";

WITH ranked AS (
  SELECT
    i."id",
    ROW_NUMBER() OVER (
      PARTITION BY i."studentId", i."invoiceType", i."billingCycleStart"
      ORDER BY
        CASE WHEN i."status" = 'PAID' THEN 0 ELSE 1 END,
        i."createdAt" ASC,
        i."id" ASC
    ) AS duplicate_rank
  FROM "Invoice" i
)
DELETE FROM "Invoice" i
USING ranked r
WHERE i."id" = r."id" AND r.duplicate_rank > 1;

CREATE UNIQUE INDEX "Invoice_studentId_invoiceType_billingCycleStart_key"
ON "Invoice"("studentId", "invoiceType", "billingCycleStart");
