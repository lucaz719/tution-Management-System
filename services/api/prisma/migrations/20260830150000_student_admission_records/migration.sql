ALTER TABLE "Student"
ADD COLUMN "admissionNumber" TEXT,
ADD COLUMN "admissionRecord" JSONB;

CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");
