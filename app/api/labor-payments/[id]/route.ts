import { apiHandlerWithMethod, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/labor-payments/{id}
   * 获取付款详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    const payment = await db.laborPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        projectId: true,
        workerId: true,
        contract: {
          select: {
            code: true,
            project: {
              select: { name: true },
            },
            worker: {
              select: { name: true },
            },
          },
        },
        paymentAmount: true,
        paymentDate: true,
        paymentMethod: true,
        paymentNumber: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    return success({
      id: payment.id,
      contractId: payment.contractId,
      projectId: payment.projectId,
      workerId: payment.workerId,
      contractCode: payment.contract.code,
      projectName: payment.contract.project.name,
      laborWorkerName: payment.contract.worker.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentNumber: payment.paymentNumber,
      status: payment.status,
      remark: payment.remark,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })
  },

  /**
   * DELETE /api/labor-payments/{id}
   * 删除付款记录
   * 删除规则：回退合同汇总字段
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    // 获取付款记录
    const payment = await db.laborPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        paymentAmount: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    // 获取合同信息
    const contract = await db.laborContract.findUnique({
      where: { id: payment.contractId },
      select: {
        id: true,
        payableAmount: true,
        paidAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('关联的劳务合同不存在')
    }

    // 删除付款记录
    await db.laborPayment.delete({
      where: { id },
    })

    // 回退合同汇总字段
    const newPaidAmount =
      Number(contract.paidAmount) - Number(payment.paymentAmount)
    const newUnpaidAmount =
      Number(contract.payableAmount) - newPaidAmount

    await db.laborContract.update({
      where: { id: payment.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success({ message: '付款记录已删除' })
  },
})


