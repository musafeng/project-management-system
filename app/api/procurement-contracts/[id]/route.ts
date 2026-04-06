import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertEditable } from '@/lib/approval'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/procurement-contracts/{id}
   * 获取采购合同详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const contract = await db.procurementContract.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        supplierId: true,
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        contractAmount: true,
        changedAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        status: true,
        approvalStatus: true,
        signDate: true,
        startDate: true,
        endDate: true,
        materialCategory: true,
        attachmentUrl: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('采购合同不存在')
    }

    const recentPayments = await db.procurementPayment.findMany({
      where: { contractId: contract.id },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        paymentDate: true,
        paymentAmount: true,
        paymentMethod: true,
        paymentNumber: true,
        status: true,
        approvalStatus: true,
      },
    })

    return success({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      projectName: contract.project.name,
      constructionId: contract.constructionId,
      constructionName: contract.construction.name,
      supplierId: contract.supplierId,
      supplierName: contract.supplier.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      status: contract.status,
      approvalStatus: contract.approvalStatus,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      materialCategory: contract.materialCategory,
      attachmentUrl: contract.attachmentUrl,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      recentFlows: recentPayments.map((item) => ({
        id: item.id,
        date: item.paymentDate,
        amount: item.paymentAmount,
        method: item.paymentMethod,
        number: item.paymentNumber,
        status: item.status,
        approvalStatus: item.approvalStatus,
      })),
      changeRecords: Number(contract.changedAmount) === 0
        ? []
        : [{
            id: `${contract.id}-changed-summary`,
            changedAt: contract.updatedAt,
            beforeAmount: contract.contractAmount,
            changeAmount: contract.changedAmount,
            afterAmount: contract.payableAmount,
            changeType: Number(contract.changedAmount) > 0 ? 'INCREASE' : 'DECREASE',
            reason: contract.remark,
            approvalStatus: contract.approvalStatus,
          }],
    })
  },

  /**
   * PUT /api/procurement-contracts/{id}
   * 更新采购合同
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const body = await req.json()

    // 检查合同是否存在
    const existingContract = await db.procurementContract.findUnique({
      where: { id },
    })

    if (!existingContract) {
      throw new NotFoundError('采购合同不存在')
    }

    // 审批状态锁定校验
    try {
      assertEditable(existingContract.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        throw new BadRequestError('合同名称不能为空')
      }
      updateData.name = body.name.trim()
    }

    if (body.projectId !== undefined) {
      if (typeof body.projectId !== 'string' || body.projectId.trim() === '') {
        throw new BadRequestError('项目不能为空')
      }
      const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true } })
      if (!project) {
        throw new NotFoundError('项目不存在')
      }
      updateData.projectId = project.id
    }

    const nextProjectId = updateData.projectId ?? existingContract.projectId

    if (body.constructionId !== undefined) {
      if (typeof body.constructionId !== 'string' || body.constructionId.trim() === '') {
        throw new BadRequestError('施工立项不能为空')
      }
      const construction = await db.constructionApproval.findUnique({
        where: { id: body.constructionId },
        select: { id: true, projectId: true },
      })
      if (!construction) {
        throw new NotFoundError('施工立项不存在')
      }
      if (construction.projectId !== nextProjectId) {
        throw new BadRequestError('施工立项不属于该项目')
      }
      updateData.constructionId = construction.id
    }

    if (body.supplierId !== undefined) {
      if (typeof body.supplierId !== 'string' || body.supplierId.trim() === '') {
        throw new BadRequestError('供应商不能为空')
      }
      const supplier = await db.supplier.findUnique({ where: { id: body.supplierId }, select: { id: true } })
      if (!supplier) {
        throw new NotFoundError('供应商不存在')
      }
      updateData.supplierId = supplier.id
    }

    if (body.contractAmount !== undefined) {
      if (typeof body.contractAmount !== 'number' || body.contractAmount <= 0) {
        throw new BadRequestError('合同金额必须大于 0')
      }
      const payableAmount = Number(body.contractAmount) + Number(existingContract.changedAmount)
      updateData.contractAmount = body.contractAmount
      updateData.payableAmount = payableAmount
      updateData.unpaidAmount = payableAmount - Number(existingContract.paidAmount)
    }

    if (body.changedAmount !== undefined) {
      if (typeof body.changedAmount !== 'number') {
        throw new BadRequestError('变更金额必须是数字')
      }
      updateData.changedAmount = body.changedAmount
      // 更新应付金额
      updateData.payableAmount = Number(existingContract.contractAmount) + Number(body.changedAmount)
    }

    if (body.signDate !== undefined) {
      if (!body.signDate || typeof body.signDate !== 'string') {
        throw new BadRequestError('签订日期不能为空')
      }
      const signDate = new Date(body.signDate)
      if (Number.isNaN(signDate.getTime())) {
        throw new BadRequestError('签订日期格式不正确')
      }
      updateData.signDate = signDate
    }

    if (body.startDate !== undefined) {
      const startDate = body.startDate ? new Date(body.startDate) : null
      if (startDate && Number.isNaN(startDate.getTime())) {
        throw new BadRequestError('开始日期格式不正确')
      }
      updateData.startDate = startDate
    }

    if (body.endDate !== undefined) {
      const endDate = body.endDate ? new Date(body.endDate) : null
      if (endDate && Number.isNaN(endDate.getTime())) {
        throw new BadRequestError('结束日期格式不正确')
      }
      updateData.endDate = endDate
    }

    const nextStartDate = updateData.startDate ?? existingContract.startDate
    const nextEndDate = updateData.endDate ?? existingContract.endDate
    if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
      throw new BadRequestError('结束日期不能早于开始日期')
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.materialCategory !== undefined) {
      updateData.materialCategory = body.materialCategory?.trim() || null
    }

    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = body.attachmentUrl?.trim() || null
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    // 更新合同
    const contract = await db.procurementContract.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        supplierId: true,
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        contractAmount: true,
        changedAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        status: true,
        approvalStatus: true,
        signDate: true,
        startDate: true,
        endDate: true,
        materialCategory: true,
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
      projectName: contract.project.name,
      constructionId: contract.constructionId,
      constructionName: contract.construction.name,
      supplierId: contract.supplierId,
      supplierName: contract.supplier.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      status: contract.status,
      approvalStatus: contract.approvalStatus,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      materialCategory: contract.materialCategory,
      attachmentUrl: contract.attachmentUrl,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
  },

  /**
   * DELETE /api/procurement-contracts/{id}
   * 删除采购合同
   * 删除规则：如果存在采购付款记录，禁止删除
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    // 检查合同是否存在
    const contract = await db.procurementContract.findUnique({
      where: { id },
    })

    if (!contract) {
      throw new NotFoundError('采购合同不存在')
    }

    // 审批状态锁定校验
    try {
      assertEditable(contract.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    // 检查是否存在采购付款记录
    const paymentCount = await db.procurementPayment.count({
      where: { contractId: id },
    })

    if (paymentCount > 0) {
      throw new ConflictError('该采购合同已产生付款记录，无法删除')
    }

    // 删除合同
    await db.procurementContract.delete({
      where: { id },
    })

    return success({ message: '采购合同已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler
