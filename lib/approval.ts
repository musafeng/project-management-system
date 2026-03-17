/**
 * 通用审批动作工具
 * 供各业务模块的 submit / approve / reject 路由复用
 */

import { db } from './db'
import { createActionLog } from './action-log'
import { ActionType } from '@prisma/client'
import type { SystemUserRole } from '@prisma/client'
import { requireRole, requireAdmin } from './api'
import {
  sendApprovalSubmittedNotification,
  sendApprovalApprovedNotification,
  sendApprovalRejectedNotification,
} from './dingtalk-notify'

/**
 * 审批状态常量
 */
export const ApprovalStatus = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
} as const

export type ApprovalStatusType = keyof typeof ApprovalStatus

/**
 * 支持的业务模型名称
 */
export type ApprovalModel =
  | 'constructionApproval'
  | 'procurementContract'
  | 'procurementPayment'
  | 'laborContract'
  | 'laborPayment'
  | 'subcontractContract'
  | 'subcontractPayment'

/**
 * 各模块 submit 允许的角色
 */
export const SUBMIT_ROLES: Record<ApprovalModel, SystemUserRole[]> = {
  constructionApproval: ['PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  procurementContract: ['PURCHASE', 'ADMIN'] as SystemUserRole[],
  procurementPayment: ['FINANCE', 'PURCHASE', 'ADMIN'] as SystemUserRole[],
  laborContract: ['PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  laborPayment: ['FINANCE', 'PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  subcontractContract: ['PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
  subcontractPayment: ['FINANCE', 'PROJECT_MANAGER', 'ADMIN'] as SystemUserRole[],
}

/**
 * 各模块的中文名称（用于日志）
 */
const MODEL_LABEL: Record<ApprovalModel, string> = {
  constructionApproval: '施工立项',
  procurementContract: '采购合同',
  procurementPayment: '采购付款',
  laborContract: '劳务合同',
  laborPayment: '劳务付款',
  subcontractContract: '分包合同',
  subcontractPayment: '分包付款',
}

/**
 * 获取当前记录的 approvalStatus
 */
async function getApprovalStatus(model: ApprovalModel, id: string): Promise<string | null> {
  const record = await (db[model] as any).findUnique({
    where: { id },
    select: { approvalStatus: true },
  })
  return record?.approvalStatus ?? null
}

/**
 * 更新 approvalStatus 及相关时间字段
 */
async function updateApprovalStatus(
  model: ApprovalModel,
  id: string,
  data: Record<string, any>
): Promise<void> {
  await (db[model] as any).update({
    where: { id },
    data,
  })
}

/**
 * 从 ActionLog 中查询最近一次提交该单据的用户 dingUserId
 * 用于 approve / reject 时定向通知提交人
 */
async function getSubmitterDingUserId(
  model: ApprovalModel,
  id: string
): Promise<string | null> {
  try {
    const log = await db.actionLog.findFirst({
      where: {
        resource: MODEL_LABEL[model],
        resourceId: id,
        detail: { contains: '提交审批' },
      },
      select: { userId: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!log?.userId) return null

    // userId 存储的是钉钉 dingUserId
    return log.userId
  } catch (error) {
    console.error('[钉钉通知] 查询提交人 dingUserId 失败:', error)
    return null
  }
}

/**
 * 断言记录可编辑（PUT / DELETE 前调用）
 *
 * 规则：
 * - PENDING  → 403 当前单据审批中，无法修改
 * - APPROVED → 403 当前单据已审批通过，无法修改
 * - REJECTED → 允许
 */
export function assertEditable(approvalStatus: string): void {
  if (approvalStatus === ApprovalStatus.PENDING) {
    throw new Error('当前单据审批中，无法修改')
  }
  if (approvalStatus === ApprovalStatus.APPROVED) {
    throw new Error('当前单据已审批通过，无法修改')
  }
}

/**
 * 提交审批
 * - 允许 APPROVED 或 REJECTED 状态的记录提交
 * - 权限：各模块有自己的允许角色
 */
export async function handleSubmit(
  model: ApprovalModel,
  id: string,
  resourcePath: string
): Promise<void> {
  // 权限校验
  const submitter = await requireRole(SUBMIT_ROLES[model])

  // 检查记录是否存在
  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) {
    throw new Error('记录不存在')
  }

  // 仅 APPROVED 或 REJECTED 可提交
  if (currentStatus === ApprovalStatus.PENDING) {
    throw new Error('该记录已在审批中，请勿重复提交')
  }

  await updateApprovalStatus(model, id, {
    approvalStatus: ApprovalStatus.PENDING,
    submittedAt: new Date(),
    rejectedReason: null,
  })

  // 写操作日志
  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `提交审批：${MODEL_LABEL[model]}（ID: ${id}）`,
  })

  // 发送钉钉通知（失败不影响主流程）
  sendApprovalSubmittedNotification({
    submitterDingUserId: submitter.userid,
    submitterName: submitter.name,
    modelLabel: MODEL_LABEL[model],
    resourceId: id,
  }).catch((err) => console.error('[钉钉通知] submit 通知异常:', err))
}

/**
 * 审批通过
 * - 仅 PENDING 状态可通过
 * - 权限：仅 ADMIN
 */
export async function handleApprove(
  model: ApprovalModel,
  id: string,
  resourcePath: string
): Promise<void> {
  await requireAdmin()

  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) {
    throw new Error('记录不存在')
  }

  if (currentStatus !== ApprovalStatus.PENDING) {
    throw new Error('只有待审批状态的记录才能审批通过')
  }

  // 查询提交人 dingUserId（submittedAt 不为空的最近一次提交人暂无记录，用 actionLog 中查）
  const submitterDingUserId = await getSubmitterDingUserId(model, id)

  await updateApprovalStatus(model, id, {
    approvalStatus: ApprovalStatus.APPROVED,
    approvedAt: new Date(),
  })

  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `审批通过：${MODEL_LABEL[model]}（ID: ${id}）`,
  })

  // 发送钉钉通知（失败不影响主流程）
  if (submitterDingUserId) {
    sendApprovalApprovedNotification({
      submitterDingUserId,
      modelLabel: MODEL_LABEL[model],
      resourceId: id,
    }).catch((err) => console.error('[钉钉通知] approve 通知异常:', err))
  }
}

/**
 * 审批驳回
 * - 仅 PENDING 状态可驳回
 * - 权限：仅 ADMIN
 */
export async function handleReject(
  model: ApprovalModel,
  id: string,
  reason: string | undefined,
  resourcePath: string
): Promise<void> {
  await requireAdmin()

  const currentStatus = await getApprovalStatus(model, id)
  if (currentStatus === null) {
    throw new Error('记录不存在')
  }

  if (currentStatus !== ApprovalStatus.PENDING) {
    throw new Error('只有待审批状态的记录才能驳回')
  }

  // 查询提交人 dingUserId
  const submitterDingUserId = await getSubmitterDingUserId(model, id)

  await updateApprovalStatus(model, id, {
    approvalStatus: ApprovalStatus.REJECTED,
    rejectedAt: new Date(),
    rejectedReason: reason || null,
  })

  await createActionLog({
    action: ActionType.UPDATE,
    resource: MODEL_LABEL[model],
    resourceId: id,
    method: 'POST',
    path: resourcePath,
    detail: `审批驳回：${MODEL_LABEL[model]}（ID: ${id}）${reason ? `，原因：${reason}` : ''}`,
  })

  // 发送钉钉通知（失败不影响主流程）
  if (submitterDingUserId) {
    sendApprovalRejectedNotification({
      submitterDingUserId,
      modelLabel: MODEL_LABEL[model],
      resourceId: id,
      reason,
    }).catch((err) => console.error('[钉钉通知] reject 通知异常:', err))
  }
}

