import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { assertProcurementContractInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


function toResponse(payment: {
  id: string
  contractId: string
  projectId: string
  ProcurementContract: {
    code: string
    name: string
    constructionId: string
    ConstructionApproval: { name: string }
    Project: { name: string }
    Supplier: { name: string; phone: string | null; bankAccount: string | null; bankName: string | null }
  }
  paymentAmount: Prisma.Decimal | number
  paymentDate: Date
  paymentMethod: string | null
  paymentNumber: string | null
  attachmentUrl?: string | null
  approvalStatus: string
  status: string
  remark: string | null
  createdAt: Date
}) {
  return {
    id: payment.id,
    contractId: payment.contractId,
    projectId: payment.projectId,
    constructionId: payment.ProcurementContract.constructionId,
    contractCode: payment.ProcurementContract.code,
    contractName: payment.ProcurementContract.name,
    constructionName: payment.ProcurementContract.ConstructionApproval.name,
    projectName: payment.ProcurementContract.Project.name,
    supplierName: payment.ProcurementContract.Supplier.name,
    supplierPhone: payment.ProcurementContract.Supplier.phone,
    supplierBankAccount: payment.ProcurementContract.Supplier.bankAccount,
    supplierBankName: payment.ProcurementContract.Supplier.bankName,
    amount: payment.paymentAmount,
    paymentAmount: payment.paymentAmount,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    paymentNumber: payment.paymentNumber,
    attachmentUrl: payment.attachmentUrl,
    approvalStatus: payment.approvalStatus,
    status: payment.status,
    remark: payment.remark,
    createdAt: payment.createdAt,
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
    if (contractId) where.contractId = contractId
    if (projectId) where.projectId = projectId

    const supportsAttachmentUrl = await hasDbColumn('ProcurementPayment', 'attachmentUrl')
    const payments = await db.procurementPayment.findMany({
      where,
      select: {
        id: true,
        contractId: true,
        projectId: true,
        ProcurementContract: {
          select: {
            code: true,
            name: true,
            constructionId: true,
            ConstructionApproval: { select: { name: true } },
            Project: { select: { name: true } },
            Supplier: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
          },
        },
        paymentAmount: true,
        paymentDate: true,
        paymentMethod: true,
        paymentNumber: true,
        ...(supportsAttachmentUrl ? { attachmentUrl: true } : {}),
        approvalStatus: true,
        status: true,
        remark: true,
        createdAt: true,
      },
      orderBy: { paymentDate: 'desc' },
    })

    return success(payments.map((payment) => toResponse({ ...payment, attachmentUrl: (payment as any).attachmentUrl ?? null })))
  },

  POST: async (req) => {
    const body = await req.json()
    const amount = Number(body.amount ?? 0)

    if (!body.contractId || typeof body.contractId !== 'string') {
      throw new BadRequestError('合同 ID 为必填项')
    }
    if (!Number.isFinite(amount)) {
      throw new BadRequestError('付款金额为必填项且必须是数字')
    }
    if (amount <= 0) {
      throw new BadRequestError('付款金额必须大于 0')
    }

    const contract = await assertProcurementContractInCurrentRegion(body.contractId)
    if (!contract) throw new NotFoundError('采购合同不存在')

    const regionId = await requireCurrentRegionId()
    const supportsAttachmentUrl = await hasDbColumn('ProcurementPayment', 'attachmentUrl')
    const createData: Prisma.ProcurementPaymentUncheckedCreateInput = {
      id: crypto.randomUUID(),
      projectId: contract.projectId,
      contractId: body.contractId,
      paymentAmount: amount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod?.trim() || null,
      paymentNumber: body.paymentNumber?.trim() || null,
      ...(supportsAttachmentUrl ? { attachmentUrl: body.attachmentUrl?.trim() || null } : {}),
      status: 'PAID',
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const payment = await db.procurementPayment.create({
      data: createData,
      select: {
        id: true,
        contractId: true,
        projectId: true,
        ProcurementContract: {
          select: {
            code: true,
            name: true,
            constructionId: true,
            ConstructionApproval: { select: { name: true } },
            Project: { select: { name: true } },
            Supplier: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
          },
        },
        paymentAmount: true,
        paymentDate: true,
        paymentMethod: true,
        paymentNumber: true,
        ...(supportsAttachmentUrl ? { attachmentUrl: true } : {}),
        approvalStatus: true,
        status: true,
        remark: true,
        createdAt: true,
      },
    })

    const newPaidAmount = Number(contract.paidAmount) + amount
    const newUnpaidAmount = Number(contract.payableAmount) - newPaidAmount

    await db.procurementContract.update({
      where: { id: body.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success(toResponse({ ...payment, attachmentUrl: (payment as any).attachmentUrl ?? null }))
  },
}, {
  resource: 'procurement-payments',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
