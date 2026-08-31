-- Standard institutional billing policy:
-- UKG through Class 10 use one grade package; Class 11 and 12 bill by subject.
UPDATE "Grade"
SET "billingMode" = 'GRADE'
WHERE upper(regexp_replace("name", '[[:space:]]+', '', 'g')) IN (
  'UKG', 'CLASS1', 'GRADE1', 'CLASS2', 'GRADE2', 'CLASS3', 'GRADE3',
  'CLASS4', 'GRADE4', 'CLASS5', 'GRADE5', 'CLASS6', 'GRADE6',
  'CLASS7', 'GRADE7', 'CLASS8', 'GRADE8', 'CLASS9', 'GRADE9',
  'CLASS10', 'GRADE10'
);

UPDATE "Grade"
SET "billingMode" = 'SUBJECT', "monthlyFee" = 0
WHERE upper(regexp_replace("name", '[[:space:]]+', '', 'g')) IN (
  'CLASS11', 'GRADE11', 'CLASS12', 'GRADE12'
);
