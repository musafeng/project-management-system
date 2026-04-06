/**
 * 流程底座 seed 脚本
 * 为每个业务资源类型初始化审批流程定义
 * 审批人按业务需求配置（USER 模式，需要在 SystemUser 表中存在对应 dingUserId）
 *
 * 运行: npx tsx scripts/seed-process.ts
 *
 * 审批流规则：
 * 项目新增/项目合同/收款/施工立项/合同变更：马建波 → 牟晓山 → 马玉杰
 * 采购合同/采购付款：马亚笑 → 马玉杰 → 牟晓山（采购付款抄送卢海霞）
 * 劳务合同/分包合同：马玉杰 → 牟晓山
 * 劳务付款/分包付款/其他收付款/报销/备用金：马玉杰 → 牟晓山（抄送卢海霞）
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

/**
 * 审批流定义
 * approverName 仅用于注释说明，实际匹配通过 SystemUser 表查询
 */
const PROCESS_DEFINITIONS = [
  // ========== 马建波 → 牟晓山 → 马玉杰 ==========
  {
    resourceType: 'projects',
    name: '项目新增审批',
    nodes: [
      { order: 1, name: '马建波审批', approverName: '马建波' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
      { order: 3, name: '马玉杰审批', approverName: '马玉杰' },
    ],
    ccName: null,
  },
  {
    resourceType: 'project-contracts',
    name: '项目合同审批',
    nodes: [
      { order: 1, name: '马建波审批', approverName: '马建波' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
      { order: 3, name: '马玉杰审批', approverName: '马玉杰' },
    ],
    ccName: null,
  },
  {
    resourceType: 'contract-receipts',
    name: '项目合同收款审批',
    nodes: [
      { order: 1, name: '马建波审批', approverName: '马建波' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
      { order: 3, name: '马玉杰审批', approverName: '马玉杰' },
    ],
    ccName: null,
  },
  {
    resourceType: 'construction-approvals',
    name: '施工立项审批',
    nodes: [
      { order: 1, name: '马建波审批', approverName: '马建波' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
      { order: 3, name: '马玉杰审批', approverName: '马玉杰' },
    ],
    ccName: null,
  },
  {
    resourceType: 'project-contract-changes',
    name: '项目合同变更审批',
    nodes: [
      { order: 1, name: '马建波审批', approverName: '马建波' },
      { order: 2, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 3, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: null,
  },

  // ========== 采购：马亚笑 → 马玉杰 → 牟晓山 ==========
  {
    resourceType: 'procurement-contracts',
    name: '采购合同审批',
    nodes: [
      { order: 1, name: '马亚笑审批', approverName: '马亚笑' },
      { order: 2, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 3, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: null,
  },
  {
    resourceType: 'procurement-payments',
    name: '采购付款审批',
    nodes: [
      { order: 1, name: '马亚笑审批', approverName: '马亚笑' },
      { order: 2, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 3, name: '牟晓山审批', approverName: '牟晓山', ccName: '卢海霞' },
    ],
    ccName: '卢海霞', // 最后节点抄送
  },

  // ========== 劳务/分包：马玉杰 → 牟晓山 ==========
  {
    resourceType: 'labor-contracts',
    name: '劳务合同审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: null,
  },
  {
    resourceType: 'subcontract-contracts',
    name: '分包合同审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: null,
  },

  // ========== 马玉杰 → 牟晓山 → 抄送卢海霞 ==========
  {
    resourceType: 'labor-payments',
    name: '劳务付款审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'subcontract-payments',
    name: '分包付款审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'other-receipts',
    name: '其他收款审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'other-payments',
    name: '其他付款审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'project-expenses',
    name: '项目费用报销审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'management-expenses',
    name: '管理费用报销审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'sales-expenses',
    name: '销售费用报销审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
  {
    resourceType: 'petty-cashes',
    name: '备用金申请审批',
    nodes: [
      { order: 1, name: '马玉杰审批', approverName: '马玉杰' },
      { order: 2, name: '牟晓山审批', approverName: '牟晓山' },
    ],
    ccName: '卢海霞',
  },
]

async function main() {
  console.log('开始初始化审批流程...\n')

  // 查询所有系统用户，建立姓名->ID 映射
  const systemUsers = await db.systemUser.findMany({
    select: { id: true, name: true, dingUserId: true },
  })

  const userMap = new Map<string, string>() // name -> id
  for (const u of systemUsers) {
    userMap.set(u.name, u.id)
  }

  console.log(`找到系统用户：${systemUsers.map(u => u.name).join('、')}\n`)
  const requiredNames = Array.from(new Set(PROCESS_DEFINITIONS.flatMap((def) => {
    const approvers = def.nodes.map((node: any) => node.approverName)
    return def.ccName ? approvers.concat(def.ccName) : approvers
  })))
  const missingUsers = requiredNames.filter((name) => !userMap.has(name))

  if (missingUsers.length > 0) {
    throw new Error(
      `审批流程初始化失败，缺少关键审批人/抄送人：${missingUsers.join('、')}。请先在 SystemUser 中准备这些用户后再执行。`
    )
  }

  for (const def of PROCESS_DEFINITIONS) {
    // 检查是否已存在
    const existing = await db.processDefinition.findUnique({
      where: { resourceType: def.resourceType },
      include: { nodes: true },
    })

    if (existing) {
      // 先删除关联的 ProcessTask，再删除节点
      const nodeIds = existing.nodes.map((n: any) => n.id)
      if (nodeIds.length > 0) {
        await db.processTask.deleteMany({ where: { nodeId: { in: nodeIds } } })
        await db.processNode.deleteMany({ where: { definitionId: existing.id } })
      }
      console.log(`♻️  更新流程：${def.name}`)
    } else {
      console.log(`✅ 创建流程：${def.name}`)
    }

    // 构建节点数据
    const nodeData = def.nodes.map((node: any) => {
      const approverId = userMap.get(node.approverName)
      // 确定抄送配置（仅最后一个节点且有抄送人时生效）
      const isLastNode = node.order === def.nodes.length
      const ccUserId = isLastNode && def.ccName ? (userMap.get(def.ccName) ?? null) : null

      return {
        order: node.order,
        name: node.name,
        approverType: 'USER' as const,
        approverUserId: approverId ?? null,
        approverRole: null,
        ccMode: ccUserId ? ('USER' as const) : ('NONE' as const),
        ccUserId: ccUserId,
      }
    })

    if (existing) {
      await db.processDefinition.update({
        where: { resourceType: def.resourceType },
        data: {
          name: def.name,
          nodes: { create: nodeData },
        },
      })
    } else {
      await db.processDefinition.create({
        data: {
          resourceType: def.resourceType,
          name: def.name,
          isActive: true,
          nodes: { create: nodeData },
        },
      })
    }
  }

  console.log('\n🎉 审批流程初始化完成！')
  console.log('\n✅ 关键审批人校验通过：马建波、牟晓山、马玉杰、马亚笑、卢海霞')
}

main().catch(console.error).finally(() => db.$disconnect())
