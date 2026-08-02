CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

CREATE TABLE "AuthSecurityEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthSecurityEvent_event_createdAt_idx"
ON "AuthSecurityEvent"("event", "createdAt");
