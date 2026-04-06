import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { BaseSettlementService } from '@/lib/settlement/base-settlement.service'
import { assertEditable, getApprovalTimeline } from '@/lib/approval'

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
            name: true,
            status: true,
            receivableAmount: true,
            receivedAmount: true,
            unreceivedAmount: true,
            project: {
              select: {
                id: true,
                name: true,
                customer: {
                  select: { name: true },
                },
              },
            },
          },
        },
        receiptAmount: true,
        receiptDate: true,
        receiptMethod: true,
        receiptNumber: true,
        attachmentUrl: true,
        approvalStatus: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!receipt) {
      throw new NotFoundError('收款记录不存在')
    }

    const relatedReceipts = await db.contractReceipt.findMany({
      where: { contractId: receipt.contractId },
      orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        receiptDate: true,
        receiptAmount: true,
        receiptMethod: true,
        receiptNumber: true,
        status: true,
        approvalStatus: true,
      },
    })
    const approvalTrail = await getApprovalTimeline('contractReceipt', receipt.id)

    return success({
      id: receipt.id,
      contractId: receipt.contractId,
      contractCode: receipt.contract.code,
      contractName: receipt.contract.name,
      projectId: receipt.contract.project.id,
      contractStatus: receipt.contract.status,
      projectName: receipt.contract.project.name,
      customerName: receipt.contract.project.customer.name,
      receivableAmount: receipt.contract.receivableAmount,
      receivedAmount: receipt.contract.receivedAmount,
      unreceivedAmount: receipt.contract.unreceivedAmount,
      amount: receipt.receiptAmount,
      receiptDate: receipt.receiptDate,
      receiptMethod: receipt.receiptMethod,
      receiptNumber: receipt.receiptNumber,
      attachmentUrl: receipt.attachmentUrl,
      approvalStatus: receipt.approvalStatus,
      status: receipt.status,
      remark: receipt.remark,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      relatedFlows: relatedReceipts.map((item) => ({
        id: item.id,
        date: item.receiptDate,
        amount: item.receiptAmount,
        method: item.receiptMethod,
        number: item.receiptNumber,
        status: item.status,
        approvalStatus: item.approvalStatus,
      })),
      approvalTrail: approvalTrail.map((item) => ({
        id: item.id,
        nodeName: item.nodeName,
        status: item.status,
        operatorName: item.operatorName,
        handledAt: item.handledAt,
        createdAt: item.createdAt,
        comment: item.comment,
      })),
    })
  },

  /**
   * PUT /api/contract-receipts/{id}
   * 更新收款详情，并同步合同汇总
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少收款记录 ID')
    }

    const body = await req.json()
    const existing = await db.contractReceipt.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        receiptAmount: true,
        receiptDate: true,
        approvalStatus: true,
      },
    })

    if (!existing) {
      throw new NotFoundError('收款记录不存在')
    }

    try {
      assertEditable(existing.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const nextContractId = typeof body.contractId === 'string' && body.contractId.trim()
      ? body.contractId
      : existing.contractId

    const nextAmount = body.amount !== undefined ? Number(body.amount) : Number(existing.receiptAmount)
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      throw new BadRequestError('收款金额必须大于 0')
    }

    if (body.receiptDate !== undefined) {
      if (!body.receiptDate || typeof body.receiptDate !== 'string') {
        throw new BadRequestError('收款日期不能为空')
      }
      const receiptDate = new Date(body.receiptDate)
      if (Number.isNaN(receiptDate.getTime())) {
        throw new BadRequestError('收款日期格式不正确')
      }
    }

    const nextContract = await db.projectContract.findUnique({
      where: { id: nextContractId },
      select: {
        id: true,
        receivableAmount: true,
        receivedAmount: true,
      },
    })

    if (!nextContract) {
      throw new NotFoundError('关联合同不存在')
    }

    const oldContract = existing.contractId === nextContractId
      ? nextContract
      : await db.projectContract.findUnique({
          where: { id: existing.contractId },
          select: {
            id: true,
            receivableAmount: true,
            receivedAmount: true,
          },
        })

    if (!oldContract) {
      throw new NotFoundError('原合同不存在')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.contractReceipt.update({
        where: { id },
        data: {
          contractId: nextContractId,
          receiptAmount: nextAmount,
          receiptDate: body.receiptDate ? new Date(body.receiptDate) : existing.receiptDate,
          receiptMethod: body.receiptMethod !== undefined ? (body.receiptMethod?.trim() || null) : undefined,
          receiptNumber: body.receiptNumber !== undefined ? (body.receiptNumber?.trim() || null) : undefined,
          attachmentUrl: body.attachmentUrl !== undefined ? (body.attachmentUrl?.trim() || null) : undefined,
          remark: body.remark !== undefined ? (body.remark?.trim() || null) : undefined,
        },
        select: {
          id: true,
          contractId: true,
        contract: {
          select: {
            code: true,
            name: true,
            status: true,
            receivableAmount: true,
            receivedAmount: true,
            unreceivedAmount: true,
            project: {
              select: {
                name: true,
                customer: {
                  select: { name: true },
                },
              },
            },
          },
        },
          receiptAmount: true,
          receiptDate: true,
          receiptMethod: true,
          receiptNumber: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (existing.contractId === nextContractId) {
        const nextReceivedAmount = Number(oldContract.receivedAmount) - Number(existing.receiptAmount) + nextAmount
        await tx.projectContract.update({
          where: { id: nextContractId },
          data: {
            receivedAmount: nextReceivedAmount,
            unreceivedAmount: Number(oldContract.receivableAmount) - nextReceivedAmount,
          },
        })
      } else {
        const oldReceivedAmount = Number(oldContract.receivedAmount) - Number(existing.receiptAmount)
        await tx.projectContract.update({
          where: { id: existing.contractId },
          data: {
            receivedAmount: oldReceivedAmount,
            unreceivedAmount: Number(oldContract.receivableAmount) - oldReceivedAmount,
          },
        })

        const newReceivedAmount = Number(nextContract.receivedAmount) + nextAmount
        await tx.projectContract.update({
          where: { id: nextContractId },
          data: {
            receivedAmount: newReceivedAmount,
            unreceivedAmount: Number(nextContract.receivableAmount) - newReceivedAmount,
          },
        })
      }

      return record
    })

    return success({
      id: updated.id,
      contractId: updated.contractId,
      contractCode: updated.contract.code,
      contractName: updated.contract.name,
      contractStatus: updated.contract.status,
      projectName: updated.contract.project.name,
      customerName: updated.contract.project.customer.name,
      receivableAmount: updated.contract.receivableAmount,
      receivedAmount: updated.contract.receivedAmount,
      unreceivedAmount: updated.contract.unreceivedAmount,
      amount: updated.receiptAmount,
      receiptDate: updated.receiptDate,
      receiptMethod: updated.receiptMethod,
      receiptNumber: updated.receiptNumber,
      attachmentUrl: updated.attachmentUrl,
      approvalStatus: updated.approvalStatus,
      remark: updated.remark,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
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
            approvalStatus: true,
          },
        })

        if (!receipt) {
          throw new NotFoundError('收款记录不存在')
        }

        try {
          assertEditable(receipt.approvalStatus)
        } catch (err) {
          throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
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

export const GET = handler
export const PUT = handler
export const DELETE = handler
