CREATE TABLE "PettyCashFunding" (
 "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "branchId" TEXT NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0), "purpose" TEXT NOT NULL, "period" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','REJECTED')),
 "requestedBy" TEXT NOT NULL, "decidedBy" TEXT, "remarks" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PettyCashFunding_tenantId_branchId_period_status_idx" ON "PettyCashFunding"("tenantId","branchId","period","status");
ALTER TABLE "PettyCash" ADD COLUMN "releasedAt" TIMESTAMP(3);
UPDATE "PettyCash" SET "releasedAt" = "createdAt" WHERE "status" IN ('RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED');
