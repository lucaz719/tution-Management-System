ALTER TABLE "StudentScore"
ADD COLUMN "resultDefinitionId" TEXT;

ALTER TABLE "ResultDefinition"
ADD CONSTRAINT "ResultDefinition_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentScore"
ADD CONSTRAINT "StudentScore_resultDefinitionId_fkey"
FOREIGN KEY ("resultDefinitionId") REFERENCES "ResultDefinition"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "StudentScore_resultDefinitionId_studentId_key"
ON "StudentScore"("resultDefinitionId", "studentId");
