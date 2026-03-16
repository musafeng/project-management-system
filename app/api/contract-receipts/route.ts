import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

type ContractReceiptSelect = Awaited<ReturnType<typeof db.contractReceipt.findMany>>[number]

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/contract-receipts
   * 获取收款记录列表
   * 支持参数：contractId（可选）、projectId（可选）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    const projectId = searchParams.get('projectId')

    const where: any = {}

    if (contractId) {
      where.contractId = contractId
    }

    if (projectId) {
      where.contract = {
        projectId: projectId,
      }
    }

    const receipts = await db.contractReceipt.findMany({
      where,
      select: {
        id: true,
        contractId: true,
        contract: {
          select: {
            code: true,
            project: {
              select: { name: true },
            },
          },
        },
        receiptAmount: true,
        receiptDate: true,
        remark: true,
        createdAt: true,
      },
      orderBy: { receiptDate: 'desc' },
    })

    // 转换返回格式
    const result = receipts.map((receipt: ContractReceiptSelect) => ({
      id: receipt.id,
      contractId: receipt.contractId,
      contractCode: receipt.contract.code,
      projectName: receipt.contract.project.name,
      amount: receipt.receiptAmount,
      receiptDate: receipt.receiptDate,
      remark: receipt.remark,
      createdAt: receipt.createdAt,
    }))

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
    const receipt = await db.contractReceipt.create({
      data: {
        contractId: body.contractId,
        receiptAmount: body.amount,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        remark: body.remark?.trim() || null,
        status: 'RECEIVED',
      },
      select: {
        id: true,
        contractId: true,
        contract: {
          select: {
            code: true,
            project: {
              select: { name: true },
            },
          },
        },
        receiptAmount: true,
        receiptDate: true,
        remark: true,
        createdAt: true,
      },
    })

    // 更新合同汇总字段
    const newReceivedAmount = contract.receivedAmount + body.amount
    const newUnreceivedAmount = contract.receivableAmount - newReceivedAmount

    await db.projectContract.update({
      where: { id: body.contractId },
      data: {
        receivedAmount: newReceivedAmount,
        unreceivedAmount: newUnreceivedAmount,
      },
    })

    return success({
      id: receipt.id,
      contractId: receipt.contractId,
      contractCode: receipt.contract.code,
      projectName: receipt.contract.project.name,
      amount: receipt.receiptAmount,
      receiptDate: receipt.receiptDate,
      remark: receipt.remark,
      createdAt: receipt.createdAt,
    })
  },
}, {
  resource: 'contract-receipts',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})

