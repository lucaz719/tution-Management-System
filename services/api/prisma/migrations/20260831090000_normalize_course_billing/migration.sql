-- Specialized programmes are always optional activities and billed separately.
UPDATE "Course"
SET "isExtraActivity" = true
WHERE "type" <> 'REGULAR';

-- Regular subjects in package-billed grades are included in grade tuition.
UPDATE "Course" AS course
SET "feeStructure" = jsonb_set(COALESCE(course."feeStructure", '{}'::jsonb), '{monthlyBase}', '0'::jsonb, true)
FROM "Grade" AS grade
WHERE course."gradeId" = grade."id"
  AND grade."billingMode" = 'GRADE'
  AND course."type" = 'REGULAR'
  AND course."isExtraActivity" = false;
