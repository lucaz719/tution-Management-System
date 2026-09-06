ALTER TABLE "Invoice"
ADD COLUMN "lineItemsSnapshot" JSONB;

UPDATE "Invoice"
SET "lineItemsSnapshot" = jsonb_build_array(
  jsonb_build_object(
    'label', CASE "invoiceType"::text
      WHEN 'ADMISSION' THEN 'One-time admission fee'
      WHEN 'SUBJECT' THEN 'Monthly subject tuition'
      WHEN 'ACTIVITY' THEN 'Optional activity fee'
      ELSE 'Monthly grade tuition'
    END,
    'amount', "amount"
  )
)
WHERE "lineItemsSnapshot" IS NULL;
