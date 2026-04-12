import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { assertProjectInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/project-contracts
   * 获取合同列表
   * 支持参数：projectId（按项目过滤）、keyword（按合同名称搜索）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')

    const regionId = await requireCurrentRegionId()
    const where: any = {}
    where.regionId = regionId

    if (projectId) {
      where.projectId = projectId
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ]
    }

    const contracts = await db.projectContract.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        Project: {
          select: { name: true, Customer: { select: { name: true } } },
        },
        contractAmount: true,
        changedAmount: true,
        receivableAmount: true,
        receivedAmount: true,
        unreceivedAmount: true,
        signDate: true,
        startDate: true,
        endDate: true,
        status: true,
        contractType: true,
        paymentMethod: true,
        hasRetention: true,
        retentionRate: true,
        retentionAmount: true,
        attachmentUrl: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换返回格式
    type ContractItem = (typeof contracts)[number]
    const result = contracts.map((contract: ContractItem) => ({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      projectName: contract.Project.name,
      customerName: contract.Project.Customer.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      receivableAmount: contract.receivableAmount,
      receivedAmount: contract.receivedAmount,
      unreceivedAmount: contract.unreceivedAmount,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      contractType: contract.contractType,
      paymentMethod: contract.paymentMethod,
      hasRetention: contract.hasRetention,
      retentionRate: contract.retentionRate,
      retentionAmount: contract.retentionAmount,
      attachmentUrl: contract.attachmentUrl,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    }))

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

    // 验证项目是否存在
    const project = await assertProjectInCurrentRegion(body.projectId)

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    // 生成合同编码
    const code = `CONTRACT${Date.now()}`

    // 创建合同
    const regionId = await requireCurrentRegionId()
    const createData: Prisma.ProjectContractUncheckedCreateInput = {
      id: crypto.randomUUID(),
      code,
      name: body.name || `${code}`,
      projectId: body.projectId,
      customerId: project.customerId,
      contractAmount: body.contractAmount,
      changedAmount: 0,
      receivableAmount: body.contractAmount,
      receivedAmount: 0,
      unreceivedAmount: body.contractAmount,
      signDate: body.signDate ? new Date(body.signDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      status: 'DRAFT',
      contractType: body.contractType?.trim() || null,
      paymentMethod: body.paymentMethod?.trim() || null,
      hasRetention: body.hasRetention ?? false,
      retentionRate: body.retentionRate ?? null,
      retentionAmount: body.retentionAmount ?? null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const contract = await db.projectContract.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        Project: {
          select: { name: true, Customer: { select: { name: true } } },
        },
        contractAmount: true,
        changedAmount: true,
        receivableAmount: true,
        receivedAmount: true,
        unreceivedAmount: true,
        signDate: true,
        startDate: true,
        endDate: true,
        status: true,
        contractType: true,
        paymentMethod: true,
        hasRetention: true,
        retentionRate: true,
        retentionAmount: true,
        attachmentUrl: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      projectName: contract.Project.name,
      customerName: contract.Project.Customer.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      receivableAmount: contract.receivableAmount,
      receivedAmount: contract.receivedAmount,
      unreceivedAmount: contract.unreceivedAmount,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      contractType: contract.contractType,
      paymentMethod: contract.paymentMethod,
      hasRetention: contract.hasRetention,
      retentionRate: contract.retentionRate,
      retentionAmount: contract.retentionAmount,
      attachmentUrl: contract.attachmentUrl,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
  },
}, {
  resource: 'project-contracts',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
