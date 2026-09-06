-- Nursery and LKG are no longer part of the supported grade ladder.
-- Only unused legacy data is removed; linked academic or student records are preserved.
DELETE FROM "Course"
WHERE "gradeId" IN (
  SELECT "id" FROM "Grade" WHERE "name" IN ('Nursery', 'LKG')
)
AND NOT EXISTS (SELECT 1 FROM "Class" WHERE "Class"."courseId" = "Course"."id")
AND NOT EXISTS (SELECT 1 FROM "Enrollment" WHERE "Enrollment"."courseId" = "Course"."id");

DELETE FROM "Grade"
WHERE "name" IN ('Nursery', 'LKG')
AND NOT EXISTS (SELECT 1 FROM "Student" WHERE "Student"."gradeId" = "Grade"."id")
AND NOT EXISTS (SELECT 1 FROM "Course" WHERE "Course"."gradeId" = "Grade"."id");
