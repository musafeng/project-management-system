import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertEditable } from '@/lib/approval'
import { assertDirectRecordInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/construction-approvals/{id}
   * 获取立项详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少立项 ID')
    }

    const regionId = await requireCurrentRegionId()

    const approval = await db.constructionApproval.findFirst({
      where: { id, regionId },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        contractId: true,
        Project: {
          select: { id: true, name: true },
        },
        ProjectContract: {
          select: { id: true, code: true, name: true },
        },
        budget: true,
        status: true,
        startDate: true,
        endDate: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!approval) {
      throw new NotFoundError('施工立项不存在')
    }

    return success({
      id: approval.id,
      code: approval.code,
      name: approval.name,
      projectId: approval.projectId,
      projectName: approval.Project.name,
      contractId: approval.contractId,
      contractCode: approval.ProjectContract.code,
      contractName: approval.ProjectContract.name,
      budgetAmount: approval.budget,
      status: approval.status,
      startDate: approval.startDate,
      endDate: approval.endDate,
      remark: approval.remark,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
    })
  },

  /**
   * PUT /api/construction-approvals/{id}
   * 更新立项信息
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少立项 ID')
    }

    const body = await req.json()

    // 检查立项是否存在
    const existingApproval = await assertDirectRecordInCurrentRegion('constructionApproval', id)

    if (!existingApproval) {
      throw new NotFoundError('施工立项不存在')
    }

    // 审批状态锁定校验
    try {
      assertEditable(existingApproval.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        throw new BadRequestError('立项名称不能为空')
      }
      updateData.name = body.name.trim()
    }

    if (body.budgetAmount !== undefined) {
      if (typeof body.budgetAmount !== 'number' || body.budgetAmount < 0) {
        throw new BadRequestError('预算金额必须是非负数字')
      }
      updateData.budget = body.budgetAmount
    }

    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null
    }

    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    // 更新立项
    const approval = await db.constructionApproval.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        contractId: true,
        Project: {
          select: { id: true, name: true },
        },
        ProjectContract: {
          select: { id: true, code: true, name: true },
        },
        budget: true,
        status: true,
        startDate: true,
        endDate: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success({
      id: approval.id,
      code: approval.code,
      name: approval.name,
      projectId: approval.projectId,
      projectName: approval.Project.name,
      contractId: approval.contractId,
      contractCode: approval.ProjectContract.code,
      contractName: approval.ProjectContract.name,
      budgetAmount: approval.budget,
      status: approval.status,
      startDate: approval.startDate,
      endDate: approval.endDate,
      remark: approval.remark,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
    })
  },

  /**
   * DELETE /api/construction-approvals/{id}
   * 删除立项
   * 删除规则：如果存在采购合同、劳务合同、分包合同，禁止删除
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少立项 ID')
    }

    // 检查立项是否存在
    const approval = await assertDirectRecordInCurrentRegion('constructionApproval', id)

    if (!approval) {
      throw new NotFoundError('施工立项不存在')
    }

    // 审批状态锁定校验
    try {
      assertEditable(approval.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    // 检查是否存在采购合同
    const procurementCount = await db.procurementContract.count({
      where: { constructionId: id },
    })

    if (procurementCount > 0) {
      throw new ConflictError('该施工立项已产生合同，无法删除')
    }

    // 检查是否存在劳务合同
    const laborCount = await db.laborContract.count({
      where: { constructionId: id },
    })

    if (laborCount > 0) {
      throw new ConflictError('该施工立项已产生合同，无法删除')
    }

    // 检查是否存在分包合同
    const subcontractCount = await db.subcontractContract.count({
      where: { constructionId: id },
    })

    if (subcontractCount > 0) {
      throw new ConflictError('该施工立项已产生合同，无法删除')
    }

    // 删除立项
    await db.constructionApproval.delete({
      where: { id },
    })

    return success({ message: '施工立项已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler
