ALTER TABLE "Class"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedBy" TEXT;

DROP INDEX IF EXISTS "Class_branchId_academicYear_effectiveFrom_effectiveUntil_idx";
CREATE INDEX "Class_branchId_archivedAt_academicYear_effectiveFrom_effectiveUntil_idx"
ON "Class"("branchId", "archivedAt", "academicYear", "effectiveFrom", "effectiveUntil");
