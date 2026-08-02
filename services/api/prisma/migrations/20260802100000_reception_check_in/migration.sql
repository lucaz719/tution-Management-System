CREATE TABLE "ReceptionCheckIn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "checkedInById" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceptionCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceptionCheckIn_branchId_studentId_checkInDate_key"
ON "ReceptionCheckIn"("branchId", "studentId", "checkInDate");
CREATE INDEX "ReceptionCheckIn_tenantId_branchId_checkInDate_idx"
ON "ReceptionCheckIn"("tenantId", "branchId", "checkInDate");
