import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { insertCompatRecord } from '@/lib/db-write-compat'
import { Prisma } from '@prisma/client'
import { assertLaborContractInCurrentRegion, requireCurrentRegionId } from '@/lib/region'
import { assertApprovedUpstream } from '@/lib/approval-gates'

export const dynamic = 'force-dynamic'


function toResponse(payment: {
  id: string
  contractId: string
  projectId: string
  workerId: string
  LaborContract: {
    code: string
    name: string
    constructionId: string
    ConstructionApproval: { name: string }
    Project: { name: string }
    LaborWorker: { name: string; phone: string | null; idNumber: string | null; bankAccount: string | null; bankName: string | null }
  }
  paymentAmount: Prisma.Decimal | number
  paymentDate: Date
  paymentMethod: string | null
  paymentNumber: string | null
  attachmentUrl?: string | null
  approvalStatus: string
  approvedAt: Date | null
  status: string
  remark: string | null
  createdAt: Date
}) {
  return {
    id: payment.id,
    contractId: payment.contractId,
    projectId: payment.projectId,
    workerId: payment.workerId,
    constructionId: payment.LaborContract.constructionId,
    contractCode: payment.LaborContract.code,
    contractName: payment.LaborContract.name,
    constructionName: payment.LaborContract.ConstructionApproval.name,
    projectName: payment.LaborContract.Project.name,
    laborWorkerName: payment.LaborContract.LaborWorker.name,
    laborWorkerPhone: payment.LaborContract.LaborWorker.phone,
    laborWorkerIdNumber: payment.LaborContract.LaborWorker.idNumber,
    laborWorkerBankAccount: payment.LaborContract.LaborWorker.bankAccount,
    laborWorkerBankName: payment.LaborContract.LaborWorker.bankName,
    amount: payment.paymentAmount,
    paymentAmount: payment.paymentAmount,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    paymentNumber: payment.paymentNumber,
    attachmentUrl: payment.attachmentUrl,
    approvalStatus: payment.approvalStatus,
    approvedAt: payment.approvedAt,
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

    const supportsAttachmentUrl = await hasDbColumn('LaborPayment', 'attachmentUrl')
    const payments = await db.laborPayment.findMany({
      where,
      select: {
        id: true,
        contractId: true,
        projectId: true,
        workerId: true,
        LaborContract: {
          select: {
            code: true,
            name: true,
            constructionId: true,
            ConstructionApproval: { select: { name: true } },
            Project: { select: { name: true } },
            LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } },
          },
        },
        paymentAmount: true,
        paymentDate: true,
        paymentMethod: true,
        paymentNumber: true,
        ...(supportsAttachmentUrl ? { attachmentUrl: true } : {}),
        approvalStatus: true,
        approvedAt: true,
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

    const contract = await assertLaborContractInCurrentRegion(body.contractId)
    if (!contract) throw new NotFoundError('劳务合同不存在')
    assertApprovedUpstream(contract, '劳务合同')

    const regionId = await requireCurrentRegionId()
    const supportsAttachmentUrl = await hasDbColumn('LaborPayment', 'attachmentUrl')
    const createData: Prisma.LaborPaymentUncheckedCreateInput = {
      id: crypto.randomUUID(),
      projectId: contract.projectId,
      contractId: body.contractId,
      workerId: contract.workerId,
      paymentAmount: amount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod?.trim() || null,
      paymentNumber: body.paymentNumber?.trim() || null,
      ...(supportsAttachmentUrl ? { attachmentUrl: body.attachmentUrl?.trim() || null } : {}),
      status: 'PAID',
      remark: body.remark?.trim() || null,
      approvalStatus: 'DRAFT',
      regionId,
      updatedAt: new Date(),
    }
    await insertCompatRecord('LaborPayment', createData)
    const payment = await db.laborPayment.findFirst({
      where: { id: createData.id },
      select: {
        id: true,
        contractId: true,
        projectId: true,
        workerId: true,
        LaborContract: {
          select: {
            code: true,
            name: true,
            constructionId: true,
            ConstructionApproval: { select: { name: true } },
            Project: { select: { name: true } },
            LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } },
          },
        },
        paymentAmount: true,
        paymentDate: true,
        paymentMethod: true,
        paymentNumber: true,
        ...(supportsAttachmentUrl ? { attachmentUrl: true } : {}),
        approvalStatus: true,
        approvedAt: true,
        status: true,
        remark: true,
        createdAt: true,
      },
    })
    if (!payment) throw new NotFoundError('付款记录创建成功后未查询到记录')

    const newPaidAmount = Number(contract.paidAmount) + amount
    const newUnpaidAmount = Number(contract.payableAmount) - newPaidAmount

    await db.laborContract.update({
      where: { id: body.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success(toResponse({ ...payment, attachmentUrl: (payment as any).attachmentUrl ?? null }))
  },
}, {
  resource: 'labor-payments',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
