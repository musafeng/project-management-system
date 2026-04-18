import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { assertEditable } from '@/lib/approval'
import { assertSubcontractContractInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


function toResponse(payment: {
  id: string
  contractId: string
  projectId: string
  workerId: string | null
  vendorId: string | null
  SubcontractContract: {
    code: string
    name: string
    constructionId: string
    ConstructionApproval: { name: string }
    Project: { name: string }
    LaborWorker: { name: string; phone: string | null; idNumber: string | null; bankAccount: string | null; bankName: string | null } | null
    SubcontractVendor: { name: string; phone: string | null; bankAccount: string | null; bankName: string | null } | null
  }
  paymentAmount: any
  paymentDate: Date
  paymentMethod: string | null
  paymentNumber: string | null
  attachmentUrl?: string | null
  approvalStatus?: string
  status: string
  remark: string | null
  createdAt: Date
  updatedAt: Date
}) {
  const worker = payment.SubcontractContract.LaborWorker
  const vendor = payment.SubcontractContract.SubcontractVendor
  return {
    id: payment.id,
    contractId: payment.contractId,
    projectId: payment.projectId,
    workerId: payment.workerId,
    vendorId: payment.vendorId,
    constructionId: payment.SubcontractContract.constructionId,
    contractCode: payment.SubcontractContract.code,
    contractName: payment.SubcontractContract.name,
    constructionName: payment.SubcontractContract.ConstructionApproval.name,
    projectName: payment.SubcontractContract.Project.name,
    subcontractWorkerName: worker?.name ?? vendor?.name ?? '',
    subcontractWorkerPhone: worker?.phone ?? vendor?.phone ?? null,
    subcontractWorkerIdNumber: worker?.idNumber ?? null,
    subcontractWorkerBankAccount: worker?.bankAccount ?? vendor?.bankAccount ?? null,
    subcontractWorkerBankName: worker?.bankName ?? vendor?.bankName ?? null,
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
    updatedAt: payment.updatedAt,
  }
}

const handler = apiHandlerWithMethod({
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    const regionId = await requireCurrentRegionId()

    const supportsAttachmentUrl = await hasDbColumn('SubcontractPayment', 'attachmentUrl')
    const payment = await db.subcontractPayment.findFirst({
      where: { id, regionId },
      select: {
        id: true,
        contractId: true,
        projectId: true,
        workerId: true,
        vendorId: true,
        SubcontractContract: {
          select: {
            code: true,
            name: true,
            constructionId: true,
            ConstructionApproval: { select: { name: true } },
            Project: { select: { name: true } },
            LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } },
            SubcontractVendor: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
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
        updatedAt: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    return success(toResponse({ ...payment, attachmentUrl: (payment as any).attachmentUrl ?? null }))
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    const payment = await db.subcontractPayment.findFirst({
      where: {
        id,
        regionId: await requireCurrentRegionId(),
      },
      select: {
        id: true,
        contractId: true,
        paymentAmount: true,
        approvalStatus: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    try {
      assertEditable(payment.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const contract = await assertSubcontractContractInCurrentRegion(payment.contractId)

    if (!contract) {
      throw new NotFoundError('关联的分包合同不存在')
    }

    await db.subcontractPayment.delete({
      where: { id },
    })

    const newPaidAmount = Number(contract.paidAmount) - Number(payment.paymentAmount)
    const newUnpaidAmount = Number(contract.payableAmount) - newPaidAmount

    await db.subcontractContract.update({
      where: { id: payment.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success({ message: '付款记录已删除' })
  },
})

export const GET = handler
export const DELETE = handler
