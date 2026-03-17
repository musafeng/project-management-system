import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/subcontract-payments
   * 获取分包付款列表
   * 支持参数：contractId（可选）、projectId（可选）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    const projectId = searchParams.get('projectId')

    const where: any = {}

    if (contractId) {
      where.contractId = contractId
    }

    if (projectId) {
      where.projectId = projectId
    }

    const payments = await db.subcontractPayment.findMany({
      where,
      select: {
        id: true,
        contractId: true,
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
        remark: true,
        createdAt: true,
      },
      orderBy: { paymentDate: 'desc' },
    })

    // 转换返回格式
    type PaymentItem = (typeof payments)[number]
    const result = payments.map((payment: PaymentItem) => ({
      id: payment.id,
      contractCode: payment.contract.code,
      projectName: payment.contract.project.name,
      subcontractVendorName: payment.contract.vendor.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      remark: payment.remark,
      createdAt: payment.createdAt,
    }))

    return success(result)
  },

  /**
   * POST /api/subcontract-payments
   * 创建分包付款
   * body: { contractId, amount, paymentDate?, remark? }
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.contractId || typeof body.contractId !== 'string') {
      throw new BadRequestError('合同 ID 为必填项')
    }

    if (body.amount === undefined || typeof body.amount !== 'number') {
      throw new BadRequestError('付款金额为必填项且必须是数字')
    }

    if (body.amount <= 0) {
      throw new BadRequestError('付款金额必须大于 0')
    }

    // 验证合同是否存在
    const contract = await db.subcontractContract.findUnique({
      where: { id: body.contractId },
      select: {
        id: true,
        projectId: true,
        vendorId: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('分包合同不存在')
    }

    // 创建付款记录
    const createData: Prisma.SubcontractPaymentUncheckedCreateInput = {
      projectId: contract.projectId,
      contractId: body.contractId,
      vendorId: contract.vendorId,
      paymentAmount: body.amount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      status: 'PAID',
      remark: body.remark?.trim() || null,
    }
    const payment = await db.subcontractPayment.create({
      data: createData,
      select: {
        id: true,
        contractId: true,
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
        remark: true,
        createdAt: true,
      },
    })

    // 更新合同汇总字段
    const newPaidAmount =
      Number(contract.paidAmount) + Number(body.amount)
    const newUnpaidAmount =
      Number(contract.payableAmount) - newPaidAmount

    await db.subcontractContract.update({
      where: { id: body.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success({
      id: payment.id,
      contractCode: payment.contract.code,
      projectName: payment.contract.project.name,
      subcontractVendorName: payment.contract.vendor.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      remark: payment.remark,
      createdAt: payment.createdAt,
    })
  },
}, {
  resource: 'subcontract-payments',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

