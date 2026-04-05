-- CreateTable feature_flag
CREATE TABLE "feature_flag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "flagName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT 0,
  "enabledAt" DATETIME,
  "gradualType" TEXT,
  "gradualValue" TEXT,
  "environment" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "regionId" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_flagName_environment_regionId_key" ON "feature_flag"("flagName", "environment", "regionId");
CREATE INDEX "feature_flag_environment_idx" ON "feature_flag"("environment");
CREATE INDEX "feature_flag_flagName_idx" ON "feature_flag"("flagName");







