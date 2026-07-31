ALTER TABLE "MaintenanceTask"
ADD COLUMN "classroomId" TEXT NOT NULL DEFAULT 'Facility',
ADD COLUMN "completedById" TEXT,
ADD COLUMN "escalatedAt" TIMESTAMP(3);

CREATE INDEX "MaintenanceTask_assignedStaffId_status_idx"
ON "MaintenanceTask"("assignedStaffId", "status");
