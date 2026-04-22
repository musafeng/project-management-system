import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertEditable } from '@/lib/approval'
import { assertDirectRecordInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


const handler = apiHandlerWithMethod({
  /**
   * GET /api/project-contracts/{id}
   * 获取合同详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const regionId = await requireCurrentRegionId()

    const contract = await db.projectContract.findFirst({
      where: { id, regionId },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        Project: {
          select: { id: true, name: true, Customer: { select: { id: true, name: true } } },
        },
        customerId: true,
        contractAmount: true,
        changedAmount: true,
        receivableAmount: true,
        receivedAmount: true,
        unreceivedAmount: true,
        signDate: true,
        startDate: true,
        endDate: true,
        status: true,
        approvalStatus: true,
        approvedAt: true,
        submittedAt: true,
        rejectedAt: true,
        rejectedReason: true,
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

    if (!contract) {
      throw new NotFoundError('合同不存在')
    }

    return success({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      project: contract.Project,
      customerId: contract.customerId,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      receivableAmount: contract.receivableAmount,
      receivedAmount: contract.receivedAmount,
      unreceivedAmount: contract.unreceivedAmount,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      approvalStatus: contract.approvalStatus,
      approvedAt: contract.approvedAt,
      submittedAt: contract.submittedAt,
      rejectedAt: contract.rejectedAt,
      rejectedReason: contract.rejectedReason,
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

  /**
   * PUT /api/project-contracts/{id}
   * 更新合同信息
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const body = await req.json()

    // 检查合同是否存在
    const existingContract = await assertDirectRecordInCurrentRegion('projectContract', id)

    if (!existingContract) {
      throw new NotFoundError('合同不存在')
    }

    try {
      assertEditable(existingContract.approvalStatus, existingContract.approvedAt)
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

    if (body.contractType !== undefined) {
      updateData.contractType = body.contractType?.trim() || null
    }

    if (body.paymentMethod !== undefined) {
      updateData.paymentMethod = body.paymentMethod?.trim() || null
    }

    if (body.hasRetention !== undefined) {
      updateData.hasRetention = Boolean(body.hasRetention)
    }

    if (body.retentionRate !== undefined) {
      updateData.retentionRate =
        body.retentionRate === null || body.retentionRate === '' ? null : Number(body.retentionRate)
    }

    if (body.retentionAmount !== undefined) {
      updateData.retentionAmount =
        body.retentionAmount === null || body.retentionAmount === '' ? null : Number(body.retentionAmount)
    }

    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = body.attachmentUrl?.trim() || null
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    updateData.updatedAt = new Date()

    // 更新合同
    const contract = await db.projectContract.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        Project: {
          select: { id: true, name: true, Customer: { select: { id: true, name: true } } },
        },
        customerId: true,
        contractAmount: true,
        changedAmount: true,
        receivableAmount: true,
        receivedAmount: true,
        unreceivedAmount: true,
        signDate: true,
        startDate: true,
        endDate: true,
        status: true,
        approvalStatus: true,
        approvedAt: true,
        submittedAt: true,
        rejectedAt: true,
        rejectedReason: true,
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
      project: contract.Project,
      customerId: contract.customerId,
      contractAmount: contract.contractAmount,
      changedAmount: contract.changedAmount,
      receivableAmount: contract.receivableAmount,
      receivedAmount: contract.receivedAmount,
      unreceivedAmount: contract.unreceivedAmount,
      signDate: contract.signDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      approvalStatus: contract.approvalStatus,
      approvedAt: contract.approvedAt,
      submittedAt: contract.submittedAt,
      rejectedAt: contract.rejectedAt,
      rejectedReason: contract.rejectedReason,
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

  /**
   * DELETE /api/project-contracts/{id}
   * 删除合同
   * 删除规则：如果合同已产生业务数据（收款、施工立项），禁止删除
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    // 检查合同是否存在
    const contract = await assertDirectRecordInCurrentRegion('projectContract', id)

    if (!contract) {
      throw new NotFoundError('合同不存在')
    }

    try {
      assertEditable(contract.approvalStatus, contract.approvedAt)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法删除')
    }

    // 检查是否存在收款记录
    const receiptCount = await db.contractReceipt.count({
      where: { contractId: id },
    })

    if (receiptCount > 0) {
      throw new ConflictError('该合同已产生业务数据，无法删除')
    }

    // 检查是否存在施工立项
    const constructionCount = await db.constructionApproval.count({
      where: { contractId: id },
    })

    if (constructionCount > 0) {
      throw new ConflictError('该合同已产生业务数据，无法删除')
    }

    // 删除合同变更记录
    await db.projectContractChange.deleteMany({
      where: { contractId: id },
    })

    // 删除合同
    await db.projectContract.delete({
      where: { id },
    })

    return success({ message: '合同已删除' })
  },
})
