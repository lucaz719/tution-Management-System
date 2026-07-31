CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'ALTERNATIVE_PROPOSED', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "PerformanceSignal" AS ENUM ('IMPROVING', 'STABLE', 'NEEDS_SUPPORT');

CREATE TABLE "ParentMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "messageText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "ParentMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "scheduledTime" TIMESTAMP(3) NOT NULL,
  "alternativeTime" TIMESTAMP(3),
  "originalAppointmentId" TEXT,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "isGroup" BOOLEAN NOT NULL DEFAULT false,
  "participantIds" JSONB,
  "participantApprovals" JSONB,
  "remarks" TEXT,
  "responseRemarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentRemark" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "signal" "PerformanceSignal" NOT NULL DEFAULT 'STABLE',
  "parentVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentRemark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentScore" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "recordedBy" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "assessment" TEXT NOT NULL,
  "score" DECIMAL(8,2) NOT NULL,
  "maximum" DECIMAL(8,2) NOT NULL,
  "testDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ParentMessage_tenantId_studentId_senderId_receiverId_createdAt_idx" ON "ParentMessage"("tenantId", "studentId", "senderId", "receiverId", "createdAt");
CREATE INDEX "Appointment_tenantId_studentId_scheduledTime_idx" ON "Appointment"("tenantId", "studentId", "scheduledTime");
CREATE INDEX "Appointment_teacherId_status_scheduledTime_idx" ON "Appointment"("teacherId", "status", "scheduledTime");
CREATE INDEX "Appointment_originalAppointmentId_idx" ON "Appointment"("originalAppointmentId");
CREATE INDEX "StudentRemark_tenantId_studentId_parentVisible_createdAt_idx" ON "StudentRemark"("tenantId", "studentId", "parentVisible", "createdAt");
CREATE INDEX "StudentScore_tenantId_studentId_subject_testDate_idx" ON "StudentScore"("tenantId", "studentId", "subject", "testDate");

ALTER TABLE "ParentMessage" ADD CONSTRAINT "ParentMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentMessage" ADD CONSTRAINT "ParentMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentMessage" ADD CONSTRAINT "ParentMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentMessage" ADD CONSTRAINT "ParentMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRemark" ADD CONSTRAINT "StudentRemark_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRemark" ADD CONSTRAINT "StudentRemark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRemark" ADD CONSTRAINT "StudentRemark_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentScore" ADD CONSTRAINT "StudentScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentScore" ADD CONSTRAINT "StudentScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentScore" ADD CONSTRAINT "StudentScore_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
