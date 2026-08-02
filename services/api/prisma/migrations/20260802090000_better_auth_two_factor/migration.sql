-- Better Auth two-factor plugin state. Email OTP is the enabled factor today;
-- the table keeps plugin-managed recovery and lockout state available for a
-- future authenticator-app rollout.
CREATE TABLE "TwoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TwoFactor_userId_key" ON "TwoFactor"("userId");
CREATE INDEX "TwoFactor_secret_idx" ON "TwoFactor"("secret");

ALTER TABLE "TwoFactor"
ADD CONSTRAINT "TwoFactor_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
