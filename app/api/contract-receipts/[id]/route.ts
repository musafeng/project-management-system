import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api'
import { assertEditable } from '@/lib/approval'
import { db } from '@/lib/db'
import {
  assertDirectRecordInCurrentRegion,
  assertProjectContractInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'

export const dynamic = 'force-dynamic'


function toResponse(receipt: {
  id: string
  contractId: string
  ProjectContract: {
    code: string
    name: string
    Project: { name: string }
  }
  receiptAmount: any
  receiptDate: Date
  receiptMethod: string | null
  receiptNumber: string | null
  status: string
  approvalStatus?: string
  approvedAt: Date | null
  deductionItems: string | null
  attachmentUrl: string | null
  remark: string | null
  createdAt: Date
  updatedAt: Date
}) {
  const deductionTotal = receipt.deductionItems
    ? (JSON.parse(receipt.deductionItems) as Array<{ amount?: number }>).reduce(
        (sum, item) => sum + Number(item?.amount ?? 0),
        0
      )
    : 0

  return {
    id: receipt.id,
    contractId: receipt.contractId,
    contractCode: receipt.ProjectContract.code,
    contractName: receipt.ProjectContract.name,
    projectName: receipt.ProjectContract.Project.name,
    amount: receipt.receiptAmount,
    receiptAmount: receipt.receiptAmount,
    actualReceivedAmount: Number(receipt.receiptAmount) - deductionTotal,
    receiptDate: receipt.receiptDate,
    receiptMethod: receipt.receiptMethod,
    receiptNumber: receipt.receiptNumber,
    status: receipt.status,
    approvalStatus: receipt.approvalStatus,
    approvedAt: receipt.approvedAt,
    deductionItems: receipt.deductionItems ? JSON.parse(receipt.deductionItems) : [],
    attachmentUrl: receipt.attachmentUrl,
    remark: receipt.remark,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
  }
}

const handler = apiHandlerWithMethod({
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少收款记录 ID')
    }

    const regionId = await requireCurrentRegionId()

    const receipt = await db.contractReceipt.findFirst({
      where: { id, regionId },
      select: {
        id: true,
        contractId: true,
        ProjectContract: {
          select: {
            code: true,
            name: true,
            Project: {
              select: { name: true },
            },
          },
        },
        receiptAmount: true,
        receiptDate: true,
        receiptMethod: true,
        receiptNumber: true,
        status: true,
        approvalStatus: true,
        approvedAt: true,
        deductionItems: true,
        attachmentUrl: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!receipt) {
      throw new NotFoundError('收款记录不存在')
    }

    return success(toResponse(receipt))
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少收款记录 ID')
    }

    const receipt = await assertDirectRecordInCurrentRegion('contractReceipt', id)
    if (!receipt) {
      throw new NotFoundError('收款记录不存在')
    }
    try {
      assertEditable(receipt.approvalStatus, receipt.approvedAt)
    } catch (error) {
      throw new ForbiddenError(error instanceof Error ? error.message : '当前单据无法删除')
    }

    const contract = await assertProjectContractInCurrentRegion(receipt.contractId)

    if (!contract) {
      throw new NotFoundError('关联的合同不存在')
    }

    await db.contractReceipt.delete({
      where: { id },
    })

    const newReceivedAmount = Number(contract.receivedAmount) - Number(receipt.receiptAmount)
    const newUnreceivedAmount = Number(contract.receivableAmount) - newReceivedAmount

    await db.projectContract.update({
      where: { id: receipt.contractId },
      data: {
        receivedAmount: newReceivedAmount,
        unreceivedAmount: newUnreceivedAmount,
      },
    })

    return success({ message: '收款记录已删除' })
  },
})

export const GET = handler
export const DELETE = handler
