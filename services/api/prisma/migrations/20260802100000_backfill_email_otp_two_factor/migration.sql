-- Legacy users could have twoFactorEnabled=true before Better Auth's plugin
-- table existed. Email OTP needs a plugin row for lockout/account state even
-- though it does not use a TOTP secret. Backfill those users safely.
INSERT INTO "TwoFactor" (
  "id",
  "secret",
  "backupCodes",
  "userId",
  "verified",
  "failedVerificationCount"
)
SELECT
  'email-otp-' || "User"."id",
  'email-otp-legacy-placeholder',
  '[]',
  "User"."id",
  true,
  0
FROM "User"
LEFT JOIN "TwoFactor" ON "TwoFactor"."userId" = "User"."id"
WHERE "User"."twoFactorEnabled" = true
  AND "TwoFactor"."id" IS NULL;
