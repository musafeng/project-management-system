import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { assertMasterRecordInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


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

    const regionId = await requireCurrentRegionId()
    const where: any = {}
    where.regionId = regionId

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
        Customer: {
          select: { name: true },
        },
        status: true,
        startDate: true,
        endDate: true,
        location: true,
        projectType: true,
        bidMethod: true,
        area: true,
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
      customerName: project.Customer.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      location: project.location,
      projectType: project.projectType,
      bidMethod: project.bidMethod,
      area: project.area,
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
    const customer = await assertMasterRecordInCurrentRegion('customer', body.customerId)

    if (!customer) {
      throw new NotFoundError('客户不存在')
    }

    // 生成项目编码
    const code = `PRJ${Date.now()}`

    // 创建项目
    const regionId = await requireCurrentRegionId()
    const createData: Prisma.ProjectUncheckedCreateInput = {
      id: crypto.randomUUID(),
      code,
      name: body.name.trim(),
      customerId: body.customerId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      budget: body.budget || 0,
      status: 'PLANNING',
      location: body.location?.trim() || null,
      projectType: body.projectType?.trim() || null,
      bidMethod: body.bidMethod?.trim() || null,
      area: body.area ?? null,
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const project = await db.project.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        customerId: true,
        Customer: {
          select: { name: true },
        },
        status: true,
        startDate: true,
        endDate: true,
        budget: true,
        location: true,
        projectType: true,
        bidMethod: true,
        area: true,
        remark: true,
        createdAt: true,
      },
    })

    // 创建项目状态变更记录
    const statusChangeData: Prisma.ProjectStatusChangeUncheckedCreateInput = {
      id: crypto.randomUUID(),
      projectId: project.id,
      fromStatus: 'PLANNING',
      toStatus: 'PLANNING',
      changeReason: '项目创建',
      updatedAt: new Date(),
    }
    await db.projectStatusChange.create({
      data: statusChangeData,
    })

    return success({
      id: project.id,
      code: project.code,
      name: project.name,
      customerId: project.customerId,
      customerName: project.Customer.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      location: project.location,
      projectType: project.projectType,
      bidMethod: project.bidMethod,
      area: project.area,
      remark: project.remark,
      createdAt: project.createdAt,
    })
  },
}, {
  resource: 'projects',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
