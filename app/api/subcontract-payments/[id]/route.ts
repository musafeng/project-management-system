import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertEditable } from '@/lib/approval'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/subcontract-payments/{id}
   * 获取付款详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    const payment = await db.subcontractPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        projectId: true,
        vendorId: true,
        contract: {
          select: {
            code: true,
            project: {
              select: { name: true },
            },
            vendor: {
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
      vendorId: payment.vendorId,
      contractCode: payment.contract.code,
      projectName: payment.contract.project.name,
      subcontractVendorName: payment.contract.vendor.name,
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
   * DELETE /api/subcontract-payments/{id}
   * 删除付款记录
   * 删除规则：回退合同汇总字段
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    // 获取付款记录
    const payment = await db.subcontractPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        paymentAmount: true,
        approvalStatus: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    // 审批状态锁定校验
    try {
      assertEditable(payment.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    // 获取合同信息
    const contract = await db.subcontractContract.findUnique({
      where: { id: payment.contractId },
      select: {
        id: true,
        payableAmount: true,
        paidAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('关联的分包合同不存在')
    }

    // 删除付款记录
    await db.subcontractPayment.delete({
      where: { id },
    })

    // 回退合同汇总字段
    const newPaidAmount =
      Number(contract.paidAmount) - Number(payment.paymentAmount)
    const newUnpaidAmount =
      Number(contract.payableAmount) - newPaidAmount

    await db.subcontractContract.update({
      where: { id: payment.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success({ message: '付款记录已删除' })
  },
})


