import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentRegionId } from '@/lib/region'
import { parsePaginationParams } from '@/lib/list-pagination'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/procurement-contracts
   * 获取采购合同列表
   * 支持参数：projectId、constructionId、keyword、approvalStatus、startDate、endDate
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const constructionId = searchParams.get('constructionId')
    const keyword = searchParams.get('keyword')
    const approvalStatus = searchParams.get('approvalStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const pagination = parsePaginationParams(searchParams)

    const regionId = await getCurrentRegionId()
    const where: any = {}

    if (regionId) where.regionId = regionId

    if (projectId) {
      where.projectId = projectId
    }

    if (constructionId) {
      where.constructionId = constructionId
    }

    if (approvalStatus && approvalStatus !== 'ALL') {
      where.approvalStatus = approvalStatus
    }

    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
        { project: { name: { contains: keyword } } },
        { construction: { name: { contains: keyword } } },
        { supplier: { name: { contains: keyword } } },
      ]
    }

    if (startDate || endDate) {
      where.signDate = {}
      if (startDate) where.signDate.gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) where.signDate.lte = new Date(`${endDate}T23:59:59.999Z`)
    }

    const [total, summary, contracts] = await Promise.all([
      pagination.paginated ? db.procurementContract.count({ where }) : Promise.resolve(0),
      pagination.paginated
        ? db.procurementContract.aggregate({
            where,
            _sum: {
              contractAmount: true,
              changedAmount: true,
              payableAmount: true,
              paidAmount: true,
              unpaidAmount: true,
            },
          })
        : Promise.resolve(null),
      db.procurementContract.findMany({
        where,
        select: {
          id: true,
          code: true,
          projectId: true,
          constructionId: true,
          project: {
            select: { name: true },
          },
          construction: {
            select: { name: true },
          },
          supplier: {
            select: { name: true },
          },
          name: true,
          contractAmount: true,
          changedAmount: true,
          payableAmount: true,
          paidAmount: true,
          unpaidAmount: true,
          signDate: true,
          status: true,
          approvalStatus: true,
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
      projectName: contract.project.name,
      constructionName: contract.construction.name,
      supplierName: contract.supplier.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      signDate: contract.signDate,
      status: contract.status,
      approvalStatus: contract.approvalStatus,
      attachmentUrl: contract.attachmentUrl,
      createdAt: contract.createdAt,
    }))

    if (pagination.paginated) {
      const payableAmountTotal = Number(summary?._sum.payableAmount || 0)
      const paidAmountTotal = Number(summary?._sum.paidAmount || 0)
      return success({
        items: result,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        summary: {
          contractAmountTotal: Number(summary?._sum.contractAmount || 0),
          changedAmountTotal: Number(summary?._sum.changedAmount || 0),
          payableAmountTotal,
          paidAmountTotal,
          unpaidAmountTotal: Number(summary?._sum.unpaidAmount || 0),
          paymentProgress: payableAmountTotal > 0 ? (paidAmountTotal / payableAmountTotal) * 100 : 0,
          resultCount: total,
        },
      })
    }

    return success(result)
  },

  /**
   * POST /api/procurement-contracts
   * 创建采购合同
   * body: { projectId, constructionId, supplierId, contractAmount, signDate?, remark? }
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.projectId || typeof body.projectId !== 'string') {
      throw new BadRequestError('项目 ID 为必填项')
    }

    if (!body.constructionId || typeof body.constructionId !== 'string') {
      throw new BadRequestError('施工立项 ID 为必填项')
    }

    if (!body.supplierId || typeof body.supplierId !== 'string') {
      throw new BadRequestError('供应商 ID 为必填项')
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
      throw new BadRequestError('开始日期格式不正确')
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new BadRequestError('结束日期格式不正确')
    }
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestError('结束日期不能早于开始日期')
    }

    // 验证项目是否存在
    const project = await db.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    })

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    // 验证施工立项是否存在
    const construction = await db.constructionApproval.findUnique({
      where: { id: body.constructionId },
      select: { id: true, projectId: true },
    })

    if (!construction) {
      throw new NotFoundError('施工立项不存在')
    }

    // 验证施工立项属于该项目
    if (construction.projectId !== body.projectId) {
      throw new BadRequestError('施工立项不属于该项目')
    }

    // 验证供应商是否存在
    const supplier = await db.supplier.findUnique({
      where: { id: body.supplierId },
      select: { id: true },
    })

    if (!supplier) {
      throw new NotFoundError('供应商不存在')
    }

    // 生成合同编码
    const code = `PROC${Date.now()}`

    // 创建采购合同
    const regionId = await getCurrentRegionId()
    const createData: Prisma.ProcurementContractUncheckedCreateInput = {
      code,
      name: body.name?.trim() || code,
      projectId: body.projectId,
      constructionId: body.constructionId,
      supplierId: body.supplierId,
      contractAmount: body.contractAmount,
      changedAmount: 0,
      payableAmount: body.contractAmount,
      paidAmount: 0,
      unpaidAmount: body.contractAmount,
      signDate,
      startDate,
      endDate,
      status: body.status || 'DRAFT',
      materialCategory: body.materialCategory?.trim() || null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      regionId: regionId ?? undefined,
    }
    const contract = await db.procurementContract.create({
      data: createData,
      select: {
        id: true,
        code: true,
        projectId: true,
        constructionId: true,
        project: {
          select: { name: true },
        },
        construction: {
          select: { name: true },
        },
        supplier: {
          select: { name: true, phone: true, bankAccount: true, bankName: true },
        },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        materialCategory: true,
        attachmentUrl: true,
        remark: true,
        approvalStatus: true,
        createdAt: true,
      },
    })

    return success({
      id: contract.id,
      code: contract.code,
      projectName: contract.project.name,
      constructionName: contract.construction.name,
      supplierName: contract.supplier.name,
      supplierPhone: contract.supplier.phone,
      supplierBankAccount: contract.supplier.bankAccount,
      supplierBankName: contract.supplier.bankName,
      contractAmount: contract.contractAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      signDate: contract.signDate,
      materialCategory: contract.materialCategory,
      attachmentUrl: contract.attachmentUrl,
      remark: contract.remark,
      approvalStatus: contract.approvalStatus,
      createdAt: contract.createdAt,
    })
  },
}, {
  resource: 'procurement-contracts',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
