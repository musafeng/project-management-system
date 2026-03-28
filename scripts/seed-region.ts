/**
 * 初始化默认区域 + 回填旧数据 regionId
 * 运行方式: npx tsx scripts/seed-region.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // 1. 确保默认区域存在
  let defaultRegion = await db.region.findUnique({ where: { code: 'DEFAULT' } })

  if (!defaultRegion) {
    defaultRegion = await db.region.create({
      data: { name: '默认区域', code: 'DEFAULT', isActive: true },
    })
    console.log('✅ 默认区域已创建:', defaultRegion.id)
  } else {
    console.log('ℹ️  默认区域已存在:', defaultRegion.id)
  }

  const id = defaultRegion.id

  // 2. 回填旧数据（只更新 regionId 为 null 的记录）
  const results = await Promise.all([
    db.project.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.constructionApproval.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.projectContract.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.contractReceipt.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.procurementContract.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.procurementPayment.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.laborContract.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.laborPayment.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.subcontractContract.updateMany({ where: { regionId: null }, data: { regionId: id } }),
    db.subcontractPayment.updateMany({ where: { regionId: null }, data: { regionId: id } }),
  ])

  const names = [
    'Project', 'ConstructionApproval', 'ProjectContract', 'ContractReceipt',
    'ProcurementContract', 'ProcurementPayment', 'LaborContract', 'LaborPayment',
    'SubcontractContract', 'SubcontractPayment',
  ]

  results.forEach((r, i) => {
    console.log(`✅ ${names[i]}: 回填 ${r.count} 条`)
  })

  console.log('\n🎉 完成')
}

main().catch(console.error).finally(() => db.$disconnect())





