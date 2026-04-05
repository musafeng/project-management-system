/**
 * Prisma Seed Script - 统一入口
 * 
 * 用途：
 * 1. 初始化 Feature Flag 数据
 * 2. 初始化 5 个低风险表单的 FormDefinition / FormField 配置
 * 
 * 执行方式：
 * npx prisma db seed
 * 
 * 或手动执行：
 * node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据...')

  try {
    // ============================================================
    // Part 1: 初始化 Feature Flag
    // ============================================================
    console.log('\n📌 初始化 Feature Flag...')

    const flags = [
      {
        flagName: 'FINANCE_TRANSACTION_CONTROL',
        displayName: '金额一致性重构',
        description: '为采购付款、劳务付款、分包付款、收款记录添加事务控制',
        environment: 'test',
        isEnabled: true,
      },
      {
        flagName: 'FINANCE_IDEMPOTENT_CONTROL',
        displayName: '重复提交保护',
        description: '为结算类 API 添加重复提交保护和幂等控制',
        environment: 'test',
        isEnabled: true,
      },
      {
        flagName: 'FINANCE_VERSION_CONTROL',
        displayName: 'version 字段控制',
        description: '使用 version 字段进行乐观锁并发控制',
        environment: 'test',
        isEnabled: true,
      },
      {
        flagName: 'FINANCE_AUDIT_LOG',
        displayName: '审计日志',
        description: '记录所有财务操作的审计日志',
        environment: 'test',
        isEnabled: true,
      },
      {
        flagName: 'FINANCE_ROW_LOCK',
        displayName: '行级锁',
        description: '在必要的高冲突点使用行级锁',
        environment: 'test',
        isEnabled: false,
      },
      {
        flagName: 'FINANCE_TRANSACTION_CONTROL',
        displayName: '金额一致性重构',
        description: '为采购付款、劳务付款、分包付款、收款记录添加事务控制',
        environment: 'production',
        isEnabled: false,
      },
      {
        flagName: 'FINANCE_IDEMPOTENT_CONTROL',
        displayName: '重复提交保护',
        description: '为结算类 API 添加重复提交保护和幂等控制',
        environment: 'production',
        isEnabled: false,
      },
      {
        flagName: 'FINANCE_VERSION_CONTROL',
        displayName: 'version 字段控制',
        description: '使用 version 字段进行乐观锁并发控制',
        environment: 'production',
        isEnabled: false,
      },
      {
        flagName: 'FINANCE_AUDIT_LOG',
        displayName: '审计日志',
        description: '记录所有财务操作的审计日志',
        environment: 'production',
        isEnabled: false,
      },
      {
        flagName: 'FINANCE_ROW_LOCK',
        displayName: '行级锁',
        description: '在必要的高冲突点使用行级锁',
        environment: 'production',
        isEnabled: false,
      },
    ]

    for (const flag of flags) {
      try {
        await prisma.featureFlag.upsert({
          where: {
            flagName_environment_regionId: {
              flagName: flag.flagName,
              environment: flag.environment,
              regionId: null,
            },
          },
          update: {
            displayName: flag.displayName,
            description: flag.description,
            isEnabled: flag.isEnabled,
            updatedAt: new Date(),
          },
          create: {
            flagName: flag.flagName,
            displayName: flag.displayName,
            description: flag.description,
            environment: flag.environment,
            isEnabled: flag.isEnabled,
            regionId: null,
          },
        })
        console.log(`✅ ${flag.flagName} (${flag.environment}): ${flag.isEnabled ? '启用' : '禁用'}`)
      } catch (error) {
        console.error(`❌ 初始化 ${flag.flagName} (${flag.environment}) 失败:`, error.message)
      }
    }

    console.log('✨ Feature Flag 初始化完成')

    // ============================================================
    // Part 2: 初始化 FormDefinition 配置
    // ============================================================
    console.log('\n📌 初始化 FormDefinition 配置...')

    // ============================================================
    // Part 2: 初始化 5 个低风险表单配置（唯一正式入口）
    // 注意：ManagementExpense / SalesExpense 的费用明细由页面薄层承接，
    // 不再通过 FormField 配置复杂结构，避免和 DynamicForm 能力错位。
    // ============================================================

    // 1. ManagementExpense 表单配置
    const mgmtForm = await prisma.formDefinition.upsert({
      where: { code: 'management-expenses' },
      update: {},
      create: {
        name: '管理费用报销',
        code: 'management-expenses',
        isActive: true,
      },
    })

    await prisma.formField.deleteMany({ where: { formId: mgmtForm.id } })

    await prisma.formField.createMany({
      data: [
        {
          formId: mgmtForm.id,
          label: '项目',
          fieldKey: 'projectId',
          componentType: 'cascadeSelect',
          required: false,
          sortOrder: 1,
          linkedTable: 'projects',
          linkedLabelField: 'name',
          linkedValueField: 'id',
        },
        {
          formId: mgmtForm.id,
          label: '报销人',
          fieldKey: 'submitter',
          componentType: 'input',
          required: true,
          sortOrder: 2,
        },
        {
          formId: mgmtForm.id,
          label: '日期',
          fieldKey: 'expenseDate',
          componentType: 'date',
          required: true,
          sortOrder: 3,
        },
        {
          formId: mgmtForm.id,
          label: '附件',
          fieldKey: 'attachmentUrl',
          componentType: 'file',
          required: false,
          sortOrder: 4,
        },
        {
          formId: mgmtForm.id,
          label: '备注',
          fieldKey: 'remark',
          componentType: 'textarea',
          required: false,
          sortOrder: 5,
        },
      ],
    })

    console.log('✅ ManagementExpense 配置完成')

    // 2. SalesExpense 表单配置
    const salesForm = await prisma.formDefinition.upsert({
      where: { code: 'sales-expenses' },
      update: {},
      create: {
        name: '销售费用报销',
        code: 'sales-expenses',
        isActive: true,
      },
    })

    await prisma.formField.deleteMany({ where: { formId: salesForm.id } })

    await prisma.formField.createMany({
      data: [
        {
          formId: salesForm.id,
          label: '项目',
          fieldKey: 'projectId',
          componentType: 'cascadeSelect',
          required: false,
          sortOrder: 1,
          linkedTable: 'projects',
          linkedLabelField: 'name',
          linkedValueField: 'id',
        },
        {
          formId: salesForm.id,
          label: '报销人',
          fieldKey: 'submitter',
          componentType: 'input',
          required: true,
          sortOrder: 2,
        },
        {
          formId: salesForm.id,
          label: '日期',
          fieldKey: 'expenseDate',
          componentType: 'date',
          required: true,
          sortOrder: 3,
        },
        {
          formId: salesForm.id,
          label: '附件',
          fieldKey: 'attachmentUrl',
          componentType: 'file',
          required: false,
          sortOrder: 4,
        },
        {
          formId: salesForm.id,
          label: '备注',
          fieldKey: 'remark',
          componentType: 'textarea',
          required: false,
          sortOrder: 5,
        },
      ],
    })

    console.log('✅ SalesExpense 配置完成')

    // 3. PettyCash 表单配置
    const pettyCashForm = await prisma.formDefinition.upsert({
      where: { code: 'petty-cashes' },
      update: {},
      create: {
        name: '备用金申请',
        code: 'petty-cashes',
        isActive: true,
      },
    })

    await prisma.formField.deleteMany({ where: { formId: pettyCashForm.id } })

    await prisma.formField.createMany({
      data: [
        {
          formId: pettyCashForm.id,
          label: '关联项目',
          fieldKey: 'projectId',
          componentType: 'cascadeSelect',
          required: false,
          sortOrder: 1,
          linkedTable: 'projects',
          linkedLabelField: 'name',
          linkedValueField: 'id',
        },
        {
          formId: pettyCashForm.id,
          label: '申请人',
          fieldKey: 'holder',
          componentType: 'input',
          required: true,
          sortOrder: 2,
        },
        {
          formId: pettyCashForm.id,
          label: '申请事由',
          fieldKey: 'applyReason',
          componentType: 'input',
          required: false,
          sortOrder: 3,
        },
        {
          formId: pettyCashForm.id,
          label: '金额',
          fieldKey: 'issuedAmount',
          componentType: 'number',
          required: true,
          sortOrder: 4,
        },
        {
          formId: pettyCashForm.id,
          label: '日期',
          fieldKey: 'issueDate',
          componentType: 'date',
          required: true,
          sortOrder: 5,
        },
        {
          formId: pettyCashForm.id,
          label: '附件',
          fieldKey: 'attachmentUrl',
          componentType: 'file',
          required: false,
          sortOrder: 6,
        },
        {
          formId: pettyCashForm.id,
          label: '备注',
          fieldKey: 'remark',
          componentType: 'textarea',
          required: false,
          sortOrder: 7,
        },
      ],
    })

    console.log('✅ PettyCash 配置完成')

    // 4. OtherReceipt 表单配置
    const otherReceiptForm = await prisma.formDefinition.upsert({
      where: { code: 'other-receipts' },
      update: {},
      create: {
        name: '其他收款',
        code: 'other-receipts',
        isActive: true,
      },
    })

    await prisma.formField.deleteMany({ where: { formId: otherReceiptForm.id } })

    await prisma.formField.createMany({
      data: [
        {
          formId: otherReceiptForm.id,
          label: '关联项目',
          fieldKey: 'projectId',
          componentType: 'cascadeSelect',
          required: false,
          sortOrder: 1,
          linkedTable: 'projects',
          linkedLabelField: 'name',
          linkedValueField: 'id',
        },
        {
          formId: otherReceiptForm.id,
          label: '收款事由',
          fieldKey: 'receiptType',
          componentType: 'input',
          required: true,
          sortOrder: 2,
        },
        {
          formId: otherReceiptForm.id,
          label: '金额',
          fieldKey: 'receiptAmount',
          componentType: 'number',
          required: true,
          sortOrder: 3,
        },
        {
          formId: otherReceiptForm.id,
          label: '日期',
          fieldKey: 'receiptDate',
          componentType: 'date',
          required: true,
          sortOrder: 4,
        },
        {
          formId: otherReceiptForm.id,
          label: '附件',
          fieldKey: 'attachmentUrl',
          componentType: 'file',
          required: false,
          sortOrder: 5,
        },
        {
          formId: otherReceiptForm.id,
          label: '备注',
          fieldKey: 'remark',
          componentType: 'textarea',
          required: false,
          sortOrder: 6,
        },
      ],
    })

    console.log('✅ OtherReceipt 配置完成')

    // 5. OtherPayment 表单配置
    const otherPaymentForm = await prisma.formDefinition.upsert({
      where: { code: 'other-payments' },
      update: {},
      create: {
        name: '其他付款',
        code: 'other-payments',
        isActive: true,
      },
    })

    await prisma.formField.deleteMany({ where: { formId: otherPaymentForm.id } })

    await prisma.formField.createMany({
      data: [
        {
          formId: otherPaymentForm.id,
          label: '关联项目',
          fieldKey: 'projectId',
          componentType: 'cascadeSelect',
          required: false,
          sortOrder: 1,
          linkedTable: 'projects',
          linkedLabelField: 'name',
          linkedValueField: 'id',
        },
        {
          formId: otherPaymentForm.id,
          label: '付款事由',
          fieldKey: 'paymentType',
          componentType: 'input',
          required: true,
          sortOrder: 2,
        },
        {
          formId: otherPaymentForm.id,
          label: '金额',
          fieldKey: 'paymentAmount',
          componentType: 'number',
          required: true,
          sortOrder: 3,
        },
        {
          formId: otherPaymentForm.id,
          label: '日期',
          fieldKey: 'paymentDate',
          componentType: 'date',
          required: true,
          sortOrder: 4,
        },
        {
          formId: otherPaymentForm.id,
          label: '附件',
          fieldKey: 'attachmentUrl',
          componentType: 'file',
          required: false,
          sortOrder: 5,
        },
        {
          formId: otherPaymentForm.id,
          label: '备注',
          fieldKey: 'remark',
          componentType: 'textarea',
          required: false,
          sortOrder: 6,
        },
      ],
    })

    console.log('✅ OtherPayment 配置完成')

    console.log('\n✨ 所有数据初始化完成')
  } catch (error) {
    console.error('❌ 初始化失败:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

