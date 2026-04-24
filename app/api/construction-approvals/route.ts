import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  assertProjectContractInCurrentRegion,
  assertProjectInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'

export const dynamic = 'force-dynamic'


const handlers = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/construction-approvals
   * 获取施工立项列表
   * 支持参数：projectId（可选）、contractId（可选）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const contractId = searchParams.get('contractId')

    const regionId = await requireCurrentRegionId()
    const where: any = {}
    where.regionId = regionId

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
        Project: {
          select: { name: true },
        },
        ProjectContract: {
          select: { code: true },
        },
        budget: true,
        startDate: true,
        approvalStatus: true,
        approvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换返回格式
    type ApprovalItem = (typeof approvals)[number]
    const result = approvals.map((approval: ApprovalItem) => ({
      id: approval.id,
      code: approval.code,
      projectId: approval.projectId,
      contractId: approval.contractId,
      projectName: approval.Project.name,
      contractCode: approval.ProjectContract.code,
      name: approval.name,
      budgetAmount: approval.budget,
      startDate: approval.startDate,
      approvalStatus: approval.approvalStatus,
      approvedAt: approval.approvedAt,
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
    const project = await assertProjectInCurrentRegion(body.projectId)

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    // 验证合同是否存在
    const contract = await assertProjectContractInCurrentRegion(body.contractId)

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
    const regionId = await requireCurrentRegionId()
    const createData: Prisma.ConstructionApprovalUncheckedCreateInput = {
      id: crypto.randomUUID(),
      code,
      name: body.name.trim(),
      projectId: body.projectId,
      contractId: body.contractId,
      budget: body.budgetAmount || 0,
      startDate: body.startDate ? new Date(body.startDate) : null,
      status: 'active',
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const approval = await db.constructionApproval.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        contractId: true,
        Project: {
          select: { name: true },
        },
        ProjectContract: {
          select: { code: true },
        },
        budget: true,
        startDate: true,
        approvalStatus: true,
        approvedAt: true,
        remark: true,
        createdAt: true,
      },
    })

    return success({
      id: approval.id,
      code: approval.code,
      projectName: approval.Project.name,
      contractCode: approval.ProjectContract.code,
      name: approval.name,
      budgetAmount: approval.budget,
      startDate: approval.startDate,
      approvalStatus: approval.approvalStatus,
      approvedAt: approval.approvedAt,
      remark: approval.remark,
      createdAt: approval.createdAt,
    })
  },
}, {
  resource: 'construction-approvals',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

export const GET = handlers.GET!
export const POST = handlers.POST!
