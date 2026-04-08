import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { assertSubcontractContractInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

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
  paymentAmount: Prisma.Decimal | number
  paymentDate: Date
  paymentMethod: string | null
  paymentNumber: string | null
  attachmentUrl: string | null
  approvalStatus: string
  status: string
  remark: string | null
  createdAt: Date
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

    const payments = await db.subcontractPayment.findMany({
      where,
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
        attachmentUrl: true,
        approvalStatus: true,
        status: true,
        remark: true,
        createdAt: true,
      },
      orderBy: { paymentDate: 'desc' },
    })

    return success(payments.map(toResponse))
  },

  POST: async (req) => {
    const body = await req.json()

    if (!body.contractId || typeof body.contractId !== 'string') {
      throw new BadRequestError('合同 ID 为必填项')
    }
    if (body.amount === undefined || typeof body.amount !== 'number') {
      throw new BadRequestError('付款金额为必填项且必须是数字')
    }
    if (body.amount <= 0) {
      throw new BadRequestError('付款金额必须大于 0')
    }

    const contract = await assertSubcontractContractInCurrentRegion(body.contractId)
    if (!contract) throw new NotFoundError('分包合同不存在')

    const regionId = await requireCurrentRegionId()
    const createData: Prisma.SubcontractPaymentUncheckedCreateInput = {
      id: crypto.randomUUID(),
      projectId: contract.projectId,
      contractId: body.contractId,
      workerId: contract.workerId,
      vendorId: null,
      paymentAmount: body.amount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod?.trim() || null,
      paymentNumber: body.paymentNumber?.trim() || null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      status: 'PAID',
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const payment = await db.subcontractPayment.create({
      data: createData,
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
        attachmentUrl: true,
        approvalStatus: true,
        status: true,
        remark: true,
        createdAt: true,
      },
    })

    const newPaidAmount = Number(contract.paidAmount) + Number(body.amount)
    const newUnpaidAmount = Number(contract.payableAmount) - newPaidAmount

    await db.subcontractContract.update({
      where: { id: body.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success(toResponse(payment))
  },
}, {
  resource: 'subcontract-payments',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
