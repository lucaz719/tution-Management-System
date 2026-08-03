ALTER TABLE "StudentScore"
  ADD COLUMN "passMarks" DECIMAL(8,2),
  ADD COLUMN "percentile" DECIMAL(8,2),
  ADD COLUMN "resultSheetUrl" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "StudentScore" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

CREATE TYPE "ChapterProgressStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'LEFT');

CREATE TABLE "Syllabus" (
  "id" TEXT NOT NULL, "classId" TEXT NOT NULL, "subject" TEXT NOT NULL, "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SyllabusChapter" (
  "id" TEXT NOT NULL, "syllabusId" TEXT NOT NULL, "title" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "status" "ChapterProgressStatus" NOT NULL DEFAULT 'LEFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SyllabusChapter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DailyLessonLog" (
  "id" TEXT NOT NULL, "syllabusId" TEXT NOT NULL, "chapterId" TEXT NOT NULL, "teacherId" TEXT NOT NULL,
  "classId" TEXT NOT NULL, "logDate" DATE NOT NULL, "status" "ChapterProgressStatus" NOT NULL, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyLessonLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Syllabus_classId_subject_key" ON "Syllabus"("classId", "subject");
CREATE INDEX "Syllabus_createdBy_classId_idx" ON "Syllabus"("createdBy", "classId");
CREATE UNIQUE INDEX "SyllabusChapter_syllabusId_position_key" ON "SyllabusChapter"("syllabusId", "position");
CREATE UNIQUE INDEX "DailyLessonLog_chapterId_logDate_key" ON "DailyLessonLog"("chapterId", "logDate");
CREATE INDEX "DailyLessonLog_classId_logDate_idx" ON "DailyLessonLog"("classId", "logDate");
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyllabusChapter" ADD CONSTRAINT "SyllabusChapter_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyLessonLog" ADD CONSTRAINT "DailyLessonLog_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyLessonLog" ADD CONSTRAINT "DailyLessonLog_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "SyllabusChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
