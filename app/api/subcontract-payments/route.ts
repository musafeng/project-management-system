import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentRegionId } from '@/lib/region'
import { parsePaginationParams } from '@/lib/list-pagination'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/subcontract-payments
   * 获取分包付款列表
   * 支持参数：contractId、projectId、keyword、approvalStatus、startDate、endDate
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const approvalStatus = searchParams.get('approvalStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const pagination = parsePaginationParams(searchParams)

    const regionId = await getCurrentRegionId()
    const where: any = {}

    if (regionId) where.regionId = regionId

    if (contractId) {
      where.contractId = contractId
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (approvalStatus && approvalStatus !== 'ALL') {
      where.approvalStatus = approvalStatus
    }

    if (keyword) {
      where.OR = [
        { paymentNumber: { contains: keyword } },
        { contract: { code: { contains: keyword } } },
        { contract: { name: { contains: keyword } } },
        { contract: { project: { name: { contains: keyword } } } },
        { contract: { vendor: { name: { contains: keyword } } } },
      ]
    }

    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) where.paymentDate.gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) where.paymentDate.lte = new Date(`${endDate}T23:59:59.999Z`)
    }

    const [total, paymentSummary, relatedContractIds, payments] = await Promise.all([
      pagination.paginated ? db.subcontractPayment.count({ where }) : Promise.resolve(0),
      pagination.paginated
        ? db.subcontractPayment.aggregate({
            where,
            _sum: { paymentAmount: true },
          })
        : Promise.resolve(null),
      pagination.paginated
        ? db.subcontractPayment.findMany({
            where,
            distinct: ['contractId'],
            select: { contractId: true },
          })
        : Promise.resolve([]),
      db.subcontractPayment.findMany({
        where,
        select: {
          id: true,
          contractId: true,
          contract: {
            select: {
              code: true,
              name: true,
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
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        ...(pagination.paginated ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
    ])

    const relatedContractSummary =
      pagination.paginated && relatedContractIds.length > 0
        ? await db.subcontractContract.aggregate({
            where: { id: { in: relatedContractIds.map((item) => item.contractId) } },
            _sum: {
              payableAmount: true,
              paidAmount: true,
              unpaidAmount: true,
            },
          })
        : null

    // 转换返回格式
    type PaymentItem = (typeof payments)[number]
    const result = payments.map((payment: PaymentItem) => ({
      id: payment.id,
      contractId: payment.contractId,
      contractCode: payment.contract.code,
      contractName: payment.contract.name,
      projectName: payment.contract.project.name,
      subcontractVendorName: payment.contract.vendor.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentNumber: payment.paymentNumber,
      status: payment.status,
      approvalStatus: payment.approvalStatus,
      remark: payment.remark,
      createdAt: payment.createdAt,
    }))

    if (pagination.paginated) {
      const payableAmountTotal = Number(relatedContractSummary?._sum.payableAmount || 0)
      const paidAmountTotal = Number(relatedContractSummary?._sum.paidAmount || 0)
      return success({
        items: result,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        summary: {
          paymentAmountTotal: Number(paymentSummary?._sum.paymentAmount || 0),
          relatedPayableAmountTotal: payableAmountTotal,
          relatedPaidAmountTotal: paidAmountTotal,
          relatedUnpaidAmountTotal: Number(relatedContractSummary?._sum.unpaidAmount || 0),
          paymentProgress: payableAmountTotal > 0 ? (paidAmountTotal / payableAmountTotal) * 100 : 0,
          relatedContractCount: relatedContractIds.length,
          resultCount: total,
        },
      })
    }

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

    if (!body.paymentDate || typeof body.paymentDate !== 'string') {
      throw new BadRequestError('付款日期为必填项')
    }

    const paymentDate = new Date(body.paymentDate)
    if (Number.isNaN(paymentDate.getTime())) {
      throw new BadRequestError('付款日期格式不正确')
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
    const regionId = await getCurrentRegionId()
    const createData: Prisma.SubcontractPaymentUncheckedCreateInput = {
      projectId: contract.projectId,
      contractId: body.contractId,
      vendorId: contract.vendorId,
      paymentAmount: body.amount,
      paymentDate,
      paymentMethod: body.paymentMethod?.trim() || null,
      paymentNumber: body.paymentNumber?.trim() || null,
      status: 'PAID',
      remark: body.remark?.trim() || null,
      regionId: regionId ?? undefined,
    }
    const payment = await db.subcontractPayment.create({
      data: createData,
      select: {
        id: true,
        contractId: true,
        contract: {
          select: {
            code: true,
            name: true,
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
        approvalStatus: true,
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
      contractId: payment.contractId,
      contractCode: payment.contract.code,
      contractName: payment.contract.name,
      projectName: payment.contract.project.name,
      subcontractVendorName: payment.contract.vendor.name,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentNumber: payment.paymentNumber,
      approvalStatus: payment.approvalStatus,
      remark: payment.remark,
      createdAt: payment.createdAt,
    })
  },
}, {
  resource: 'subcontract-payments',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
