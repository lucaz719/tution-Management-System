ALTER TABLE "Class"
ADD COLUMN "academicYear" TEXT NOT NULL DEFAULT '',
ADD COLUMN "effectiveFrom" DATE,
ADD COLUMN "effectiveUntil" DATE;

CREATE TABLE "TimetableVersion" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "effectiveFrom" DATE,
  "effectiveUntil" DATE,
  "teacherId" TEXT,
  "name" TEXT NOT NULL,
  "schedule" JSONB NOT NULL,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimetableVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimetableVersion_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Class_branchId_academicYear_effectiveFrom_effectiveUntil_idx" ON "Class"("branchId", "academicYear", "effectiveFrom", "effectiveUntil");
CREATE UNIQUE INDEX "TimetableVersion_classId_version_key" ON "TimetableVersion"("classId", "version");
CREATE INDEX "TimetableVersion_classId_createdAt_idx" ON "TimetableVersion"("classId", "createdAt");
CREATE INDEX "TeacherSession_teacherId_classId_date_idx" ON "TeacherSession"("teacherId", "classId", "date");
