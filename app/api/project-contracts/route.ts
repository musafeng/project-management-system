import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentRegionId } from '@/lib/region'
import { parsePaginationParams } from '@/lib/list-pagination'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/project-contracts
   * 获取合同列表
   * 支持参数：projectId、keyword、status、startDate、endDate
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const pagination = parsePaginationParams(searchParams)

    const regionId = await getCurrentRegionId()
    const where: any = {}

    if (regionId) where.regionId = regionId

    if (projectId) {
      where.projectId = projectId
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { project: { name: { contains: keyword } } },
        { customer: { name: { contains: keyword } } },
      ]
    }

    if (startDate || endDate) {
      where.signDate = {}
      if (startDate) where.signDate.gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) where.signDate.lte = new Date(`${endDate}T23:59:59.999Z`)
    }

    const [total, summary, contracts] = await Promise.all([
      pagination.paginated ? db.projectContract.count({ where }) : Promise.resolve(0),
      pagination.paginated
        ? db.projectContract.aggregate({
            where,
            _sum: {
              contractAmount: true,
              changedAmount: true,
              receivableAmount: true,
              receivedAmount: true,
              unreceivedAmount: true,
            },
          })
        : Promise.resolve(null),
      db.projectContract.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          projectId: true,
          project: {
            select: { name: true, customer: { select: { name: true } } },
          },
          contractAmount: true,
          changedAmount: true,
          receivableAmount: true,
          receivedAmount: true,
          unreceivedAmount: true,
          signDate: true,
          startDate: true,
          status: true,
          contractType: true,
          paymentMethod: true,
          hasRetention: true,
          retentionRate: true,
          retentionAmount: true,
          attachmentUrl: true,
          createdAt: true,
        },
        orderBy: [{ signDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        ...(pagination.paginated ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
    ])

    // 转换返回格式
    type ContractItem = (typeof contracts)[number]
    const result = contracts.map((contract: ContractItem) => ({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      projectName: contract.project.name,
      customerName: contract.project.customer.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      receivableAmount: contract.receivableAmount,
      receivedAmount: contract.receivedAmount,
      unreceivedAmount: contract.unreceivedAmount,
      signDate: contract.signDate,
      startDate: contract.startDate,
      status: contract.status,
      contractType: contract.contractType,
      paymentMethod: contract.paymentMethod,
      hasRetention: contract.hasRetention,
      retentionRate: contract.retentionRate,
      retentionAmount: contract.retentionAmount,
      attachmentUrl: contract.attachmentUrl,
      createdAt: contract.createdAt,
    }))

    if (pagination.paginated) {
      const receivableAmountTotal = Number(summary?._sum.receivableAmount || 0)
      const receivedAmountTotal = Number(summary?._sum.receivedAmount || 0)
      return success({
        items: result,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        summary: {
          contractAmountTotal: Number(summary?._sum.contractAmount || 0),
          changedAmountTotal: Number(summary?._sum.changedAmount || 0),
          receivableAmountTotal,
          receivedAmountTotal,
          unreceivedAmountTotal: Number(summary?._sum.unreceivedAmount || 0),
          receiptProgress: receivableAmountTotal > 0 ? (receivedAmountTotal / receivableAmountTotal) * 100 : 0,
          resultCount: total,
        },
      })
    }

    return success(result)
  },

  /**
   * POST /api/project-contracts
   * 创建合同
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.projectId || typeof body.projectId !== 'string') {
      throw new BadRequestError('项目 ID 为必填项')
    }

    if (body.contractAmount === undefined || typeof body.contractAmount !== 'number') {
      throw new BadRequestError('合同金额为必填项且必须是数字')
    }

    if (body.contractAmount <= 0) {
      throw new BadRequestError('合同金额必须大于 0')
    }

    if (!body.signDate || typeof body.signDate !== 'string') {
      throw new BadRequestError('签订日期为必填项')
    }

    const signDate = new Date(body.signDate)
    if (Number.isNaN(signDate.getTime())) {
      throw new BadRequestError('签订日期格式不正确')
    }

    const startDate = body.startDate ? new Date(body.startDate) : null
    const endDate = body.endDate ? new Date(body.endDate) : null
    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new BadRequestError('履约开始日期格式不正确')
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new BadRequestError('履约结束日期格式不正确')
    }
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestError('履约结束日期不能早于履约开始日期')
    }

    // 验证项目是否存在
    const project = await db.project.findUnique({
      where: { id: body.projectId },
      select: { id: true, customerId: true },
    })

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    // 生成合同编码
    const code = `CONTRACT${Date.now()}`

    // 创建合同
    const regionId = await getCurrentRegionId()
    const createData: Prisma.ProjectContractUncheckedCreateInput = {
      code,
      name: body.name || `${code}`,
      projectId: body.projectId,
      customerId: project.customerId,
      contractAmount: body.contractAmount,
      changedAmount: 0,
      receivableAmount: body.contractAmount,
      receivedAmount: 0,
      unreceivedAmount: body.contractAmount,
      signDate,
      startDate,
      endDate,
      status: body.status || 'DRAFT',
      contractType: body.contractType?.trim() || null,
      paymentMethod: body.paymentMethod?.trim() || null,
      hasRetention: body.hasRetention ?? false,
      retentionRate: body.retentionRate ?? null,
      retentionAmount: body.retentionAmount ?? null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      regionId: regionId ?? undefined,
    }
    const contract = await db.projectContract.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        project: {
          select: { name: true, customer: { select: { name: true } } },
        },
        contractAmount: true,
        changedAmount: true,
        receivableAmount: true,
        receivedAmount: true,
        unreceivedAmount: true,
        signDate: true,
        status: true,
        remark: true,
        createdAt: true,
      },
    })

    return success({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      projectName: contract.project.name,
      customerName: contract.project.customer.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      receivableAmount: contract.receivableAmount,
      receivedAmount: contract.receivedAmount,
      unreceivedAmount: contract.unreceivedAmount,
      signDate: contract.signDate,
      status: contract.status,
      remark: contract.remark,
      createdAt: contract.createdAt,
    })
  },
}, {
  resource: 'project-contracts',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
