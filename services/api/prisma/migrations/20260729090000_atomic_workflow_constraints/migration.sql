CREATE UNIQUE INDEX "HomeworkSubmission_homeworkId_studentId_key"
ON "HomeworkSubmission"("homeworkId", "studentId");

CREATE UNIQUE INDEX "Invoice_transactionId_key"
ON "Invoice"("transactionId");
