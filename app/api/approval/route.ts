/**
 * GET /api/approval
 * 审批中心聚合接口
 *
 * query params:
 *   tab: 'pending' | 'done' | 'cc' | 'mine'  （默认 pending）
 *   resourceType: string  （业务类型筛选，可选）
 *   keyword: string       （标题/单号搜索，可选）
 *   projectId: string     （按项目过滤，可选）
 */
import { NextRequest } from 'next/server'
import { apiHandler, success, checkAuth } from '@/lib/api'
import { db } from '@/lib/db'
import { findSystemUserByDingUserId } from '@/lib/system-user'
import {
  ProcessTaskStatus,
  ProcessInstanceStatus,
  ProcessNodeApproverType,
} from '@prisma/client'

export const dynamic = 'force-dynamic'

const RESOURCE_LABELS: Record<string, string> = {
  'construction-approvals': '施工立项',
  'procurement-contracts': '采购合同',
  'procurement-payments': '采购付款',
  'labor-contracts': '劳务合同',
  'labor-payments': '劳务付款',
  'subcontract-contracts': '分包合同',
  'subcontract-payments': '分包付款',
}

/**
 * 根据 projectId 查出所有相关业务单据的 ID 集合
 * 用于在审批记录里做 resourceId 过滤
 */
async function getResourceIdsByProject(projectId: string): Promise<Set<string>> {
  const [ca, pc, pp, lc, lp, sc, sp] = await Promise.all([
    db.constructionApproval.findMany({ where: { projectId }, select: { id: true } }),
    db.procurementContract.findMany({ where: { projectId }, select: { id: true } }),
    db.procurementPayment.findMany({ where: { projectId }, select: { id: true } }),
    db.laborContract.findMany({ where: { projectId }, select: { id: true } }),
    db.laborPayment.findMany({ where: { projectId }, select: { id: true } }),
    db.subcontractContract.findMany({ where: { projectId }, select: { id: true } }),
    db.subcontractPayment.findMany({ where: { projectId }, select: { id: true } }),
  ])
  const ids = new Set<string>()
  for (const row of [...ca, ...pc, ...pp, ...lc, ...lp, ...sc, ...sp]) {
    ids.add(row.id)
  }
  return ids
}

export const GET = apiHandler(async (req: NextRequest) => {
  const authUser = await checkAuth()
  if (!authUser) return success({ items: [], total: 0 })

  const { searchParams } = req.nextUrl
  const tab = searchParams.get('tab') || 'pending'
  const resourceType = searchParams.get('resourceType') || ''
  const keyword = searchParams.get('keyword') || ''
  const projectId = searchParams.get('projectId') || ''

  const sysUser = await findSystemUserByDingUserId(authUser.userid)
  const systemUserId = sysUser?.id ?? ''

  // 若指定 projectId，预先查出该项目下所有业务单据 ID
  const projectResourceIds = projectId
    ? await getResourceIdsByProject(projectId)
    : null

  let instances: any[] = []

  if (tab === 'pending') {
    // 待我审批：找到我是审批人的 PENDING task，关联 instance
    const tasks = await db.processTask.findMany({
      where: {
        status: ProcessTaskStatus.PENDING,
        OR: [
          { approverType: ProcessNodeApproverType.ROLE, approverRole: authUser.systemRole },
          { approverType: ProcessNodeApproverType.USER, approverUserId: systemUserId },
        ],
        instance: {
          status: ProcessInstanceStatus.PENDING,
          ...(resourceType ? { resourceType } : {}),
        },
      },
      include: {
        instance: {
          include: { definition: true },
        },
        node: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    instances = tasks.map((t) => ({
      id: t.instance.id,
      taskId: t.id,
      resourceType: t.instance.resourceType,
      resourceLabel: RESOURCE_LABELS[t.instance.resourceType] || t.instance.resourceType,
      resourceId: t.instance.resourceId,
      submitterName: t.instance.submitterName,
      submitterUserId: t.instance.submitterUserId,
      status: t.instance.status,
      taskStatus: t.status,
      nodeName: t.node.name,
      nodeOrder: t.nodeOrder,
      startedAt: t.instance.startedAt.toISOString(),
      taskCreatedAt: t.createdAt.toISOString(),
      canApprove: true,
    }))
  } else if (tab === 'done') {
    // 我已处理：找到我已 APPROVED 或 REJECTED 的 task
    const tasks = await db.processTask.findMany({
      where: {
        status: { in: [ProcessTaskStatus.APPROVED, ProcessTaskStatus.REJECTED] },
        handledBy: authUser.userid,
        instance: resourceType ? { resourceType } : undefined,
      },
      include: {
        instance: { include: { definition: true } },
        node: true,
      },
      orderBy: { handledAt: 'desc' },
      take: 100,
    })
    instances = tasks.map((t) => ({
      id: t.instance.id,
      taskId: t.id,
      resourceType: t.instance.resourceType,
      resourceLabel: RESOURCE_LABELS[t.instance.resourceType] || t.instance.resourceType,
      resourceId: t.instance.resourceId,
      submitterName: t.instance.submitterName,
      submitterUserId: t.instance.submitterUserId,
      status: t.instance.status,
      taskStatus: t.status,
      nodeName: t.node.name,
      nodeOrder: t.nodeOrder,
      startedAt: t.instance.startedAt.toISOString(),
      taskCreatedAt: t.handledAt?.toISOString() || t.createdAt.toISOString(),
      canApprove: false,
    }))
  } else if (tab === 'mine') {
    // 我发起的
    const insts = await db.processInstance.findMany({
      where: {
        submitterUserId: authUser.userid,
        ...(resourceType ? { resourceType } : {}),
      },
      include: {
        definition: true,
        tasks: { where: { status: ProcessTaskStatus.PENDING }, orderBy: { nodeOrder: 'asc' }, take: 1 },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    })
    instances = insts.map((inst) => ({
      id: inst.id,
      taskId: '',
      resourceType: inst.resourceType,
      resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
      resourceId: inst.resourceId,
      submitterName: inst.submitterName,
      submitterUserId: inst.submitterUserId,
      status: inst.status,
      taskStatus: inst.tasks[0]?.status || 'NONE',
      nodeName: inst.tasks[0] ? `节点${inst.tasks[0].nodeOrder}` : '已结束',
      nodeOrder: inst.tasks[0]?.nodeOrder || 0,
      startedAt: inst.startedAt.toISOString(),
      taskCreatedAt: inst.startedAt.toISOString(),
      canApprove: false,
      canRevoke: inst.status === ProcessInstanceStatus.PENDING,
    }))
  } else {
    // cc: 暂时返回空（抄送功能后续扩展）
    instances = []
  }

  // projectId 过滤（按 resourceId 集合匹配）
  if (projectResourceIds !== null) {
    instances = instances.filter((i) => projectResourceIds.has(i.resourceId))
  }

  // 关键词过滤（在内存做，因为 resourceId 是外键）
  if (keyword) {
    const kw = keyword.toLowerCase()
    instances = instances.filter(
      (i) =>
        i.submitterName?.toLowerCase().includes(kw) ||
        i.resourceLabel?.toLowerCase().includes(kw) ||
        i.resourceId?.toLowerCase().includes(kw)
    )
  }

  return success({ items: instances, total: instances.length })
})

  if (tab === 'pending') {
    // 待我审批：找到我是审批人的 PENDING task，关联 instance
    const tasks = await db.processTask.findMany({
      where: {
        status: ProcessTaskStatus.PENDING,
        OR: [
          { approverType: ProcessNodeApproverType.ROLE, approverRole: authUser.systemRole },
          { approverType: ProcessNodeApproverType.USER, approverUserId: systemUserId },
        ],
        instance: {
          status: ProcessInstanceStatus.PENDING,
          ...(resourceType ? { resourceType } : {}),
        },
      },
      include: {
        instance: {
          include: { definition: true },
        },
        node: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    instances = tasks.map((t) => ({
      id: t.instance.id,
      taskId: t.id,
      resourceType: t.instance.resourceType,
      resourceLabel: RESOURCE_LABELS[t.instance.resourceType] || t.instance.resourceType,
      resourceId: t.instance.resourceId,
      submitterName: t.instance.submitterName,
      submitterUserId: t.instance.submitterUserId,
      status: t.instance.status,
      taskStatus: t.status,
      nodeName: t.node.name,
      nodeOrder: t.nodeOrder,
      startedAt: t.instance.startedAt.toISOString(),
      taskCreatedAt: t.createdAt.toISOString(),
      canApprove: true,
    }))
  } else if (tab === 'done') {
    // 我已处理：找到我已 APPROVED 或 REJECTED 的 task
    const tasks = await db.processTask.findMany({
      where: {
        status: { in: [ProcessTaskStatus.APPROVED, ProcessTaskStatus.REJECTED] },
        handledBy: authUser.userid,
        instance: resourceType ? { resourceType } : undefined,
      },
      include: {
        instance: { include: { definition: true } },
        node: true,
      },
      orderBy: { handledAt: 'desc' },
      take: 100,
    })
    instances = tasks.map((t) => ({
      id: t.instance.id,
      taskId: t.id,
      resourceType: t.instance.resourceType,
      resourceLabel: RESOURCE_LABELS[t.instance.resourceType] || t.instance.resourceType,
      resourceId: t.instance.resourceId,
      submitterName: t.instance.submitterName,
      submitterUserId: t.instance.submitterUserId,
      status: t.instance.status,
      taskStatus: t.status,
      nodeName: t.node.name,
      nodeOrder: t.nodeOrder,
      startedAt: t.instance.startedAt.toISOString(),
      taskCreatedAt: t.handledAt?.toISOString() || t.createdAt.toISOString(),
      canApprove: false,
    }))
  } else if (tab === 'mine') {
    // 我发起的
    const insts = await db.processInstance.findMany({
      where: {
        submitterUserId: authUser.userid,
        ...(resourceType ? { resourceType } : {}),
      },
      include: {
        definition: true,
        tasks: { where: { status: ProcessTaskStatus.PENDING }, orderBy: { nodeOrder: 'asc' }, take: 1 },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    })
    instances = insts.map((inst) => ({
      id: inst.id,
      taskId: '',
      resourceType: inst.resourceType,
      resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
      resourceId: inst.resourceId,
      submitterName: inst.submitterName,
      submitterUserId: inst.submitterUserId,
      status: inst.status,
      taskStatus: inst.tasks[0]?.status || 'NONE',
      nodeName: inst.tasks[0] ? `节点${inst.tasks[0].nodeOrder}` : '已结束',
      nodeOrder: inst.tasks[0]?.nodeOrder || 0,
      startedAt: inst.startedAt.toISOString(),
      taskCreatedAt: inst.startedAt.toISOString(),
      canApprove: false,
      canRevoke: inst.status === ProcessInstanceStatus.PENDING,
    }))
  } else {
    // cc: 暂时返回空（抄送功能后续扩展）
    instances = []
  }

  // 关键词过滤（在内存做，因为 resourceId 是外键）
  if (keyword) {
    const kw = keyword.toLowerCase()
    instances = instances.filter(
      (i) =>
        i.submitterName?.toLowerCase().includes(kw) ||
        i.resourceLabel?.toLowerCase().includes(kw) ||
        i.resourceId?.toLowerCase().includes(kw)
    )
  }

  return success({ items: instances, total: instances.length })
})

