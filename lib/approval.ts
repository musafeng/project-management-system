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
import { assertResourceInCurrentRegion } from './region'

export const ApprovalStatus = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
} as const

export type ApprovalStatusType = keyof typeof ApprovalStatus

export type ApprovalModel =
  | 'constructionApproval'
  | 'projectContractChange'
  | 'procurementContract'
  | 'procurementPayment'
  | 'laborContract'
  | 'laborPayment'
  | 'subcontractContract'
  | 'subcontractPayment'

/** 各模块 submit 允许的角色。与当前业务菜单保持一致，避免创建后无法提交审批。 */
const ALL_SUBMIT_ROLES: SystemUserRole[] = [
  'ADMIN',
  'PROJECT_MANAGER',
  'FINANCE',
  'PURCHASE',
  'STAFF',
] as SystemUserRole[]

export const SUBMIT_ROLES: Record<ApprovalModel, SystemUserRole[]> = {
  constructionApproval: ALL_SUBMIT_ROLES,
  projectContractChange: ALL_SUBMIT_ROLES,
  procurementContract: ALL_SUBMIT_ROLES,
  procurementPayment: ALL_SUBMIT_ROLES,
  laborContract: ALL_SUBMIT_ROLES,
  laborPayment: ALL_SUBMIT_ROLES,
  subcontractContract: ALL_SUBMIT_ROLES,
  subcontractPayment: ALL_SUBMIT_ROLES,
}

/** 各模块资源类型（对应 ProcessDefinition.resourceType） */
export const MODEL_RESOURCE_TYPE: Record<ApprovalModel, string> = {
  constructionApproval: 'construction-approvals',
  projectContractChange: 'project-contract-changes',
  procurementContract: 'procurement-contracts',
  procurementPayment: 'procurement-payments',
  laborContract: 'labor-contracts',
  laborPayment: 'labor-payments',
  subcontractContract: 'subcontract-contracts',
  subcontractPayment: 'subcontract-payments',
}

const MODEL_LABEL: Record<ApprovalModel, string> = {
  constructionApproval: '施工立项',
  projectContractChange: '项目合同变更',
  procurementContract: '采购合同',
  procurementPayment: '采购付款',
  laborContract: '劳务合同',
  laborPayment: '劳务付款',
  subcontractContract: '分包合同',
  subcontractPayment: '分包付款',
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
      ProcessTask: {
        where: { status: 'PENDING' },
        orderBy: { nodeOrder: 'asc' },
        take: 1,
      },
    },
    orderBy: { startedAt: 'desc' },
  })
  return { instance, task: instance?.ProcessTask[0] ?? null }
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
  await assertResourceInCurrentRegion(MODEL_RESOURCE_TYPE[model], id)

  const submitter = await requireRole(SUBMIT_ROLES[model])

  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) throw new Error('记录不存在')
  if (currentStatus === ApprovalStatus.PENDING) throw new Error('该记录已在审批中，请勿重复提交')

  // 查流程定义
  const resourceType = MODEL_RESOURCE_TYPE[model]
  const definition = await db.processDefinition.findUnique({
    where: { resourceType },
    include: { ProcessNode: { orderBy: { order: 'asc' } } },
  })

  if (!definition || !definition.isActive || definition.ProcessNode.length === 0) {
    throw new Error(`流程定义未配置或未激活（resourceType=${resourceType}），请联系管理员`)
  }

  const firstNode = definition.ProcessNode[0]

  // 创建流程实例 + 第一个任务
  await db.processInstance.create({
    data: {
      id: crypto.randomUUID(),
      definitionId: definition.id,
      resourceType,
      resourceId: id,
      submitterUserId: submitter.userid,
      submitterName: submitter.name,
      status: 'PENDING',
      ProcessTask: {
        create: [
          {
            id: crypto.randomUUID(),
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
  await assertResourceInCurrentRegion(MODEL_RESOURCE_TYPE[model], id)

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
        id: crypto.randomUUID(),
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
  await assertResourceInCurrentRegion(MODEL_RESOURCE_TYPE[model], id)

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
