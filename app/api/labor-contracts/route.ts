import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentRegionId } from '@/lib/region'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/labor-contracts
   * 获取劳务合同列表
   * 支持参数：projectId（可选）、constructionId（可选）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const constructionId = searchParams.get('constructionId')

    const regionId = await getCurrentRegionId()
    const where: any = {}

    if (regionId) where.regionId = regionId

    if (projectId) {
      where.projectId = projectId
    }

    if (constructionId) {
      where.constructionId = constructionId
    }

    const contracts = await db.laborContract.findMany({
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
        worker: {
          select: { name: true },
        },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换返回格式
    type ContractItem = (typeof contracts)[number]
    const result = contracts.map((contract: ContractItem) => ({
      id: contract.id,
      code: contract.code,
      projectName: contract.project.name,
      constructionName: contract.construction.name,
      laborWorkerName: contract.worker.name,
      contractAmount: contract.contractAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      signDate: contract.signDate,
      approvalStatus: contract.approvalStatus,
      createdAt: contract.createdAt,
    }))

    return success(result)
  },

  /**
   * POST /api/labor-contracts
   * 创建劳务合同
   * body: { projectId, constructionId, laborWorkerId, contractAmount, signDate?, remark? }
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

    if (!body.laborWorkerId || typeof body.laborWorkerId !== 'string') {
      throw new BadRequestError('劳务人员 ID 为必填项')
    }

    if (body.contractAmount === undefined || typeof body.contractAmount !== 'number') {
      throw new BadRequestError('合同金额为必填项且必须是数字')
    }

    if (body.contractAmount <= 0) {
      throw new BadRequestError('合同金额必须大于 0')
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

    // 验证劳务人员是否存在
    const worker = await db.laborWorker.findUnique({
      where: { id: body.laborWorkerId },
      select: { id: true },
    })

    if (!worker) {
      throw new NotFoundError('劳务人员不存在')
    }

    // 生成合同编码
    const code = `LABOR${Date.now()}`

    // 创建劳务合同
    const regionId = await getCurrentRegionId()
    const createData: Prisma.LaborContractUncheckedCreateInput = {
        code,
        name: body.name?.trim() || code,
        projectId: body.projectId,
        constructionId: body.constructionId,
        workerId: body.laborWorkerId,
        contractAmount: body.contractAmount,
        changedAmount: 0,
        payableAmount: body.contractAmount,
        paidAmount: 0,
        unpaidAmount: body.contractAmount,
        signDate: body.signDate ? new Date(body.signDate) : null,
        status: 'DRAFT',
        laborType: body.laborType?.trim() || null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        regionId: regionId ?? undefined,
    }
    const contract = await db.laborContract.create({
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
        worker: {
          select: { name: true },
        },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
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
      laborWorkerName: contract.worker.name,
      contractAmount: contract.contractAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      signDate: contract.signDate,
      remark: contract.remark,
      approvalStatus: contract.approvalStatus,
      createdAt: contract.createdAt,
    })
  },
}, {
  resource: 'labor-contracts',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

