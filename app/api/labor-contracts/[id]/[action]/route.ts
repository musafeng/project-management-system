import { NextResponse } from 'next/server'
import { handleSubmit, handleApprove, handleReject, handleUrge } from '@/lib/approval'
import { success } from '@/lib/api'
import { toChineseErrorMessage } from '@/lib/api/error-message'

export const dynamic = 'force-dynamic'


const MODEL = 'laborContract' as const
const BASE = '/api/labor-contracts'

export async function POST(
  req: Request,
  { params }: { params: { id: string; action: string } }
) {
  const { id, action } = params
  try {
    if (action === 'submit') {
      await handleSubmit(MODEL, id, `${BASE}/${id}/submit`)
    } else if (action === 'approve') {
      await handleApprove(MODEL, id, `${BASE}/${id}/approve`)
    } else if (action === 'reject') {
      const body = await req.json().catch(() => ({}))
      await handleReject(MODEL, id, body.reason, `${BASE}/${id}/reject`)
    } else if (action === 'urge') {
      await handleUrge(MODEL, id, `${BASE}/${id}/urge`)
    } else {
      return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 })
    }
    return NextResponse.json(success(null))
  } catch (err) {
    const msg = toChineseErrorMessage(err instanceof Error ? err.message : '操作失败')
    const status = msg.includes('未登录') ? 401 : msg.includes('无权限') ? 403 : 400
    return NextResponse.json({ success: false, error: msg }, { status })
  }
}



