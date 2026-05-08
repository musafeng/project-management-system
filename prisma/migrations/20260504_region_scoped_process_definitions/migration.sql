ALTER TABLE "ProcessDefinition" ADD COLUMN IF NOT EXISTS "regionId" TEXT;

UPDATE "ProcessDefinition"
SET "regionId" = COALESCE(
  "regionId",
  (
    SELECT "id"
    FROM "Region"
    WHERE "isActive" = true
    ORDER BY CASE WHEN "code" = 'DEFAULT' THEN 0 ELSE 1 END, "createdAt" ASC
    LIMIT 1
  )
)
WHERE "regionId" IS NULL;

ALTER TABLE "ProcessDefinition"
  DROP CONSTRAINT IF EXISTS "ProcessDefinition_resourceType_key";

CREATE INDEX IF NOT EXISTS "ProcessDefinition_regionId_idx"
  ON "ProcessDefinition" ("regionId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessDefinition_regionId_resourceType_key"
  ON "ProcessDefinition" ("regionId", "resourceType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcessDefinition_regionId_fkey'
  ) THEN
    ALTER TABLE "ProcessDefinition"
      ADD CONSTRAINT "ProcessDefinition_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
