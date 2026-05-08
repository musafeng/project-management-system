export interface ApprovalStateLike {
  approvalStatus?: string | null
  approvedAt?: Date | string | null
}

export interface ApprovalStatusMeta {
  color: string
  label: string
}

const APPROVAL_STATUS_META: Record<string, ApprovalStatusMeta> = {
  DRAFT: { color: 'blue', label: '待提交' },
  PENDING: { color: 'orange', label: '审批中' },
  APPROVED: { color: 'green', label: '已通过' },
  REJECTED: { color: 'red', label: '已驳回' },
}

export function isApprovalDraft(record: ApprovalStateLike): boolean {
  return record.approvalStatus === 'DRAFT' || (record.approvalStatus === 'APPROVED' && !record.approvedAt)
}

export function isApprovalPending(record: ApprovalStateLike): boolean {
  return record.approvalStatus === 'PENDING'
}

export function isApprovalApproved(record: ApprovalStateLike): boolean {
  return record.approvalStatus === 'APPROVED' && !!record.approvedAt
}

export function isApprovalRejected(record: ApprovalStateLike): boolean {
  return record.approvalStatus === 'REJECTED'
}

export function isApprovalEditable(record: ApprovalStateLike): boolean {
  return isApprovalDraft(record) || isApprovalRejected(record)
}

export function isApprovalLocked(record: ApprovalStateLike): boolean {
  return !isApprovalEditable(record)
}

export function getApprovalLockReason(record: ApprovalStateLike): string | null {
  if (isApprovalPending(record)) {
    return '当前单据审批中，无法修改'
  }

  if (isApprovalApproved(record)) {
    return '当前单据已审批通过，无法修改'
  }

  return null
}

export function getApprovalDisplayStatus(record: ApprovalStateLike): string {
  if (isApprovalDraft(record)) {
    return 'DRAFT'
  }

  return record.approvalStatus || '-'
}

export function getApprovalStatusMeta(record: ApprovalStateLike): ApprovalStatusMeta {
  const displayStatus = getApprovalDisplayStatus(record)
  return APPROVAL_STATUS_META[displayStatus] || { color: 'default', label: displayStatus }
}

export function canSubmitApproval(
  record: ApprovalStateLike,
  latestInstanceStatus?: string | null
): boolean {
  if (latestInstanceStatus === 'PENDING' || latestInstanceStatus === 'APPROVED') {
    return false
  }

  return isApprovalEditable(record)
}

export function canUseAsApprovedUpstream(record: ApprovalStateLike): boolean {
  return isApprovalApproved(record)
}

export function getContractDisplayStatus(
  status: string | null | undefined,
  record: ApprovalStateLike
): string {
  if (isApprovalPending(record)) {
    return 'PENDING'
  }

  if (isApprovalApproved(record) && (!status || status === 'DRAFT' || status === 'PENDING')) {
    return 'APPROVED'
  }

  return status || 'DRAFT'
}

export function getIssuanceDisplayStatus(
  status: string | null | undefined,
  record: ApprovalStateLike
): string {
  if (isApprovalApproved(record)) {
    return status || 'ISSUED'
  }

  return 'PENDING_ISSUE'
}
