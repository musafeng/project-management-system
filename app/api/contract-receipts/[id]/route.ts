import { apiHandlerWithMethod, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { BaseSettlementService } from '@/lib/settlement/base-settlement.service'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/contract-receipts/{id}
   * 获取收款详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少收款记录 ID')
    }

    const receipt = await db.contractReceipt.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        contract: {
          select: {
            code: true,
            project: {
              select: { name: true },
            },
          },
        },
        receiptAmount: true,
        receiptDate: true,
        receiptMethod: true,
        receiptNumber: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!receipt) {
      throw new NotFoundError('收款记录不存在')
    }

    return success({
      id: receipt.id,
      contractId: receipt.contractId,
      contractCode: receipt.contract.code,
      projectName: receipt.contract.project.name,
      amount: receipt.receiptAmount,
      receiptDate: receipt.receiptDate,
      receiptMethod: receipt.receiptMethod,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
      remark: receipt.remark,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    })
  },

  /**
   * DELETE /api/contract-receipts/{id}
   * 删除收款记录
   * 
   * 流程：
   * 1. 验证收款记录存在
   * 2. 在事务中删除记录
   * 3. 重新汇总合同下全部收款，更新合同金额字段
   * 4. 记录审计日志
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少收款记录 ID')
    }

    try {
      // 在事务中执行删除和金额刷新
      const result = await BaseSettlementService.executeInTransaction(async (context) => {
        // 1. 查询并确认收款记录存在
        const receipt = await db.contractReceipt.findUnique({
          where: { id },
          select: {
            id: true,
            contractId: true,
            receiptAmount: true,
          },
        })

        if (!receipt) {
          throw new NotFoundError('收款记录不存在')
        }

        // 2. 验证合同存在
        const contract = await db.projectContract.findUnique({
          where: { id: receipt.contractId },
          select: { id: true },
        })

        if (!contract) {
          throw new NotFoundError('关联的合同不存在')
        }

        // 3. 删除收款记录
        await db.contractReceipt.delete({
          where: { id },
        })

        // 4. 调用统一金额刷新入口
        // 这会重新汇总该合同下全部收款记录，然后更新合同的 receivedAmount 和 unreceivedAmount
        await BaseSettlementService.refreshAmounts('ContractReceipt', receipt.contractId, context)

        // 5. 调用审计日志预留方法
        await BaseSettlementService.logAudit('DELETE', 'ContractReceipt', id, {
          contractId: receipt.contractId,
          receiptAmount: receipt.receiptAmount,
        })

        return { message: '收款记录已删除' }
      })

      return success(result)
    } catch (error) {
      // 统一错误处理
      const settlementError = BaseSettlementService.handleSettlementError(error)
      throw new (settlementError.statusCode === 404 ? NotFoundError : BadRequestError)(
        settlementError.message
      )
    }
  },
})


