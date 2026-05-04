import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { assertProjectContractInCurrentRegion, requireCurrentRegionId } from '@/lib/region'
import { assertApprovedUpstream } from '@/lib/approval-gates'

export const dynamic = 'force-dynamic'


function normalizeDeductionItems(items: unknown) {
  if (!Array.isArray(items)) return []

  return items
    .map((item: any) => {
      const type = String(item?.type ?? '').trim()
      const amount = Number(item?.amount ?? 0)
      if (!type || amount <= 0) return null
      return {
        type,
        amount,
        remark: String(item?.remark ?? '').trim() || null,
        attachmentUrl: String(item?.attachmentUrl ?? '').trim() || null,
      }
    })
    .filter(
      (
        item: {
          type: string
          amount: number
          remark: string | null
          attachmentUrl: string | null
        } | null
      ): item is {
        type: string
        amount: number
        remark: string | null
        attachmentUrl: string | null
      } => item !== null
    )
}

function calcActualReceivedAmount(receiptAmount: Prisma.Decimal | number, deductionItems: string | null) {
  const deductionTotal = deductionItems
    ? (JSON.parse(deductionItems) as Array<{ amount?: number }>).reduce(
        (sum, item) => sum + Number(item?.amount ?? 0),
        0
      )
    : 0
  return Number(receiptAmount) - deductionTotal
}

function toResponse(receipt: {
  id: string
  contractId: string
  ProjectContract: {
    code: string
    name: string
    Project: { name: string }
  }
  receiptAmount: Prisma.Decimal | number
  receiptDate: Date
  receiptMethod: string | null
  deductionItems: string | null
  attachmentUrl: string | null
  approvalStatus: string
  approvedAt: Date | null
  remark: string | null
  createdAt: Date
}) {
  return {
    id: receipt.id,
    contractId: receipt.contractId,
    contractCode: receipt.ProjectContract.code,
    contractName: receipt.ProjectContract.name,
    projectName: receipt.ProjectContract.Project.name,
    amount: receipt.receiptAmount,
    receiptAmount: receipt.receiptAmount,
    actualReceivedAmount: calcActualReceivedAmount(receipt.receiptAmount, receipt.deductionItems),
    receiptDate: receipt.receiptDate,
    receiptMethod: receipt.receiptMethod,
    deductionItems: receipt.deductionItems ? JSON.parse(receipt.deductionItems) : [],
    attachmentUrl: receipt.attachmentUrl,
    approvalStatus: receipt.approvalStatus,
    approvedAt: receipt.approvedAt,
    remark: receipt.remark,
    createdAt: receipt.createdAt,
  }
}

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    const projectId = searchParams.get('projectId')

    const regionId = await requireCurrentRegionId()
    const where: any = {}
    where.regionId = regionId
    if (contractId) {
      where.contractId = contractId
    }
    if (projectId) {
      where.ProjectContract = {
        projectId,
      }
    }

    const receipts = await db.contractReceipt.findMany({
      where,
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
        deductionItems: true,
        attachmentUrl: true,
        approvalStatus: true,
        approvedAt: true,
        remark: true,
        createdAt: true,
      },
      orderBy: { receiptDate: 'desc' },
    })

    return success(receipts.map(toResponse))
  },

  POST: async (req) => {
    const body = await req.json()

    if (!body.contractId || typeof body.contractId !== 'string') {
      throw new BadRequestError('合同 ID 为必填项')
    }

    const amount =
      typeof body.amount === 'number'
        ? body.amount
        : typeof body.receiptAmount === 'number'
          ? body.receiptAmount
          : NaN
    if (!Number.isFinite(amount)) {
      throw new BadRequestError('收款金额为必填项且必须是数字')
    }
    if (amount <= 0) {
      throw new BadRequestError('收款金额必须大于 0')
    }

    const contract = await assertProjectContractInCurrentRegion(body.contractId)
    if (!contract) {
      throw new NotFoundError('合同不存在')
    }
    assertApprovedUpstream(contract, '项目合同')

    const deductionItems = normalizeDeductionItems(body.deductionItems)
    const regionId = await requireCurrentRegionId()
    const createData: Prisma.ContractReceiptUncheckedCreateInput = {
      id: crypto.randomUUID(),
      contractId: body.contractId,
      receiptAmount: amount,
      receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
      receiptMethod: body.receiptMethod?.trim() || null,
      deductionItems: deductionItems.length > 0 ? JSON.stringify(deductionItems) : null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      status: 'RECEIVED',
      approvalStatus: 'DRAFT',
      regionId,
      updatedAt: new Date(),
    }
    const receipt = await db.contractReceipt.create({
      data: createData,
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
        deductionItems: true,
        attachmentUrl: true,
        approvalStatus: true,
        approvedAt: true,
        remark: true,
        createdAt: true,
      },
    })

    const newReceivedAmount = Number(contract.receivedAmount) + amount
    const newUnreceivedAmount = Number(contract.receivableAmount) - newReceivedAmount

    await db.projectContract.update({
      where: { id: body.contractId },
      data: {
        receivedAmount: newReceivedAmount,
        unreceivedAmount: newUnreceivedAmount,
      },
    })

    return success(toResponse(receipt))
  },
}, {
  resource: 'contract-receipts',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
