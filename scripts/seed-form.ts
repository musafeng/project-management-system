/**
 * scripts/seed-form.ts
 * 初始化 construction-approvals 表单定义及字段
 *
 * 运行方式：
 *   npx ts-node --project tsconfig.json scripts/seed-form.ts
 * 或：
 *   npx tsx scripts/seed-form.ts
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const CODE = 'construction-approvals'

  // 检查是否已存在
  const existing = await prisma.formDefinition.findUnique({ where: { code: CODE } })
  if (existing) {
    console.log(`[seed-form] 表单 "${CODE}" 已存在（id: ${existing.id}），跳过创建。`)
    console.log('[seed-form] 如需重置，请先手动删除数据库中对应记录。')
    await prisma.$disconnect()
    return
  }

  const form = await prisma.formDefinition.create({
    data: {
      id: randomUUID(),
      name: '施工立项',
      code: CODE,
      isActive: true,
      updatedAt: new Date(),
      FormField: {
        create: [
          {
            id: randomUUID(),
            label: '项目名称',
            fieldKey: 'projectName',
            componentType: 'input',
            required: true,
            sortOrder: 1,
          },
          {
            id: randomUUID(),
            label: '预算金额',
            fieldKey: 'amount',
            componentType: 'number',
            required: false,
            sortOrder: 2,
          },
          {
            id: randomUUID(),
            label: '立项日期',
            fieldKey: 'date',
            componentType: 'date',
            required: false,
            sortOrder: 3,
          },
          {
            id: randomUUID(),
            label: '备注说明',
            fieldKey: 'remark',
            componentType: 'textarea',
            required: false,
            sortOrder: 4,
          },
        ],
      },
    },
    include: { FormField: { orderBy: { sortOrder: 'asc' } } },
  })

  console.log(`[seed-form] 表单 "${form.name}" 创建成功（id: ${form.id}）`)
  console.log(`[seed-form] 已创建 ${form.FormField.length} 个字段：`)
  form.FormField.forEach((f) => {
    console.log(`  - [${f.sortOrder}] ${f.label} (${f.fieldKey}) → ${f.componentType}`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[seed-form] 执行失败:', err)
  prisma.$disconnect()
  process.exit(1)
})



