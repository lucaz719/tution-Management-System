CREATE TABLE "SyllabusTopic" (
  "id" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "status" "ChapterProgressStatus" NOT NULL DEFAULT 'LEFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyllabusTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopicProgressLog" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "logDate" DATE NOT NULL,
  "status" "ChapterProgressStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TopicProgressLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResultDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "testDate" DATE NOT NULL,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResultDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyllabusTopic_chapterId_position_key" ON "SyllabusTopic"("chapterId", "position");
CREATE UNIQUE INDEX "TopicProgressLog_topicId_logDate_key" ON "TopicProgressLog"("topicId", "logDate");
CREATE INDEX "TopicProgressLog_classId_logDate_idx" ON "TopicProgressLog"("classId", "logDate");
CREATE INDEX "ResultDefinition_tenantId_branchId_classId_isOpen_idx" ON "ResultDefinition"("tenantId", "branchId", "classId", "isOpen");
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "SyllabusChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicProgressLog" ADD CONSTRAINT "TopicProgressLog_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SyllabusTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
