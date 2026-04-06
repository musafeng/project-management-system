import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentRegionId } from '@/lib/region'
import { handleSubmit } from '@/lib/approval'
import { parsePaginationParams } from '@/lib/list-pagination'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/contract-receipts
   * 获取收款记录列表
   * 支持参数：contractId、projectId、keyword、approvalStatus、startDate、endDate
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const approvalStatus = searchParams.get('approvalStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const pagination = parsePaginationParams(searchParams)

    const regionId = await getCurrentRegionId()
    const where: any = {}

    if (regionId) where.regionId = regionId

    if (contractId) {
      where.contractId = contractId
    }

    if (projectId || keyword) {
      where.contract = {
        ...(projectId ? { projectId } : {}),
        ...(keyword ? {
          OR: [
            { code: { contains: keyword } },
            { name: { contains: keyword } },
            { project: { name: { contains: keyword } } },
            { project: { customer: { name: { contains: keyword } } } },
          ],
        } : {}),
      }
    }

    if (approvalStatus && approvalStatus !== 'ALL') {
      where.approvalStatus = approvalStatus
    }

    if (startDate || endDate) {
      where.receiptDate = {}
      if (startDate) where.receiptDate.gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) where.receiptDate.lte = new Date(`${endDate}T23:59:59.999Z`)
    }

    const [total, receiptSummary, relatedContractIds, receipts] = await Promise.all([
      pagination.paginated ? db.contractReceipt.count({ where }) : Promise.resolve(0),
      pagination.paginated
        ? db.contractReceipt.aggregate({
            where,
            _sum: { receiptAmount: true },
          })
        : Promise.resolve(null),
      pagination.paginated
        ? db.contractReceipt.findMany({
            where,
            distinct: ['contractId'],
            select: { contractId: true },
          })
        : Promise.resolve([]),
      db.contractReceipt.findMany({
        where,
        select: {
          id: true,
          contractId: true,
          contract: {
            select: {
              code: true,
              name: true,
              project: {
                select: {
                  name: true,
                  customer: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          receiptAmount: true,
          receiptDate: true,
          receiptMethod: true,
          receiptNumber: true,
          status: true,
          deductionItems: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        ...(pagination.paginated ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
    ])

    const relatedContractSummary =
      pagination.paginated && relatedContractIds.length > 0
        ? await db.projectContract.aggregate({
            where: { id: { in: relatedContractIds.map((item) => item.contractId) } },
            _sum: {
              receivableAmount: true,
              receivedAmount: true,
              unreceivedAmount: true,
            },
          })
        : null

    // 转换返回格式
    type ReceiptItem = (typeof receipts)[number]
    const result = receipts.map((receipt: ReceiptItem) => ({
      id: receipt.id,
      contractId: receipt.contractId,
      contractCode: receipt.contract.code,
      contractName: receipt.contract.name,
      projectName: receipt.contract.project.name,
      customerName: receipt.contract.project.customer.name,
      amount: receipt.receiptAmount,
      receiptDate: receipt.receiptDate,
      receiptMethod: receipt.receiptMethod,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
      deductionItems: receipt.deductionItems ? JSON.parse(receipt.deductionItems) : [],
      attachmentUrl: receipt.attachmentUrl,
      approvalStatus: receipt.approvalStatus,
      remark: receipt.remark,
      createdAt: receipt.createdAt,
    }))

    if (pagination.paginated) {
      const receivableAmountTotal = Number(relatedContractSummary?._sum.receivableAmount || 0)
      const receivedAmountTotal = Number(relatedContractSummary?._sum.receivedAmount || 0)
      return success({
        items: result,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        summary: {
          receiptAmountTotal: Number(receiptSummary?._sum.receiptAmount || 0),
          relatedReceivableAmountTotal: receivableAmountTotal,
          relatedReceivedAmountTotal: receivedAmountTotal,
          relatedUnreceivedAmountTotal: Number(relatedContractSummary?._sum.unreceivedAmount || 0),
          receiptProgress: receivableAmountTotal > 0 ? (receivedAmountTotal / receivableAmountTotal) * 100 : 0,
          relatedContractCount: relatedContractIds.length,
          resultCount: total,
        },
      })
    }

    return success(result)
  },

  /**
   * POST /api/contract-receipts
   * 创建收款记录
   * body: { contractId, amount, receiptDate?, remark? }
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.contractId || typeof body.contractId !== 'string') {
      throw new BadRequestError('合同 ID 为必填项')
    }

    if (body.amount === undefined || typeof body.amount !== 'number') {
      throw new BadRequestError('收款金额为必填项且必须是数字')
    }

    if (body.amount <= 0) {
      throw new BadRequestError('收款金额必须大于 0')
    }

    if (!body.receiptDate || typeof body.receiptDate !== 'string') {
      throw new BadRequestError('收款日期为必填项')
    }

    const receiptDate = new Date(body.receiptDate)
    if (Number.isNaN(receiptDate.getTime())) {
      throw new BadRequestError('收款日期格式不正确')
    }

    const definition = await db.processDefinition.findUnique({
      where: { resourceType: 'contract-receipts' },
      select: {
        id: true,
        isActive: true,
        nodes: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!definition || !definition.isActive || definition.nodes.length === 0) {
      throw new BadRequestError('合同收款审批流程未配置，请联系管理员')
    }

    // 验证合同是否存在
    const contract = await db.projectContract.findUnique({
      where: { id: body.contractId },
      select: {
        id: true,
        receivableAmount: true,
        receivedAmount: true,
        unreceivedAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('合同不存在')
    }

    // 创建收款记录
    const regionId = await getCurrentRegionId()
    const createData: Prisma.ContractReceiptUncheckedCreateInput = {
      contractId: body.contractId,
      receiptAmount: body.amount,
      receiptDate,
      receiptMethod: body.receiptMethod?.trim() || null,
      deductionItems: body.deductionItems ? JSON.stringify(body.deductionItems) : null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      status: 'RECEIVED',
      approvalStatus: 'PENDING',
      regionId: regionId ?? undefined,
    }
    const receipt = await db.contractReceipt.create({
      data: createData,
      select: {
        id: true,
        contractId: true,
        contract: {
          select: {
            code: true,
            name: true,
            project: {
              select: {
                name: true,
                customer: {
                  select: { name: true },
                },
              },
            },
          },
        },
        receiptAmount: true,
        receiptDate: true,
        receiptMethod: true,
        receiptNumber: true,
        deductionItems: true,
        attachmentUrl: true,
        approvalStatus: true,
        remark: true,
        createdAt: true,
      },
    })

    // 更新合同汇总字段
    const newReceivedAmount =
      Number(contract.receivedAmount) + Number(body.amount)
    const newUnreceivedAmount =
      Number(contract.receivableAmount) - newReceivedAmount

    await db.projectContract.update({
      where: { id: body.contractId },
      data: {
        receivedAmount: newReceivedAmount,
        unreceivedAmount: newUnreceivedAmount,
      },
    })

    await handleSubmit('contractReceipt', receipt.id, `/api/contract-receipts/${receipt.id}/submit`)

    return success({
      id: receipt.id,
      contractId: receipt.contractId,
      contractCode: receipt.contract.code,
      contractName: receipt.contract.name,
      projectName: receipt.contract.project.name,
      customerName: receipt.contract.project.customer.name,
      amount: receipt.receiptAmount,
      receiptDate: receipt.receiptDate,
      receiptMethod: receipt.receiptMethod,
      receiptNumber: receipt.receiptNumber,
      deductionItems: receipt.deductionItems ? JSON.parse(receipt.deductionItems) : [],
      attachmentUrl: receipt.attachmentUrl,
      approvalStatus: receipt.approvalStatus,
      remark: receipt.remark,
      createdAt: receipt.createdAt,
    })
  },
}, {
  resource: 'contract-receipts',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
