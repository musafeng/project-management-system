import { getApprovalStatusLabel } from './approval-ui'

export const READONLY_ACTION_HINT = '待审批或已通过的记录不可编辑或删除'
export const LEDGER_EMPTY_VALUE = '—'

const BUSINESS_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  EXECUTING: '执行中',
  COMPLETED: '已完成',
  TERMINATED: '已终止',
  CANCELLED: '已取消',
  PAID: '已付款',
  RECEIVED: '已收款',
}

export function getLedgerEmptyText(subject: string, createAction: string): string {
  return `暂无${subject}，可先${createAction}或调整筛选条件`
}

export function getBusinessStatusLabel(status?: string | null): string {
  if (!status) return LEDGER_EMPTY_VALUE
  return BUSINESS_STATUS_LABELS[status] || status
}

export function getDisplayText(value?: string | number | null): string {
  if (value === null || value === undefined) return LEDGER_EMPTY_VALUE
  if (typeof value === 'string' && value.trim() === '') return LEDGER_EMPTY_VALUE
  return String(value)
}

export function getDeleteConfirmTitle(subject: string): string {
  return `删除${subject}`
}

export function getDeleteConfirmDescription(subject: string): string {
  return `确定删除该${subject}吗？删除后不可恢复。`
}

export function getDeleteSuccessMessage(subject: string): string {
  return `${subject}已删除`
}

export function getSaveSuccessMessage(subject: string, editing: boolean): string {
  return `${subject}${editing ? '已更新' : '已创建'}`
}

export function getProgressPercent(current?: number | null, total?: number | null): number {
  const numericTotal = Number(total || 0)
  if (numericTotal <= 0) return 0
  return Number(((Number(current || 0) / numericTotal) * 100).toFixed(1))
}

export function getProgressText(current?: number | null, total?: number | null): string {
  return `${getProgressPercent(current, total).toFixed(1)}%`
}

export function getContractChangeHint(changedAmount?: number | null): string {
  const amount = Number(changedAmount || 0)
  if (amount > 0) return '变更金额为正，表示当前合同执行金额已增加'
  if (amount < 0) return '变更金额为负，表示当前合同执行金额已减少'
  return '当前暂无合同变更金额'
}

export function getExecutionStatusHint(status?: string | null): string {
  if (status === 'DRAFT') return '当前仍是草稿，尚未进入正式执行'
  if (status === 'PENDING') return '当前待审批，审批通过后进入执行'
  if (status === 'APPROVED') return '当前已审批通过，可按合同约定执行'
  if (status === 'EXECUTING') return '当前正在按合同约定执行'
  if (status === 'COMPLETED') return '当前合同已执行完成'
  if (status === 'TERMINATED') return '当前合同已终止执行'
  if (status === 'CANCELLED') return '当前合同已取消'
  return '当前状态以台账记录为准'
}

export function getApprovalStatusHint(status?: string | null): string {
  if (!status) return '当前未进入审批流'
  if (status === 'PENDING') return '当前处于审批处理中'
  if (status === 'APPROVED') return '当前审批已通过'
  if (status === 'REJECTED') return '当前审批已驳回，可修改后重新提交'
  if (status === 'CANCELLED') return '当前审批已撤回，可继续调整后再提交'
  return `当前审批状态：${getApprovalStatusLabel(status)}`
}

export function getApprovalActionBoundaryHint(status?: string | null, subject = '单据'): string {
  if (!status) return `${subject}当前可继续编辑并按流程提交审批`
  if (status === 'PENDING') return `${subject}正在审批中，当前可查看审批轨迹和关联合同台账，暂不可编辑或删除`
  if (status === 'APPROVED') return `${subject}已审批通过，当前可查看关联台账和业务明细，暂不可编辑或删除`
  if (status === 'REJECTED') return `${subject}已驳回，可修改后重新提交审批`
  if (status === 'CANCELLED') return `${subject}已撤回，可继续调整后重新提交审批`
  return `${subject}当前操作边界以审批状态为准`
}

export function getLinkedFlowStatusText(status?: string | null, approvalStatus?: string | null): string {
  const parts = [approvalStatus ? getApprovalStatusLabel(approvalStatus) : '', status ? getBusinessStatusLabel(status) : '']
    .filter(Boolean)
  return parts.join(' / ') || LEDGER_EMPTY_VALUE
}

export function joinDetailHints(...parts: Array<string | null | undefined>): string {
  return parts.map((item) => item?.trim()).filter(Boolean).join('；')
}

export function getChangeTypeLabel(changeType?: string | null): string {
  if (changeType === 'INCREASE') return '增项变更'
  if (changeType === 'DECREASE') return '减项变更'
  if (changeType === 'ADJUSTMENT') return '调整变更'
  return '变更记录'
}

export function getChangeImpactHint(
  changeAmount?: number | null,
  afterAmount?: number | null,
  approvalStatus?: string | null,
): string {
  const numericChange = Number(changeAmount || 0)
  const nextAmountText = afterAmount === null || afterAmount === undefined ? '变更后金额以台账记录为准' : `变更后合同金额为 ${afterAmount}`
  if (numericChange > 0) return `${nextAmountText}，本次变更使合同执行金额增加，当前审批状态为 ${getApprovalStatusLabel(approvalStatus)}`
  if (numericChange < 0) return `${nextAmountText}，本次变更使合同执行金额减少，当前审批状态为 ${getApprovalStatusLabel(approvalStatus)}`
  return `${nextAmountText}，本次记录主要用于留痕当前合同调整情况`
}

export function getApprovalTrailActorLabel(status?: string | null): string {
  if (status === 'SUBMITTED') return '提交人'
  if (status === 'PENDING') return '当前待处理人'
  if (status === 'SKIPPED') return '撤回处理人'
  return '处理人'
}

export function getApprovalTrailActionLabel(status?: string | null): string {
  if (status === 'SUBMITTED') return '提交审批'
  if (status === 'PENDING') return '待审批'
  if (status === 'APPROVED') return '审批通过'
  if (status === 'REJECTED') return '审批驳回'
  if (status === 'SKIPPED') return '撤回审批'
  return '审批处理'
}

export function getApprovalTrailHint(status?: string | null, comment?: string | null): string {
  if (status === 'SUBMITTED') return '该节点表示单据已正式提交审批，正在流转到下一位处理人'
  if (status === 'PENDING') return '当前审批卡在该节点，需由对应处理人继续处理'
  if (status === 'APPROVED') return comment ? '该节点已审批通过，处理意见已留痕' : '该节点已审批通过'
  if (status === 'REJECTED') return comment ? '该节点已驳回，处理意见可作为后续修改依据' : '该节点已驳回，需按原因调整后再提交'
  if (status === 'SKIPPED') return '该节点已因撤回而结束处理'
  return '当前节点处理情况以审批流记录为准'
}

export function getApprovalTrailEffectHint(status?: string | null): string {
  if (status === 'SUBMITTED') return '对当前单据的影响：状态进入待审批'
  if (status === 'PENDING') return '对当前单据的影响：单据仍停留在审批处理中'
  if (status === 'APPROVED') return '对当前单据的影响：审批已通过，单据进入已通过状态'
  if (status === 'REJECTED') return '对当前单据的影响：审批已驳回，可修改后重新提交'
  if (status === 'SKIPPED') return '对当前单据的影响：审批已撤回，单据回到可调整状态'
  return '对当前单据的影响以审批流状态为准'
}
