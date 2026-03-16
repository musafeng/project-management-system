import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

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

    const where: any = {}

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
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换返回格式
    const result = contracts.map((contract) => ({
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
      createdAt: contract.createdAt,
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
    const contract = await db.projectContract.create({
      data: {
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
        status: 'DRAFT',
        remark: body.remark?.trim() || null,
      },
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

