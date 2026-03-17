import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/subcontract-contracts/{id}
   * 获取分包合同详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const contract = await db.subcontractContract.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        projectId: true,
        constructionId: true,
        vendorId: true,
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        contractAmount: true,
        changedAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        status: true,
        signDate: true,
        startDate: true,
        endDate: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('分包合同不存在')
    }

    return success({
      id: contract.id,
      code: contract.code,
      projectId: contract.projectId,
      projectName: contract.project.name,
      constructionId: contract.constructionId,
      constructionName: contract.construction.name,
      vendorId: contract.vendorId,
      subcontractVendorName: contract.vendor.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      status: contract.status,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
  },

  /**
   * PUT /api/subcontract-contracts/{id}
   * 更新分包合同
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const body = await req.json()

    // 检查合同是否存在
    const existingContract = await db.subcontractContract.findUnique({
      where: { id },
    })

    if (!existingContract) {
      throw new NotFoundError('分包合同不存在')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.changedAmount !== undefined) {
      if (typeof body.changedAmount !== 'number') {
        throw new BadRequestError('变更金额必须是数字')
      }
      updateData.changedAmount = body.changedAmount
      // 更新应付金额
      updateData.payableAmount = Number(existingContract.contractAmount) + Number(body.changedAmount)
    }

    if (body.signDate !== undefined) {
      updateData.signDate = body.signDate ? new Date(body.signDate) : null
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

    // 更新合同
    const contract = await db.subcontractContract.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        projectId: true,
        constructionId: true,
        vendorId: true,
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        contractAmount: true,
        changedAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        status: true,
        signDate: true,
        startDate: true,
        endDate: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success({
      id: contract.id,
      code: contract.code,
      projectId: contract.projectId,
      projectName: contract.project.name,
      constructionId: contract.constructionId,
      constructionName: contract.construction.name,
      vendorId: contract.vendorId,
      subcontractVendorName: contract.vendor.name,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      payableAmount: contract.payableAmount,
      paidAmount: contract.paidAmount,
      unpaidAmount: contract.unpaidAmount,
      status: contract.status,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
  },

  /**
   * DELETE /api/subcontract-contracts/{id}
   * 删除分包合同
   * 删除规则：如果存在分包付款记录，禁止删除
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    // 检查合同是否存在
    const contract = await db.subcontractContract.findUnique({
      where: { id },
    })

    if (!contract) {
      throw new NotFoundError('分包合同不存在')
    }

    // 检查是否存在分包付款记录
    const paymentCount = await db.subcontractPayment.count({
      where: { contractId: id },
    })

    if (paymentCount > 0) {
      throw new ConflictError('该分包合同已产生付款记录，无法删除')
    }

    // 删除合同
    await db.subcontractContract.delete({
      where: { id },
    })

    return success({ message: '分包合同已删除' })
  },
})


