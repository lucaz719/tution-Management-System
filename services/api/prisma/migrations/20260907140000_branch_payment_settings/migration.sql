-- Branch-specific payment settings (e.g., static QR code per branch)
CREATE TABLE "BranchPaymentSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "branchId" TEXT NOT NULL UNIQUE,
  "tenantId" TEXT NOT NULL,
  
  -- Static QR configuration (branch-specific)
  "staticQrEnabled" BOOLEAN NOT NULL DEFAULT false,
  "staticQrImageUrl" TEXT,
  "accountName" TEXT,
  "accountNumber" TEXT,
  "bankName" TEXT,
  "instructions" TEXT,
  
  -- Audit
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "BranchPaymentSettings_branchId_fk" 
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
  CONSTRAINT "BranchPaymentSettings_tenantId_fk" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "BranchPaymentSettings_tenantId_idx" ON "BranchPaymentSettings"("tenantId");
CREATE INDEX "BranchPaymentSettings_branchId_tenantId_idx" ON "BranchPaymentSettings"("branchId", "tenantId");
