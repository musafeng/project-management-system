-- Migration: 修复 FeatureFlag 唯一约束
-- 目的：使用 PostgreSQL 部分唯一索引解决 NULL 值重复问题
-- 
-- 策略：
-- 1. 删除原有的全量唯一索引
-- 2. 创建两个部分唯一索引：
--    - 全局 Flag（regionId IS NULL）：flagName + environment
--    - 区域 Flag（regionId IS NOT NULL）：flagName + environment + regionId

-- 删除原有的全量唯一索引
DROP INDEX IF EXISTS "feature_flag_flagName_environment_regionId_key";

-- 创建部分唯一索引：全局 Flag（regionId IS NULL）
CREATE UNIQUE INDEX "feature_flag_global_unique_idx" 
ON "feature_flag"("flagName", "environment") 
WHERE "regionId" IS NULL;

-- 创建部分唯一索引：区域 Flag（regionId IS NOT NULL）
CREATE UNIQUE INDEX "feature_flag_regional_unique_idx" 
ON "feature_flag"("flagName", "environment", "regionId") 
WHERE "regionId" IS NOT NULL;


