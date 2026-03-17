import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/projects
   * 获取项目列表
   * 支持参数：keyword（按名称搜索）、status（按状态过滤）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword')
    const status = searchParams.get('status')

    const where: any = {}

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ]
    }

    if (status) {
      where.status = status
    }

    const projects = await db.project.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        customerId: true,
        customer: {
          select: { name: true },
        },
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 转换返回格式
    type ProjectItem = (typeof projects)[number]
    const result = projects.map((project: ProjectItem) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      customerId: project.customerId,
      customerName: project.customer.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
    }))

    return success(result)
  },

  /**
   * POST /api/projects
   * 创建项目
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestError('项目名称为必填项且不能为空')
    }

    if (!body.customerId || typeof body.customerId !== 'string') {
      throw new BadRequestError('客户 ID 为必填项')
    }

    // 验证客户是否存在
    const customer = await db.customer.findUnique({
      where: { id: body.customerId },
    })

    if (!customer) {
      throw new NotFoundError('客户不存在')
    }

    // 生成项目编码
    const code = `PRJ${Date.now()}`

    // 创建项目
    const project = await db.project.create({
      data: {
        code,
        name: body.name.trim(),
        customerId: body.customerId,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        budget: body.budget || 0,
        status: 'PLANNING',
        remark: body.remark?.trim() || null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        customerId: true,
        customer: {
          select: { name: true },
        },
        status: true,
        startDate: true,
        endDate: true,
        budget: true,
        remark: true,
        createdAt: true,
      },
    })

    // 创建项目状态变更记录
    await db.projectStatusChange.create({
      data: {
        projectId: project.id,
        fromStatus: 'PLANNING',
        toStatus: 'PLANNING',
        changeReason: '项目创建',
      },
    })

    return success({
      id: project.id,
      code: project.code,
      name: project.name,
      customerId: project.customerId,
      customerName: project.customer.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      remark: project.remark,
      createdAt: project.createdAt,
    })
  },
}, {
  resource: 'projects',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

