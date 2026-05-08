ALTER TABLE "ProjectContractChange" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "OtherReceipt" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "OtherPayment" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "ManagementExpense" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "SalesExpense" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "PettyCash" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "LaborWorker" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "SubcontractVendor" ADD COLUMN IF NOT EXISTS "regionId" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectContractChange_regionId_idx" ON "ProjectContractChange" ("regionId");
CREATE INDEX IF NOT EXISTS "OtherReceipt_regionId_idx" ON "OtherReceipt" ("regionId");
CREATE INDEX IF NOT EXISTS "OtherPayment_regionId_idx" ON "OtherPayment" ("regionId");
CREATE INDEX IF NOT EXISTS "ManagementExpense_regionId_idx" ON "ManagementExpense" ("regionId");
CREATE INDEX IF NOT EXISTS "SalesExpense_regionId_idx" ON "SalesExpense" ("regionId");
CREATE INDEX IF NOT EXISTS "PettyCash_regionId_idx" ON "PettyCash" ("regionId");
CREATE INDEX IF NOT EXISTS "Customer_regionId_idx" ON "Customer" ("regionId");
CREATE INDEX IF NOT EXISTS "Supplier_regionId_idx" ON "Supplier" ("regionId");
CREATE INDEX IF NOT EXISTS "LaborWorker_regionId_idx" ON "LaborWorker" ("regionId");
CREATE INDEX IF NOT EXISTS "SubcontractVendor_regionId_idx" ON "SubcontractVendor" ("regionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectContractChange_regionId_fkey'
  ) THEN
    ALTER TABLE "ProjectContractChange"
      ADD CONSTRAINT "ProjectContractChange_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OtherReceipt_regionId_fkey'
  ) THEN
    ALTER TABLE "OtherReceipt"
      ADD CONSTRAINT "OtherReceipt_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OtherPayment_regionId_fkey'
  ) THEN
    ALTER TABLE "OtherPayment"
      ADD CONSTRAINT "OtherPayment_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManagementExpense_regionId_fkey'
  ) THEN
    ALTER TABLE "ManagementExpense"
      ADD CONSTRAINT "ManagementExpense_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SalesExpense_regionId_fkey'
  ) THEN
    ALTER TABLE "SalesExpense"
      ADD CONSTRAINT "SalesExpense_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PettyCash_regionId_fkey'
  ) THEN
    ALTER TABLE "PettyCash"
      ADD CONSTRAINT "PettyCash_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Customer_regionId_fkey'
  ) THEN
    ALTER TABLE "Customer"
      ADD CONSTRAINT "Customer_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Supplier_regionId_fkey'
  ) THEN
    ALTER TABLE "Supplier"
      ADD CONSTRAINT "Supplier_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LaborWorker_regionId_fkey'
  ) THEN
    ALTER TABLE "LaborWorker"
      ADD CONSTRAINT "LaborWorker_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SubcontractVendor_regionId_fkey'
  ) THEN
    ALTER TABLE "SubcontractVendor"
      ADD CONSTRAINT "SubcontractVendor_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
