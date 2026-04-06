import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'
import { getCurrentRegionId } from '@/lib/region'
import { getAfterRecordWhere, getBeforeRecordWhere, getDescNavigationOrder } from '@/lib/record-navigation'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/project-contracts/{id}
   * 获取合同详情
   */
  GET: async (req) => {
    const { pathname, searchParams } = new URL(req.url)
    const id = pathname.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少合同 ID')
    }

    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const regionId = await getCurrentRegionId()
    const navigationWhere: any = {}
    if (regionId) navigationWhere.regionId = regionId
    if (projectId) navigationWhere.projectId = projectId
    if (status && status !== 'ALL') navigationWhere.status = status
    if (keyword) {
      navigationWhere.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { project: { name: { contains: keyword } } },
        { customer: { name: { contains: keyword } } },
      ]
    }
    if (startDate || endDate) {
      navigationWhere.signDate = {}
      if (startDate) navigationWhere.signDate.gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) navigationWhere.signDate.lte = new Date(`${endDate}T23:59:59.999Z`)
    }

    const contract = await db.projectContract.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        project: {
          select: { id: true, name: true, customer: { select: { id: true, name: true } } },
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

    const currentInScopeWhere = { AND: [navigationWhere, { id: contract.id }] }
    const beforeWhere = getBeforeRecordWhere(navigationWhere, 'signDate', contract.signDate || contract.createdAt, contract.createdAt, contract.id)
    const afterWhere = getAfterRecordWhere(navigationWhere, 'signDate', contract.signDate || contract.createdAt, contract.createdAt, contract.id)

    const [recentReceipts, changeRecords, currentScopedCount, total, beforeCount, prevRecord, nextRecord] = await Promise.all([
      db.contractReceipt.findMany({
        where: { contractId: contract.id },
        orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          receiptDate: true,
          receiptAmount: true,
          receiptMethod: true,
          receiptNumber: true,
          status: true,
          approvalStatus: true,
        },
      }),
      db.projectContractChange.findMany({
        where: { contractId: contract.id },
        orderBy: [{ changeDate: 'desc' }, { createdAt: 'desc' }],
        take: 10,
        select: {
          id: true,
          changeType: true,
          changeAmount: true,
          changeReason: true,
          changeDate: true,
          originalAmount: true,
          totalAmount: true,
          approvalStatus: true,
          createdAt: true,
        },
      }),
      db.projectContract.count({ where: currentInScopeWhere }),
      db.projectContract.count({ where: navigationWhere }),
      db.projectContract.count({ where: beforeWhere }),
      db.projectContract.findFirst({
        where: beforeWhere,
        orderBy: getDescNavigationOrder('signDate'),
        select: { id: true },
      }),
      db.projectContract.findFirst({
        where: afterWhere,
        orderBy: getDescNavigationOrder('signDate'),
        select: { id: true },
      }),
    ])

    const navigation = currentScopedCount > 0
      ? {
          prevId: prevRecord?.id || null,
          nextId: nextRecord?.id || null,
          position: beforeCount + 1,
          total,
        }
      : null

    return success({
      id: contract.id,
      code: contract.code,
      name: contract.name,
      projectId: contract.projectId,
      project: contract.project,
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
      contractType: contract.contractType,
      paymentMethod: contract.paymentMethod,
      hasRetention: contract.hasRetention,
      retentionRate: contract.retentionRate,
      retentionAmount: contract.retentionAmount,
      attachmentUrl: contract.attachmentUrl,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      recentFlows: recentReceipts.map((item) => ({
        id: item.id,
        date: item.receiptDate,
        amount: item.receiptAmount,
        method: item.receiptMethod,
        number: item.receiptNumber,
        status: item.status,
        approvalStatus: item.approvalStatus,
      })),
      changeRecords: changeRecords.map((item) => ({
        id: item.id,
        changedAt: item.changeDate || item.createdAt,
        beforeAmount: item.originalAmount,
        changeAmount: item.changeAmount,
        afterAmount: item.totalAmount,
        changeType: item.changeType,
        reason: item.changeReason,
        approvalStatus: item.approvalStatus,
      })),
      navigation,
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
    const existingContract = await db.projectContract.findUnique({
      where: { id },
    })

    if (!existingContract) {
      throw new NotFoundError('合同不存在')
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
      const project = await db.project.findUnique({
        where: { id: body.projectId },
        select: { id: true, customerId: true },
      })
      if (!project) {
        throw new NotFoundError('项目不存在')
      }
      updateData.projectId = project.id
      updateData.customerId = project.customerId
    }

    if (body.contractAmount !== undefined) {
      if (typeof body.contractAmount !== 'number' || body.contractAmount <= 0) {
        throw new BadRequestError('合同金额必须大于 0')
      }
      const receivableAmount = Number(body.contractAmount) + Number(existingContract.changedAmount)
      updateData.contractAmount = body.contractAmount
      updateData.receivableAmount = receivableAmount
      updateData.unreceivedAmount = receivableAmount - Number(existingContract.receivedAmount)
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
        throw new BadRequestError('履约开始日期格式不正确')
      }
      updateData.startDate = startDate
    }

    if (body.endDate !== undefined) {
      const endDate = body.endDate ? new Date(body.endDate) : null
      if (endDate && Number.isNaN(endDate.getTime())) {
        throw new BadRequestError('履约结束日期格式不正确')
      }
      updateData.endDate = endDate
    }

    const nextStartDate = updateData.startDate ?? existingContract.startDate
    const nextEndDate = updateData.endDate ?? existingContract.endDate
    if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
      throw new BadRequestError('履约结束日期不能早于履约开始日期')
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
      updateData.retentionRate = body.retentionRate === null || body.retentionRate === '' ? null : Number(body.retentionRate)
    }

    if (body.retentionAmount !== undefined) {
      updateData.retentionAmount = body.retentionAmount === null || body.retentionAmount === '' ? null : Number(body.retentionAmount)
    }

    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = body.attachmentUrl?.trim() || null
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    // 更新合同
    const contract = await db.projectContract.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        project: {
          select: { id: true, name: true, customer: { select: { id: true, name: true } } },
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
      project: contract.project,
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
    const contract = await db.projectContract.findUnique({
      where: { id },
    })

    if (!contract) {
      throw new NotFoundError('合同不存在')
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

export const GET = handler
export const PUT = handler
export const DELETE = handler
