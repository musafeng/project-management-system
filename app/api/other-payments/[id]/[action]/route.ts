import { handleApprovalActionRequest } from '@/lib/approval-action-route'

export const dynamic = 'force-dynamic'

const MODEL = 'otherPayment' as const
const BASE = '/api/other-payments'

export async function POST(
  req: Request,
  { params }: { params: { id: string; action: string } }
) {
  return handleApprovalActionRequest(req, params, MODEL, BASE)
}
