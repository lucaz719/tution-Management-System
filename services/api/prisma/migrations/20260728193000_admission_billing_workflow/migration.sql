CREATE TYPE "InvoiceType" AS ENUM ('ADMISSION', 'TUITION', 'SUBJECT', 'ACTIVITY');
CREATE TYPE "GradeBillingMode" AS ENUM ('GRADE', 'SUBJECT');
CREATE TYPE "AdmissionStatus" AS ENUM ('PENDING_PAYMENT', 'READY_FOR_LOGIN', 'ACTIVE');

ALTER TABLE "Grade"
  ADD COLUMN "admissionFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "billingMode" "GradeBillingMode" NOT NULL DEFAULT 'GRADE';

ALTER TABLE "Student"
  ADD COLUMN "admissionStatus" "AdmissionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';

ALTER TABLE "Course"
  ADD COLUMN "isExtraActivity" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Invoice"
  ADD COLUMN "invoiceType" "InvoiceType" NOT NULL DEFAULT 'TUITION';

CREATE INDEX "Invoice_tenantId_studentId_invoiceType_status_idx"
  ON "Invoice"("tenantId", "studentId", "invoiceType", "status");
