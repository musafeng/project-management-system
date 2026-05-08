import { handleApprovalActionRequest } from '@/lib/approval-action-route'

export const dynamic = 'force-dynamic'

const MODEL = 'contractReceipt' as const
const BASE = '/api/contract-receipts'

export async function POST(
  req: Request,
  { params }: { params: { id: string; action: string } }
) {
  return handleApprovalActionRequest(req, params, MODEL, BASE)
}
