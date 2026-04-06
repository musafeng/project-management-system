#!/usr/bin/env node

const { PrismaClient, SystemUserRole } = require('@prisma/client')
const { loadEnvConfig } = require('@next/env')
const { runSeed } = require('../prisma/seed')

loadEnvConfig(process.cwd())

const db = new PrismaClient()

const CONSTRUCTION_FORM_FIELDS = [
  { label: '项目名称', fieldKey: 'projectName', componentType: 'input', required: true, sortOrder: 1 },
  { label: '预算金额', fieldKey: 'amount', componentType: 'number', required: false, sortOrder: 2 },
  { label: '立项日期', fieldKey: 'date', componentType: 'date', required: false, sortOrder: 3 },
  { label: '备注说明', fieldKey: 'remark', componentType: 'textarea', required: false, sortOrder: 4 },
]

const PROCESS_DEFINITIONS = [
  {
    resourceType: 'projects',
    name: '项目新增审批',
    nodes: ['马建波', '牟晓山', '马玉杰'],
  },
  {
    resourceType: 'project-contracts',
    name: '项目合同审批',
    nodes: ['马建波', '牟晓山', '马玉杰'],
  },
  {
    resourceType: 'contract-receipts',
    name: '项目合同收款审批',
    nodes: ['马建波', '牟晓山', '马玉杰'],
  },
  {
    resourceType: 'construction-approvals',
    name: '施工立项审批',
    nodes: ['马建波', '牟晓山', '马玉杰'],
  },
  {
    resourceType: 'project-contract-changes',
    name: '项目合同变更审批',
    nodes: ['马建波', '马玉杰', '牟晓山'],
  },
  {
    resourceType: 'procurement-contracts',
    name: '采购合同审批',
    nodes: ['马亚笑', '马玉杰', '牟晓山'],
  },
  {
    resourceType: 'procurement-payments',
    name: '采购付款审批',
    nodes: ['马亚笑', '马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'labor-contracts',
    name: '劳务合同审批',
    nodes: ['马玉杰', '牟晓山'],
  },
  {
    resourceType: 'subcontract-contracts',
    name: '分包合同审批',
    nodes: ['马玉杰', '牟晓山'],
  },
  {
    resourceType: 'labor-payments',
    name: '劳务付款审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'subcontract-payments',
    name: '分包付款审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'other-receipts',
    name: '其他收款审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'other-payments',
    name: '其他付款审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'project-expenses',
    name: '项目费用报销审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'management-expenses',
    name: '管理费用报销审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'sales-expenses',
    name: '销售费用报销审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
  {
    resourceType: 'petty-cashes',
    name: '备用金申请审批',
    nodes: ['马玉杰', '牟晓山'],
    ccName: '卢海霞',
  },
]

function readEnv(name) {
  return (process.env[name] || '').trim()
}

async function ensureBootstrapAdmin() {
  const existingAdmin = await db.systemUser.findFirst({
    where: { role: SystemUserRole.ADMIN, isActive: true },
  })

  const dingUserId = readEnv('BOOTSTRAP_ADMIN_DING_USER_ID')
  const name = readEnv('BOOTSTRAP_ADMIN_NAME')
  const mobile = readEnv('BOOTSTRAP_ADMIN_MOBILE')

  if (existingAdmin) {
    console.log(`✅ 已存在系统管理员：${existingAdmin.name} (${existingAdmin.dingUserId})`)
    return existingAdmin
  }

  if (!dingUserId || !name) {
    throw new Error(
      '系统初始化失败：当前没有任何 ADMIN 账号。请先配置 BOOTSTRAP_ADMIN_DING_USER_ID 和 BOOTSTRAP_ADMIN_NAME，再执行 npm run init:system。'
    )
  }

  const admin = await db.systemUser.upsert({
    where: { dingUserId },
    update: {
      name,
      mobile: mobile || null,
      role: SystemUserRole.ADMIN,
      isActive: true,
      remark: '系统初始化脚本创建/升级的首个系统管理员',
      lastLoginAt: new Date(),
    },
    create: {
      dingUserId,
      name,
      mobile: mobile || null,
      role: SystemUserRole.ADMIN,
      isActive: true,
      deptIdsJson: JSON.stringify([]),
      deptNamesJson: JSON.stringify(['系统初始化']),
      remark: '系统初始化脚本创建的首个系统管理员',
      lastLoginAt: new Date(),
    },
  })

  console.log(`✅ 已创建首个系统管理员：${admin.name} (${admin.dingUserId})`)
  return admin
}

async function ensureDefaultRegion() {
  let defaultRegion = await db.region.findUnique({ where: { code: 'DEFAULT' } })

  if (!defaultRegion) {
    defaultRegion = await db.region.create({
      data: { name: '默认区域', code: 'DEFAULT', isActive: true },
    })
    console.log(`✅ 已创建默认区域：${defaultRegion.name}`)
  } else {
    console.log(`✅ 默认区域已存在：${defaultRegion.name}`)
  }

  const id = defaultRegion.id
  const updates = await Promise.all([
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
  console.log(`✅ 默认区域回填完成，共更新 ${updates.reduce((sum, item) => sum + item.count, 0)} 条记录`)
}

async function ensureConstructionApprovalForm() {
  const form = await db.formDefinition.upsert({
    where: { code: 'construction-approvals' },
    update: { name: '施工立项', isActive: true },
    create: {
      name: '施工立项',
      code: 'construction-approvals',
      isActive: true,
    },
  })

  await db.formField.deleteMany({ where: { formId: form.id } })
  await db.formField.createMany({
    data: CONSTRUCTION_FORM_FIELDS.map((field) => ({
      formId: form.id,
      ...field,
    })),
  })

  console.log('✅ 施工立项表单定义已初始化')
}

async function assertRequiredApprovers() {
  const requiredNames = Array.from(new Set(PROCESS_DEFINITIONS.flatMap((def) => {
    return def.ccName ? def.nodes.concat(def.ccName) : def.nodes
  })))

  const users = await db.systemUser.findMany({
    where: { name: { in: requiredNames }, isActive: true },
    select: { id: true, name: true },
  })

  const userMap = new Map(users.map((item) => [item.name, item.id]))
  const missing = requiredNames.filter((name) => !userMap.has(name))

  if (missing.length > 0) {
    throw new Error(
      `系统初始化失败：缺少关键审批人/抄送人：${missing.join('、')}。请先在 SystemUser 中准备这些用户，再重新执行 npm run init:system。`
    )
  }

  console.log(`✅ 关键审批人检查通过：${requiredNames.join('、')}`)
  return userMap
}

async function seedProcessDefinitions(userMap) {
  for (const definition of PROCESS_DEFINITIONS) {
    const existing = await db.processDefinition.findUnique({
      where: { resourceType: definition.resourceType },
      include: { nodes: true },
    })

    if (existing) {
      const nodeIds = existing.nodes.map((item) => item.id)
      if (nodeIds.length > 0) {
        await db.processTask.deleteMany({ where: { nodeId: { in: nodeIds } } })
        await db.processNode.deleteMany({ where: { definitionId: existing.id } })
      }
    }

    const nodes = definition.nodes.map((name, index) => {
      const isLast = index === definition.nodes.length - 1
      const ccUserId = isLast && definition.ccName ? userMap.get(definition.ccName) : null
      return {
        order: index + 1,
        name: `${name}审批`,
        approverType: 'USER',
        approverUserId: userMap.get(name),
        approverRole: null,
        ccMode: ccUserId ? 'USER' : 'NONE',
        ccUserId: ccUserId || null,
      }
    })

    if (existing) {
      await db.processDefinition.update({
        where: { resourceType: definition.resourceType },
        data: {
          name: definition.name,
          isActive: true,
          nodes: { create: nodes },
        },
      })
      console.log(`♻️  已更新审批流程：${definition.name}`)
    } else {
      await db.processDefinition.create({
        data: {
          resourceType: definition.resourceType,
          name: definition.name,
          isActive: true,
          nodes: { create: nodes },
        },
      })
      console.log(`✅ 已创建审批流程：${definition.name}`)
    }
  }
}

async function main() {
  console.log('🚀 开始执行统一系统初始化...\n')
  await ensureBootstrapAdmin()
  await runSeed(db)
  await ensureDefaultRegion()
  await ensureConstructionApprovalForm()
  const userMap = await assertRequiredApprovers()
  await seedProcessDefinitions(userMap)

  console.log('\n🎉 统一初始化完成')
  console.log('建议立即验证：管理员登录、审批流程配置、表单配置、区域列表、审批中心。')
}

main()
  .catch((error) => {
    console.error('\n❌ 初始化失败：', error.message || error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
