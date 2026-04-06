/**
 * 通用审批动作工具 v2
 * 审批权限改为配置驱动，通过 ProcessDefinition / ProcessTask 判断
 */

import { db } from './db'
import { createActionLog } from './action-log'
import { ActionType } from '@prisma/client'
import type { SystemUserRole } from '@prisma/client'
import { requireRole, getCurrentUser } from './api'
import {
  sendApprovalSubmittedNotification,
  sendApprovalApprovedNotification,
  sendApprovalRejectedNotification,
} from './dingtalk-notify'

export const ApprovalStatus = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const

export type ApprovalStatusType = keyof typeof ApprovalStatus

export type ApprovalModel =
  | 'constructionApproval'
  | 'contractReceipt'
  | 'procurementContract'
  | 'procurementPayment'
  | 'laborContract'
  | 'laborPayment'
  | 'subcontractContract'
  | 'subcontractPayment'

/** 各模块 submit 允许的角色（保留，用于提交权限） */
export const SUBMIT_ROLES: Record<ApprovalModel, SystemUserRole[]> = {
  constructionApproval: ['PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  contractReceipt: ['FINANCE', 'ADMIN'] as SystemUserRole[],
  procurementContract: ['PURCHASE', 'ADMIN'] as SystemUserRole[],
  procurementPayment: ['FINANCE', 'PURCHASE', 'ADMIN'] as SystemUserRole[],
  laborContract: ['PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  laborPayment: ['FINANCE', 'PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  subcontractContract: ['PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  subcontractPayment: ['FINANCE', 'PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
}

/** 各模块资源类型（对应 ProcessDefinition.resourceType） */
export const MODEL_RESOURCE_TYPE: Record<ApprovalModel, string> = {
  constructionApproval: 'construction-approvals',
  contractReceipt: 'contract-receipts',
  procurementContract: 'procurement-contracts',
  procurementPayment: 'procurement-payments',
  laborContract: 'labor-contracts',
  laborPayment: 'labor-payments',
  subcontractContract: 'subcontract-contracts',
  subcontractPayment: 'subcontract-payments',
}

const MODEL_LABEL: Record<ApprovalModel, string> = {
  constructionApproval: '施工立项',
  contractReceipt: '合同收款',
  procurementContract: '采购合同',
  procurementPayment: '采购付款',
  laborContract: '劳务合同',
  laborPayment: '劳务付款',
  subcontractContract: '分包合同',
  subcontractPayment: '分包付款',
}

const APPROVER_ROLE_LABELS: Record<string, string> = {
  ADMIN: '系统管理员',
  FINANCE: '财务人员',
  PURCHASE: '采购人员',
  PROJECT_MANAGER: '项目经理',
  STAFF: '普通员工',
}

export interface ApprovalTimelineItem {
  id: string
  nodeName: string
  status: string
  operatorName: string
  handledAt?: Date | null
  createdAt?: Date | null
  comment?: string | null
}

// ============================================================================
// 内部工具函数
// ============================================================================

async function getApprovalStatus(model: ApprovalModel, id: string): Promise<string | null> {
  const record = await (db[model] as any).findUnique({
    where: { id },
    select: { approvalStatus: true },
  })
  return record?.approvalStatus ?? null
}

async function updateApprovalStatus(
  model: ApprovalModel,
  id: string,
  data: Record<string, any>
): Promise<void> {
  await (db[model] as any).update({ where: { id }, data })
}

async function getSubmitterDingUserId(
  model: ApprovalModel,
  id: string
): Promise<string | null> {
  try {
    // 优先从 ProcessInstance 取
    const instance = await db.processInstance.findFirst({
      where: { resourceType: MODEL_RESOURCE_TYPE[model], resourceId: id },
      select: { submitterUserId: true },
      orderBy: { startedAt: 'desc' },
    })
    if (instance?.submitterUserId) return instance.submitterUserId

    // 回退到 ActionLog
    const log = await db.actionLog.findFirst({
      where: { resource: MODEL_LABEL[model], resourceId: id, detail: { contains: '提交审批' } },
      select: { userId: true },
      orderBy: { createdAt: 'desc' },
    })
    return log?.userId ?? null
  } catch {
    return null
  }
}

/**
 * 获取当前待处理的 ProcessTask（最新流程实例中最小 order 的 PENDING task）
 */
async function getPendingTask(model: ApprovalModel, resourceId: string) {
  const instance = await db.processInstance.findFirst({
    where: {
      resourceType: MODEL_RESOURCE_TYPE[model],
      resourceId,
      status: 'PENDING',
    },
    include: {
      tasks: {
        where: { status: 'PENDING' },
        orderBy: { nodeOrder: 'asc' },
        take: 1,
      },
    },
    orderBy: { startedAt: 'desc' },
  })
  return { instance, task: instance?.tasks[0] ?? null }
}

export async function getApprovalTimeline(model: ApprovalModel, resourceId: string): Promise<ApprovalTimelineItem[]> {
  const instance = await db.processInstance.findFirst({
    where: {
      resourceType: MODEL_RESOURCE_TYPE[model],
      resourceId,
    },
    include: {
      tasks: {
        include: {
          node: {
            select: { name: true },
          },
        },
        orderBy: [{ nodeOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!instance) return []

  const handledByIds = Array.from(new Set(instance.tasks.map((task) => task.handledBy).filter(Boolean) as string[]))
  const approverUserIds = Array.from(new Set(instance.tasks.map((task) => task.approverUserId).filter(Boolean) as string[]))

  const [handledUsers, approverUsers] = await Promise.all([
    handledByIds.length > 0
      ? db.systemUser.findMany({
          where: { dingUserId: { in: handledByIds } },
          select: { dingUserId: true, name: true },
        })
      : Promise.resolve([]),
    approverUserIds.length > 0
      ? db.systemUser.findMany({
          where: { id: { in: approverUserIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ])

  const handledUserMap = new Map(handledUsers.map((user) => [user.dingUserId, user.name]))
  const approverUserMap = new Map(approverUsers.map((user) => [user.id, user.name]))

  return [
    {
      id: `${instance.id}-submitted`,
      nodeName: '提交审批',
      status: 'SUBMITTED',
      operatorName: instance.submitterName || '提交人',
      handledAt: instance.startedAt,
      createdAt: instance.startedAt,
      comment: null,
    },
    ...instance.tasks.map((task) => {
      const operatorName = task.handledBy
        ? handledUserMap.get(task.handledBy) || task.handledBy
        : task.approverType === 'ROLE'
          ? `${APPROVER_ROLE_LABELS[task.approverRole || ''] || task.approverRole || '审批人'}待处理`
          : approverUserMap.get(task.approverUserId || '') || '指定审批人待处理'

      return {
        id: task.id,
        nodeName: task.node.name,
        status: task.status,
        operatorName,
        handledAt: task.handledAt,
        createdAt: task.createdAt,
        comment: task.comment,
      }
    }),
  ]
}

/**
 * 校验当前用户是否有权审批当前任务
 * approverType=ROLE  → 用户 role 必须匹配
 * approverType=USER  → 用户 dingUserId 必须匹配
 */
async function assertApprover(task: {
  approverType: string
  approverRole: string | null
  approverUserId: string | null
}): Promise<void> {
  const user = await getCurrentUser()
  if (task.approverType === 'ROLE') {
    if (!task.approverRole) throw new Error('流程节点配置错误：approverRole 为空')
    if (user.systemRole !== task.approverRole) {
      throw new Error(`无审批权限：该节点需要 ${task.approverRole} 角色`)
    }
  } else if (task.approverType === 'USER') {
    if (!task.approverUserId) throw new Error('流程节点配置错误：approverUserId 为空')
    // approverUserId 存的是 SystemUser.id，需对比
    const sysUser = await db.systemUser.findUnique({
      where: { id: task.approverUserId },
      select: { dingUserId: true },
    })
    if (sysUser?.dingUserId !== user.userid) {
      throw new Error('无审批权限：该节点指定了特定审批人')
    }
  }
}

// ============================================================================
// 公共 API
// ============================================================================

export function assertEditable(approvalStatus: string): void {
  if (approvalStatus === ApprovalStatus.PENDING) {
    throw new Error('当前单据审批中，无法修改')
  }
  if (approvalStatus === ApprovalStatus.APPROVED) {
    throw new Error('当前单据已审批通过，无法修改')
  }
}

/**
 * 提交审批 v2
 * - 查找流程定义，创建 ProcessInstance + 第一个 ProcessTask
 * - approvalStatus = PENDING
 */
export async function handleSubmit(
  model: ApprovalModel,
  id: string,
  resourcePath: string
): Promise<void> {
  const submitter = await requireRole(SUBMIT_ROLES[model])

  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) throw new Error('记录不存在')
  if (currentStatus === ApprovalStatus.PENDING) {
    const existingInstance = await db.processInstance.findFirst({
      where: {
        resourceType: MODEL_RESOURCE_TYPE[model],
        resourceId: id,
        status: 'PENDING',
      },
      select: { id: true },
      orderBy: { startedAt: 'desc' },
    })
    if (existingInstance) {
      throw new Error('该记录已在审批中，请勿重复提交')
    }
  }

  // 查流程定义
  const resourceType = MODEL_RESOURCE_TYPE[model]
  const definition = await db.processDefinition.findUnique({
    where: { resourceType },
    include: { nodes: { orderBy: { order: 'asc' } } },
  })

  if (!definition || !definition.isActive || definition.nodes.length === 0) {
    throw new Error(`流程定义未配置或未激活（resourceType=${resourceType}），请联系管理员`)
  }

  const firstNode = definition.nodes[0]

  // 创建流程实例 + 第一个任务
  await db.processInstance.create({
    data: {
      definitionId: definition.id,
      resourceType,
      resourceId: id,
      submitterUserId: submitter.userid,
      submitterName: submitter.name,
      status: 'PENDING',
      tasks: {
        create: [
          {
            nodeId: firstNode.id,
            nodeOrder: firstNode.order,
            approverType: firstNode.approverType,
            approverRole: firstNode.approverRole,
            approverUserId: firstNode.approverUserId,
            status: 'PENDING',
          },
        ],
      },
    },
  })

  await updateApprovalStatus(model, id, {
    approvalStatus: ApprovalStatus.PENDING,
    submittedAt: new Date(),
    rejectedReason: null,
  })

  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `提交审批：${MODEL_LABEL[model]}（ID: ${id}）`,
  })

  sendApprovalSubmittedNotification({
    submitterDingUserId: submitter.userid,
    submitterName: submitter.name,
    modelLabel: MODEL_LABEL[model],
    resourceId: id,
    approverRole: firstNode.approverRole ?? undefined,
    ccMode: firstNode.ccMode,
    ccRole: firstNode.ccRole ?? undefined,
    ccUserId: firstNode.ccUserId ?? undefined,
  }).catch((err) => console.error('[钉钉通知] submit 通知异常:', err))
}

/**
 * 审批通过 v2
 * - 校验当前用户是否为当前任务的审批人
 * - 完成当前 task，推进到下一节点
 * - 若无下一节点，approvalStatus = APPROVED
 */
export async function handleApprove(
  model: ApprovalModel,
  id: string,
  resourcePath: string
): Promise<void> {
  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) throw new Error('记录不存在')
  if (currentStatus !== ApprovalStatus.PENDING) throw new Error('只有待审批状态的记录才能审批通过')

  const { instance, task } = await getPendingTask(model, id)
  if (!instance || !task) throw new Error('未找到待处理的审批任务')

  // 校验审批权限
  await assertApprover(task)

  const approver = await getCurrentUser()

  // 完成当前 task
  await db.processTask.update({
    where: { id: task.id },
    data: { status: 'APPROVED', handledAt: new Date(), handledBy: approver.userid },
  })

  // 查找下一节点
  const nextNode = await db.processNode.findFirst({
    where: { definitionId: instance.definitionId, order: { gt: task.nodeOrder } },
    orderBy: { order: 'asc' },
  })

  if (nextNode) {
    // 创建下一个 task
    await db.processTask.create({
      data: {
        instanceId: instance.id,
        nodeId: nextNode.id,
        nodeOrder: nextNode.order,
        approverType: nextNode.approverType,
        approverRole: nextNode.approverRole,
        approverUserId: nextNode.approverUserId,
        status: 'PENDING',
      },
    })
  } else {
    // 所有节点完成
    await db.processInstance.update({
      where: { id: instance.id },
      data: { status: 'APPROVED', finishedAt: new Date() },
    })
    await updateApprovalStatus(model, id, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedAt: new Date(),
    })
  }

  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `审批通过：${MODEL_LABEL[model]}（ID: ${id}）`,
  })

  const submitterDingUserId = await getSubmitterDingUserId(model, id)
  if (submitterDingUserId) {
    sendApprovalApprovedNotification({
      submitterDingUserId,
      modelLabel: MODEL_LABEL[model],
      resourceId: id,
    }).catch((err) => console.error('[钉钉通知] approve 通知异常:', err))
  }
}

/**
 * 审批驳回 v2
 */
export async function handleReject(
  model: ApprovalModel,
  id: string,
  reason: string | undefined,
  resourcePath: string
): Promise<void> {
  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) throw new Error('记录不存在')
  if (currentStatus !== ApprovalStatus.PENDING) throw new Error('只有待审批状态的记录才能驳回')

  const { instance, task } = await getPendingTask(model, id)
  if (!instance || !task) throw new Error('未找到待处理的审批任务')

  await assertApprover(task)

  const approver = await getCurrentUser()

  await db.processTask.update({
    where: { id: task.id },
    data: { status: 'REJECTED', handledAt: new Date(), handledBy: approver.userid, comment: reason ?? null },
  })

  await db.processInstance.update({
    where: { id: instance.id },
    data: { status: 'REJECTED', finishedAt: new Date() },
  })

  await updateApprovalStatus(model, id, {
    approvalStatus: ApprovalStatus.REJECTED,
    rejectedAt: new Date(),
    rejectedReason: reason ?? null,
  })

  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `审批驳回：${MODEL_LABEL[model]}（ID: ${id}）${reason ? `，原因：${reason}` : ''}`,
  })

  const submitterDingUserId = await getSubmitterDingUserId(model, id)
  if (submitterDingUserId) {
    sendApprovalRejectedNotification({
      submitterDingUserId,
      modelLabel: MODEL_LABEL[model],
      resourceId: id,
      reason,
    }).catch((err) => console.error('[钉钉通知] reject 通知异常:', err))
  }
}

/**
 * 撤回审批
 * - 仅提交人可撤回待审批单据
 * - 当前节点剩余待处理任务标记为 SKIPPED
 * - business approvalStatus = CANCELLED
 */
export async function handleCancel(
  model: ApprovalModel,
  id: string,
  resourcePath: string
): Promise<void> {
  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) throw new Error('记录不存在')
  if (currentStatus !== ApprovalStatus.PENDING) throw new Error('只有待审批状态的记录才能撤回')

  const { instance } = await getPendingTask(model, id)
  if (!instance) throw new Error('未找到待处理的审批流程')

  const user = await getCurrentUser()
  if (instance.submitterUserId !== user.userid) {
    throw new Error('只有提交人可以撤回审批')
  }

  await db.processTask.updateMany({
    where: {
      instanceId: instance.id,
      status: 'PENDING',
    },
    data: {
      status: 'SKIPPED',
      handledAt: new Date(),
      handledBy: user.userid,
      comment: '提交人撤回审批',
    },
  })

  await db.processInstance.update({
    where: { id: instance.id },
    data: {
      status: 'CANCELLED',
      finishedAt: new Date(),
    },
  })

  await updateApprovalStatus(model, id, {
    approvalStatus: ApprovalStatus.CANCELLED,
  })

  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `撤回审批：${MODEL_LABEL[model]}（ID: ${id}）`,
  })
}
