/**
 * 流程底座 seed 脚本
 * 为每个业务资源类型初始化默认流程定义（1个节点，ADMIN审批）
 * 运行: npx tsx scripts/seed-process.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const RESOURCE_TYPES = [
  { resourceType: 'construction-approvals', name: '施工立项审批' },
  { resourceType: 'procurement-contracts', name: '采购合同审批' },
  { resourceType: 'procurement-payments', name: '采购付款审批' },
  { resourceType: 'labor-contracts', name: '劳务合同审批' },
  { resourceType: 'labor-payments', name: '劳务付款审批' },
  { resourceType: 'subcontract-contracts', name: '分包合同审批' },
  { resourceType: 'subcontract-payments', name: '分包付款审批' },
]

async function main() {
  for (const { resourceType, name } of RESOURCE_TYPES) {
    const existing = await db.processDefinition.findUnique({ where: { resourceType } })
    if (existing) {
      console.log(`ℹ️  ${name} 流程已存在，跳过`)
      continue
    }

    const def = await db.processDefinition.create({
      data: {
        resourceType,
        name,
        isActive: true,
        nodes: {
          create: [
            {
              order: 1,
              name: '审批',
              approverType: 'ROLE',
              approverRole: 'ADMIN',
              ccMode: 'SUBMITTER',
            },
          ],
        },
      },
    })
    console.log(`✅ 创建流程：${name}（${def.id}）`)
  }
  console.log('\n🎉 流程初始化完成')
}

main().catch(console.error).finally(() => db.$disconnect())

