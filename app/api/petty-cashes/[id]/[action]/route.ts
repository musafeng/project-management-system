import { handleApprovalActionRequest } from '@/lib/approval-action-route'

export const dynamic = 'force-dynamic'

const MODEL = 'pettyCash' as const
const BASE = '/api/petty-cashes'

export async function POST(
  req: Request,
  { params }: { params: { id: string; action: string } }
) {
  return handleApprovalActionRequest(req, params, MODEL, BASE)
}
