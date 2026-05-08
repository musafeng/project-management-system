import { BadRequestError } from '@/lib/api'
import { canUseAsApprovedUpstream, type ApprovalStateLike } from '@/lib/approval-status'

export function assertApprovedUpstream(record: ApprovalStateLike, label: string): void {
  if (!canUseAsApprovedUpstream(record)) {
    throw new BadRequestError(`只能选择已审批通过的${label}`)
  }
}
