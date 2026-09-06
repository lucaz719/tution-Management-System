-- Canonicalize legacy fixed-salary keys without inventing missing compensation.
UPDATE "StaffRecord"
SET "salaryStructure" = ("salaryStructure" - 'basicSalary' - 'basicMonthly') ||
  jsonb_build_object(
    'baseMonthlySalary',
    COALESCE(
      "salaryStructure"->'baseMonthlySalary',
      "salaryStructure"->'basicSalary',
      "salaryStructure"->'basicMonthly'
    )
  )
WHERE "contractType" = 'FIXED'
  AND COALESCE(
    "salaryStructure"->'baseMonthlySalary',
    "salaryStructure"->'basicSalary',
    "salaryStructure"->'basicMonthly'
  ) IS NOT NULL;

-- Preserve every removed duplicate as a JSON snapshot before enforcing uniqueness.
CREATE TABLE "PayrollDuplicateArchive" (
  "payrollId" TEXT PRIMARY KEY,
  "snapshot" JSONB NOT NULL,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT NOT NULL
);

WITH ranked AS (
  SELECT
    p."id",
    ROW_NUMBER() OVER (
      PARTITION BY p."staffRecordId", p."month", p."year"
      ORDER BY
        CASE p."status"
          WHEN 'MANUALLY_PAID' THEN 3
          WHEN 'APPROVED_FOR_MANUAL_PAYMENT' THEN 2
          ELSE 1
        END DESC,
        p."updatedAt" DESC,
        p."createdAt" DESC,
        p."id" DESC
    ) AS duplicate_rank
  FROM "Payroll" p
), duplicates AS (
  SELECT p.*
  FROM "Payroll" p
  INNER JOIN ranked r ON r."id" = p."id"
  WHERE r.duplicate_rank > 1
)
INSERT INTO "PayrollDuplicateArchive" ("payrollId", "snapshot", "reason")
SELECT d."id", to_jsonb(d), 'Duplicate staff/month/year removed before unique constraint'
FROM duplicates d;

DELETE FROM "Payroll" p
USING "PayrollDuplicateArchive" a
WHERE p."id" = a."payrollId";

CREATE UNIQUE INDEX "Payroll_staffRecordId_month_year_key"
ON "Payroll"("staffRecordId", "month", "year");
