import { NextResponse } from 'next/server'
import { handleSubmit, handleApprove, handleReject } from '@/lib/approval'
import { success } from '@/lib/api'
import { db } from '@/lib/db'
import { BaseSettlementService } from '@/lib/settlement/base-settlement.service'

const MODEL = 'laborPayment' as const
const BASE = '/api/labor-payments'

export async function POST(
  req: Request,
  { params }: { params: { id: string; action: string } }
) {
  const { id, action } = params
  try {
    if (action === 'submit') {
      // 新流程：使用 BaseSettlementService 包裹 submit
      await submitWithSettlementService(id)
    } else if (action === 'approve') {
      await handleApprove(MODEL, id, `${BASE}/${id}/approve`)
    } else if (action === 'reject') {
      const body = await req.json().catch(() => ({}))
      await handleReject(MODEL, id, body.reason, `${BASE}/${id}/reject`)
    } else {
      return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 })
    }
    return NextResponse.json(success(null))
  } catch (err) {
    const msg = err instanceof Error ? err.message : '操作失败'
    const status = msg.includes('未登录') ? 401 : msg.includes('无权限') ? 403 : 400
    return NextResponse.json({ success: false, error: msg }, { status })
  }
}

/**
 * 劳务付款 submit - 使用 BaseSettlementService 包裹
 * 
 * 流程：
 * 1. 验证付款记录存在
 * 2. 在事务中调用原有 handleSubmit
 * 3. 刷新合同金额
 * 4. 记录审计日志
 */
async function submitWithSettlementService(id: string): Promise<void> {
  try {
    await BaseSettlementService.executeInTransaction(async (context) => {
      // 1. 验证付款记录存在
      const payment = await db.laborPayment.findUnique({
        where: { id },
        select: {
          id: true,
          contractId: true,
          paymentAmount: true,
          approvalStatus: true,
        },
      })

      if (!payment) {
        throw new Error('劳务付款记录不存在')
      }

      // 2. 验证状态允许提交
      if (payment.approvalStatus === 'PENDING') {
        throw new Error('该记录已在审批中，请勿重复提交')
      }

      // 3. 调用原有 handleSubmit（处理审批流程）
      await handleSubmit(MODEL, id, `${BASE}/${id}/submit`)

      // 4. 刷新合同金额
      await BaseSettlementService.refreshAmounts('LaborPayment', payment.contractId, context)

      // 5. 记录审计日志
      await BaseSettlementService.logAudit('CREATE', 'LaborPayment', id, {
        contractId: payment.contractId,
        paymentAmount: payment.paymentAmount,
        action: 'submit',
      })
    })
  } catch (error) {
    const settlementError = BaseSettlementService.handleSettlementError(error)
    throw new Error(settlementError.message)
  }
}






