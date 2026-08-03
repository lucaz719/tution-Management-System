CREATE TABLE "FeeAccessOverride" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL, "scope" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL, "grantedByName" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeeAccessOverride_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BranchSocialDraft" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL, "text" TEXT NOT NULL, "mediaUrls" JSONB,
  "platforms" JSONB NOT NULL, "proposedTime" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchSocialDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeeAccessOverride_tenantId_branchId_studentId_createdAt_idx" ON "FeeAccessOverride"("tenantId", "branchId", "studentId", "createdAt");
CREATE INDEX "BranchSocialDraft_tenantId_branchId_authorId_status_idx" ON "BranchSocialDraft"("tenantId", "branchId", "authorId", "status");
