const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const featureFlags = []

async function seedFeatureFlag(flag) {
  if (!prisma.featureFlag) {
    console.warn('[seed] Prisma Client 未暴露 featureFlag 模型，跳过 FeatureFlag 初始化。')
    return
  }

  const where = {
    flagName: flag.flagName,
    environment: flag.environment,
    regionId: flag.regionId === null ? null : flag.regionId,
  }

  const existing = await prisma.featureFlag.findFirst({ where })

  if (existing) {
    await prisma.featureFlag.update({
      where: { id: existing.id },
      data: flag,
    })
    return
  }

  await prisma.featureFlag.create({
    data: flag,
  })
}

async function main() {
  for (const flag of featureFlags) {
    await seedFeatureFlag(flag)
  }
}

main()
  .catch((error) => {
    console.error('[seed] 执行失败:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
