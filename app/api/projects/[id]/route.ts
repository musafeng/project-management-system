import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/projects/{id}
   * 获取项目详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少项目 ID')
    }

    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        customerId: true,
        customer: {
          select: { id: true, name: true },
        },
        status: true,
        startDate: true,
        endDate: true,
        budget: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    return success({
      id: project.id,
      code: project.code,
      name: project.name,
      customerId: project.customerId,
      customer: project.customer,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      remark: project.remark,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
  },

  /**
   * PUT /api/projects/{id}
   * 更新项目信息
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少项目 ID')
    }

    const body = await req.json()

    // 检查项目是否存在
    const existingProject = await db.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      throw new NotFoundError('项目不存在')
    }

    // 如果更新客户，验证客户是否存在
    if (body.customerId && body.customerId !== existingProject.customerId) {
      const customer = await db.customer.findUnique({
        where: { id: body.customerId },
      })

      if (!customer) {
        throw new NotFoundError('客户不存在')
      }
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        throw new BadRequestError('项目名称不能为空')
      }
      updateData.name = body.name.trim()
    }

    if (body.customerId !== undefined) {
      updateData.customerId = body.customerId
    }

    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null
    }

    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }

    if (body.budget !== undefined) {
      updateData.budget = body.budget
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    // 更新项目
    const project = await db.project.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        customerId: true,
        customer: {
          select: { id: true, name: true },
        },
        status: true,
        startDate: true,
        endDate: true,
        budget: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success({
      id: project.id,
      code: project.code,
      name: project.name,
      customerId: project.customerId,
      customer: project.customer,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      remark: project.remark,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
  },

  /**
   * DELETE /api/projects/{id}
   * 删除项目
   * 删除规则：如果项目存在关联合同，禁止删除
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少项目 ID')
    }

    // 检查项目是否存在
    const project = await db.project.findUnique({
      where: { id },
    })

    if (!project) {
      throw new NotFoundError('项目不存在')
    }

    // 检查是否存在关联合同
    const contractCount = await db.projectContract.count({
      where: { projectId: id },
    })

    if (contractCount > 0) {
      throw new ConflictError('该项目已有关联合同，无法删除')
    }

    const procurementCount = await db.procurementContract.count({
      where: { projectId: id },
    })

    if (procurementCount > 0) {
      throw new ConflictError('该项目已有关联合同，无法删除')
    }

    const laborCount = await db.laborContract.count({
      where: { projectId: id },
    })

    if (laborCount > 0) {
      throw new ConflictError('该项目已有关联合同，无法删除')
    }

    const subcontractCount = await db.subcontractContract.count({
      where: { projectId: id },
    })

    if (subcontractCount > 0) {
      throw new ConflictError('该项目已有关联合同，无法删除')
    }

    // 删除项目状态变更记录
    await db.projectStatusChange.deleteMany({
      where: { projectId: id },
    })

    // 删除项目
    await db.project.delete({
      where: { id },
    })

    return success({ message: '项目已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler

