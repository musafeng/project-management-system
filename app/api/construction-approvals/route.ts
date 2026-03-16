import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/construction-approvals
   * 获取施工立项列表
   * 支持参数：projectId（可选）、contractId（可选）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const contractId = searchParams.get('contractId')

    const where: any = {}

    if (projectId) {
      where.projectId = projectId
    }

    if (contractId) {
      where.contractId = contractId
    }

    const approvals = await db.constructionApproval.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        contractId: true,
        project: {
          select: { name: true },
        },
        contract: {
          select: { code: true },
        },
        budget: true,
        startDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换返回格式
    const result = approvals.map((approval) => ({
      id: approval.id,
      code: approval.code,
      projectName: approval.project.name,
      contractCode: approval.contract.code,
      name: approval.name,
      budgetAmount: approval.budget,
      startDate: approval.startDate,
      createdAt: approval.createdAt,
    }))

    return success(result)
  },

  /**
   * POST /api/construction-approvals
   * 创建施工立项
   * body: { projectId, contractId, name, budgetAmount?, startDate?, remark? }
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.projectId || typeof body.projectId !== 'string') {
      throw new BadRequestError('项目 ID 为必填项')
    }

    if (!body.contractId || typeof body.contractId !== 'string') {
      throw new BadRequestError('合同 ID 为必填项')
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestError('立项名称为必填项')
    }

    // 验证项目是否存在
    const project = await db.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    })

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    // 验证合同是否存在
    const contract = await db.projectContract.findUnique({
      where: { id: body.contractId },
      select: { id: true, projectId: true },
    })

    if (!contract) {
      throw new NotFoundError('合同不存在')
    }

    // 验证合同属于该项目
    if (contract.projectId !== body.projectId) {
      throw new BadRequestError('合同不属于该项目')
    }

    // 生成立项编码
    const code = `CONST${Date.now()}`

    // 创建施工立项
    const approval = await db.constructionApproval.create({
      data: {
        code,
        name: body.name.trim(),
        projectId: body.projectId,
        contractId: body.contractId,
        budget: body.budgetAmount || 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        status: 'active',
        remark: body.remark?.trim() || null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        contractId: true,
        project: {
          select: { name: true },
        },
        contract: {
          select: { code: true },
        },
        budget: true,
        startDate: true,
        remark: true,
        createdAt: true,
      },
    })

    return success({
      id: approval.id,
      code: approval.code,
      projectName: approval.project.name,
      contractCode: approval.contract.code,
      name: approval.name,
      budgetAmount: approval.budget,
      startDate: approval.startDate,
      remark: approval.remark,
      createdAt: approval.createdAt,
    })
  },
}, {
  resource: 'construction-approvals',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

