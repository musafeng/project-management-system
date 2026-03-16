import { apiHandlerWithMethod, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

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
   * 删除规则：回退合同汇总字段
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少收款记录 ID')
    }

    // 获取收款记录
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

    // 获取合同信息
    const contract = await db.projectContract.findUnique({
      where: { id: receipt.contractId },
      select: {
        id: true,
        receivableAmount: true,
        receivedAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('关联的合同不存在')
    }

    // 删除收款记录
    await db.contractReceipt.delete({
      where: { id },
    })

    // 回退合同汇总字段
    const newReceivedAmount = contract.receivedAmount - receipt.receiptAmount
    const newUnreceivedAmount = contract.receivableAmount - newReceivedAmount

    await db.projectContract.update({
      where: { id: receipt.contractId },
      data: {
        receivedAmount: newReceivedAmount,
        unreceivedAmount: newUnreceivedAmount,
      },
    })

    return success({ message: '收款记录已删除' })
  },
})

