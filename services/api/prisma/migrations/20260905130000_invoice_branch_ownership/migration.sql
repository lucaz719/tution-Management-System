ALTER TABLE "Invoice" ADD COLUMN "branchId" TEXT;

UPDATE "Invoice" AS invoice
SET "branchId" = COALESCE(
  (
    SELECT MIN(course."branchId")
    FROM "Enrollment" enrollment
    JOIN "Course" course ON course."id" = enrollment."courseId"
    JOIN "Branch" branch ON branch."id" = course."branchId" AND branch."tenantId" = invoice."tenantId"
    WHERE enrollment."studentId" = invoice."studentId"
    HAVING COUNT(DISTINCT course."branchId") = 1
  ),
  (
    SELECT MIN(user_role."branchId")
    FROM "Student" student
    JOIN "UserRole" user_role ON user_role."userId" = student."userId"
    JOIN "Branch" branch ON branch."id" = user_role."branchId" AND branch."tenantId" = invoice."tenantId"
    WHERE student."id" = invoice."studentId" AND user_role."branchId" IS NOT NULL
    HAVING COUNT(DISTINCT user_role."branchId") = 1
  )
)
WHERE invoice."branchId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Invoice" WHERE "branchId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign branch ownership to every existing invoice';
  END IF;
END $$;

ALTER TABLE "Invoice" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Invoice_tenantId_branchId_dueDate_idx" ON "Invoice"("tenantId", "branchId", "dueDate");

ALTER TABLE "PaymentAttempt" ADD COLUMN "branchId" TEXT;
UPDATE "PaymentAttempt" payment
SET "branchId" = invoice."branchId"
FROM "Invoice" invoice
WHERE payment."invoiceId" = invoice."id" AND payment."tenantId" = invoice."tenantId";

ALTER TABLE "Payroll" ADD COLUMN "branchId" TEXT;
UPDATE "Payroll" payroll
SET "branchId" = ownership."branchId"
FROM (
  SELECT staff."id" AS "staffRecordId", staff_user."tenantId", MIN(user_role."branchId") AS "branchId"
  FROM "StaffRecord" staff
  JOIN "User" staff_user ON staff_user."id" = staff."userId"
  JOIN "UserRole" user_role ON user_role."userId" = staff_user."id" AND user_role."branchId" IS NOT NULL
  JOIN "Branch" branch ON branch."id" = user_role."branchId" AND branch."tenantId" = staff_user."tenantId"
  GROUP BY staff."id", staff_user."tenantId"
  HAVING COUNT(DISTINCT user_role."branchId") = 1
) ownership
WHERE payroll."staffRecordId" = ownership."staffRecordId" AND payroll."tenantId" = ownership."tenantId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PaymentAttempt" WHERE "branchId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign branch ownership to every existing payment attempt';
  END IF;
  IF EXISTS (SELECT 1 FROM "Payroll" WHERE "branchId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign branch ownership to every existing payroll record';
  END IF;
END $$;

ALTER TABLE "PaymentAttempt" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PaymentAttempt_tenantId_branchId_createdAt_idx" ON "PaymentAttempt"("tenantId", "branchId", "createdAt");

ALTER TABLE "Payroll" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Payroll_tenantId_branchId_year_month_idx" ON "Payroll"("tenantId", "branchId", "year", "month");

-- Finance ownership is historical: later staff/student transfers must not rewrite it.
CREATE FUNCTION prevent_finance_branch_reassignment() RETURNS trigger AS $$
BEGIN
  IF NEW."branchId" IS DISTINCT FROM OLD."branchId" THEN
    RAISE EXCEPTION 'Finance branch ownership is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PaymentAttempt_branchId_immutable"
BEFORE UPDATE ON "PaymentAttempt"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_branch_reassignment();

CREATE TRIGGER "Payroll_branchId_immutable"
BEFORE UPDATE ON "Payroll"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_branch_reassignment();

CREATE FUNCTION enforce_payment_attempt_ownership() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Invoice"
    WHERE "id" = NEW."invoiceId"
      AND "tenantId" = NEW."tenantId"
      AND "branchId" = NEW."branchId"
  ) THEN
    RAISE EXCEPTION 'Payment attempt ownership must match its invoice';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PaymentAttempt_ownership_matches_invoice"
BEFORE INSERT OR UPDATE OF "invoiceId", "tenantId", "branchId" ON "PaymentAttempt"
FOR EACH ROW EXECUTE FUNCTION enforce_payment_attempt_ownership();

CREATE FUNCTION enforce_payroll_ownership() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "StaffRecord" staff
    JOIN "User" staff_user ON staff_user."id" = staff."userId"
    JOIN "UserRole" user_role ON user_role."userId" = staff_user."id"
    WHERE staff."id" = NEW."staffRecordId"
      AND staff_user."tenantId" = NEW."tenantId"
      AND user_role."branchId" = NEW."branchId"
  ) THEN
    RAISE EXCEPTION 'Payroll ownership must match a current staff branch assignment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Payroll_ownership_matches_staff"
BEFORE INSERT OR UPDATE OF "staffRecordId", "tenantId", "branchId" ON "Payroll"
FOR EACH ROW EXECUTE FUNCTION enforce_payroll_ownership();
