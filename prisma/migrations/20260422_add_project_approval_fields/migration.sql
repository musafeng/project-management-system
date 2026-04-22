ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

ALTER TABLE "ProjectContract"
  ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

UPDATE "Project"
SET "approvalStatus" = COALESCE("approvalStatus", 'APPROVED');

UPDATE "ProjectContract"
SET "approvalStatus" = COALESCE("approvalStatus", 'APPROVED');

ALTER TABLE "Project"
  ALTER COLUMN "approvalStatus" SET DEFAULT 'APPROVED';

ALTER TABLE "ProjectContract"
  ALTER COLUMN "approvalStatus" SET DEFAULT 'APPROVED';

CREATE INDEX IF NOT EXISTS "Project_approvalStatus_idx" ON "Project" ("approvalStatus");
CREATE INDEX IF NOT EXISTS "ProjectContract_approvalStatus_idx" ON "ProjectContract" ("approvalStatus");
