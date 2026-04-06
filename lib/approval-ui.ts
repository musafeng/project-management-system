export const APPROVAL_STATUS_OPTIONS = [
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已撤回', value: 'CANCELLED' },
]

export type ApprovalActionType = 'submit' | 'approve' | 'reject' | 'cancel'

const PROCESS_TASK_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: '已提交',
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  SKIPPED: '已撤回',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '系统管理员',
  FINANCE: '财务人员',
  PURCHASE: '采购人员',
  PROJECT_MANAGER: '项目经理',
  STAFF: '普通员工',
}

export function isApprovalReadonly(status?: string | null): boolean {
  return status === 'PENDING' || status === 'APPROVED'
}

export function getApprovalStatusLabel(status?: string | null): string {
  const matched = APPROVAL_STATUS_OPTIONS.find((item) => item.value === status)
  return matched?.label || status || '-'
}

export function getProcessTaskStatusLabel(status?: string | null): string {
  if (!status) return '-'
  return PROCESS_TASK_STATUS_LABELS[status] || status
}

export function getRoleLabel(role?: string | null): string {
  if (!role) return '-'
  return ROLE_LABELS[role] || role
}

export function getApprovalNextStatus(action: ApprovalActionType): string {
  if (action === 'submit') return 'PENDING'
  if (action === 'approve') return 'APPROVED'
  if (action === 'cancel') return 'CANCELLED'
  return 'REJECTED'
}

export function getApprovalSuccessMessage(action: ApprovalActionType): string {
  if (action === 'submit') return '已提交审批，状态已更新为待审批'
  if (action === 'approve') return '审批已通过，台账状态已更新'
  if (action === 'cancel') return '已撤回审批，状态已更新'
  return '已驳回，台账状态已更新'
}

export function getApprovalErrorMessage(action: ApprovalActionType): string {
  if (action === 'submit') return '提交审批失败'
  if (action === 'approve') return '审批通过失败'
  if (action === 'cancel') return '撤回审批失败'
  return '驳回失败'
}

export function getApprovalBatchPositionHint(params: {
  summary: string
  position?: number
  total?: number
  hasNext?: boolean
}): string {
  if (!params.total || !params.position) {
    return `${params.summary} · 当前待办已不在这组审批结果中`
  }
  const tail = params.hasNext ? '处理后可继续下一条' : '当前已是最后一条'
  return `${params.summary} · 当前第 ${params.position} 条 / 共 ${params.total} 条 · ${tail}`
}

export function getApprovalBatchActionHint(hasNext: boolean): string {
  return hasNext
    ? '当前待办已处理，可继续下一条，也可返回审批列表'
    : '当前筛选结果已处理完，可返回审批列表查看其他待办'
}

export function getApprovalBatchListHint(params: {
  summary: string
  page: number
  pageItemCount: number
  total: number
  position?: number
  hasNext?: boolean
}): string {
  if (params.position && params.total) {
    return getApprovalBatchPositionHint({
      summary: params.summary,
      position: params.position,
      total: params.total,
      hasNext: params.hasNext,
    })
  }
  if (!params.total) {
    return `${params.summary} · 当前筛选结果暂无待办`
  }
  return `${params.summary} · 当前第 ${params.page} 页 · 本页 ${params.pageItemCount} 条 / 共 ${params.total} 条`
}
