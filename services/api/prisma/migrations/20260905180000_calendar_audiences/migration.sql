ALTER TABLE "AcademicEvent" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'STAFF', ADD COLUMN "classId" TEXT;
-- Existing non-holiday records may contain staff information. Keep them staff-only
-- until an administrator explicitly chooses a wider audience.
UPDATE "AcademicEvent" SET "audience" = 'ALL' WHERE "eventType" = 'HOLIDAY';
ALTER TABLE "AcademicEvent" ADD CONSTRAINT "AcademicEvent_audience_check" CHECK ("audience" IN ('ALL', 'STAFF', 'STUDENTS', 'PARENTS'));
ALTER TABLE "AcademicEvent" ADD CONSTRAINT "AcademicEvent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "AcademicEvent_tenantId_branchId_classId_idx" ON "AcademicEvent"("tenantId", "branchId", "classId");
