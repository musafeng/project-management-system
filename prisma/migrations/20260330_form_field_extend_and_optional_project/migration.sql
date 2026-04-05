-- Migration: FormField 扩展字段 + OtherReceipt/OtherPayment projectId 改为可选

-- 1. FormField 补充扩展字段
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "tableColumnsJson" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "dependsOn" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "dependsValue" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "computeFormula" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "linkedTable" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "linkedLabelField" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "linkedValueField" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "linkedCopyFields" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "placeholder" TEXT;
ALTER TABLE "FormField" ADD COLUMN IF NOT EXISTS "isReadonly" BOOLEAN NOT NULL DEFAULT false;

-- 2. OtherReceipt.projectId 改为可选（允许 NULL）
ALTER TABLE "OtherReceipt" ALTER COLUMN "projectId" DROP NOT NULL;

-- 3. OtherPayment.projectId 改为可选（允许 NULL）
ALTER TABLE "OtherPayment" ALTER COLUMN "projectId" DROP NOT NULL;







