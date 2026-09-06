UPDATE "Class"
SET "schedule" = COALESCE((
  SELECT jsonb_agg(
    CASE
      WHEN slot ? 'day'
        AND ((slot ? 'startTime' AND slot ? 'endTime') OR (slot ? 'start' AND slot ? 'end'))
      THEN jsonb_build_object(
        'day', slot ->> 'day',
        'startTime', COALESCE(slot ->> 'startTime', slot ->> 'start'),
        'endTime', COALESCE(slot ->> 'endTime', slot ->> 'end'),
        'room', COALESCE(slot ->> 'room', '')
      )
      ELSE slot
    END
    ORDER BY position
  )
  FROM jsonb_array_elements("Class"."schedule") WITH ORDINALITY AS entries(slot, position)
), '[]'::jsonb)
WHERE jsonb_typeof("schedule") = 'array';
