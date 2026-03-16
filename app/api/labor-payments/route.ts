import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

type LaborPaymentSelect = Awaited<ReturnType<typeof db.laborPayment.findMany>>[number]

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/labor-payments
   * 获取劳务付款列表
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

    const payments = await db.laborPayment.findMany({
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
            worker: {
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
    const result = payments.map((payment: LaborPaymentSelect) => ({
      id: payment.id,
      contractCode: payment.contract.code,
      projectName: payment.contract.project.name,
      laborWorkerName: payment.contract.worker.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      remark: payment.remark,
      createdAt: payment.createdAt,
    }))

    return success(result)
  },

  /**
   * POST /api/labor-payments
   * 创建劳务付款
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
    const contract = await db.laborContract.findUnique({
      where: { id: body.contractId },
      select: {
        id: true,
        projectId: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('劳务合同不存在')
    }

    // 创建付款记录
    const payment = await db.laborPayment.create({
      data: {
        projectId: contract.projectId,
        contractId: body.contractId,
        workerId: '', // 从合同获取，但这里需要先查询
        paymentAmount: body.amount,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        status: 'PAID',
        remark: body.remark?.trim() || null,
      },
      select: {
        id: true,
        contractId: true,
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
        remark: true,
        createdAt: true,
      },
    })

    // 更新合同汇总字段
    const newPaidAmount = contract.paidAmount + body.amount
    const newUnpaidAmount = contract.payableAmount - newPaidAmount

    await db.laborContract.update({
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
      laborWorkerName: payment.contract.worker.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      remark: payment.remark,
      createdAt: payment.createdAt,
    })
  },
}, {
  resource: 'labor-payments',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

