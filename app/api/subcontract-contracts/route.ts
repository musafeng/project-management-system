import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { insertCompatRecord } from '@/lib/db-write-compat'
import { Prisma } from '@prisma/client'
import {
  assertConstructionApprovalInCurrentRegion,
  assertMasterRecordInCurrentRegion,
  assertProjectInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'

export const dynamic = 'force-dynamic'

async function resolveSubcontractAssignee(workerId: string) {
  const regionId = await requireCurrentRegionId()
  const supportsWorkerId = await hasDbColumn('SubcontractContract', 'workerId')
  const supportsVendorRegionId = await hasDbColumn('SubcontractVendor', 'regionId')
  const legacyCompatCode = `LW-${workerId}`
  const compatCode = `${legacyCompatCode}-${regionId.slice(-6)}`
  const existingVendor = await db.subcontractVendor.findFirst({
    where: {
      ...(supportsVendorRegionId ? { regionId } : {}),
      OR: [{ code: compatCode }, { code: legacyCompatCode }],
    },
    select: { id: true },
  })
  if (existingVendor) {
    return { workerId: supportsWorkerId ? workerId : null, vendorId: existingVendor.id }
  }

  const currentWorker = await assertMasterRecordInCurrentRegion('laborWorker', workerId)
  const worker = await db.laborWorker.findUnique({
    where: { id: currentWorker.id },
    select: { name: true, phone: true, bankAccount: true, bankName: true },
  })
  if (!worker) throw new NotFoundError('分包人员不存在')

  const vendor = await db.subcontractVendor.create({
    data: {
      id: crypto.randomUUID(),
      code: compatCode,
      name: worker.name,
      phone: worker.phone,
      bankAccount: worker.bankAccount,
      bankName: worker.bankName,
      ...(supportsVendorRegionId ? { regionId } : {}),
      updatedAt: new Date(),
    },
    select: { id: true },
  })

  return { workerId: supportsWorkerId ? workerId : null, vendorId: vendor.id }
}


function toResponse(contract: {
  id: string
  code: string
  name: string
  projectId: string
  constructionId: string
  workerId?: string | null
  vendorId: string | null
  Project: { name: string }
  ConstructionApproval: { name: string }
  LaborWorker: {
    name: string
    phone: string | null
    idNumber: string | null
    bankAccount: string | null
    bankName: string | null
  } | null
  SubcontractVendor: {
    name: string
    phone: string | null
    bankAccount: string | null
    bankName: string | null
  } | null
  contractAmount: Prisma.Decimal | number
  payableAmount: Prisma.Decimal | number
  paidAmount: Prisma.Decimal | number
  unpaidAmount: Prisma.Decimal | number
  signDate: Date | null
  attachmentUrl?: string | null
  subcontractType?: string | null
  remark?: string | null
  approvalStatus: string
  approvedAt: Date | null
  createdAt: Date
}) {
  const workerName = contract.LaborWorker?.name ?? contract.SubcontractVendor?.name ?? ''
  return {
    id: contract.id,
    code: contract.code,
    name: contract.name,
    projectId: contract.projectId,
    constructionId: contract.constructionId,
    workerId: contract.workerId,
    vendorId: contract.vendorId,
    projectName: contract.Project.name,
    constructionName: contract.ConstructionApproval.name,
    subcontractWorkerName: workerName,
    subcontractWorkerPhone: contract.LaborWorker?.phone ?? contract.SubcontractVendor?.phone ?? null,
    subcontractWorkerIdNumber: contract.LaborWorker?.idNumber ?? null,
    subcontractWorkerBankAccount: contract.LaborWorker?.bankAccount ?? contract.SubcontractVendor?.bankAccount ?? null,
    subcontractWorkerBankName: contract.LaborWorker?.bankName ?? contract.SubcontractVendor?.bankName ?? null,
    contractAmount: contract.contractAmount,
    payableAmount: contract.payableAmount,
    paidAmount: contract.paidAmount,
    unpaidAmount: contract.unpaidAmount,
    signDate: contract.signDate,
    attachmentUrl: contract.attachmentUrl ?? null,
    subcontractType: contract.subcontractType ?? null,
    remark: contract.remark ?? null,
    approvalStatus: contract.approvalStatus,
    approvedAt: contract.approvedAt,
    createdAt: contract.createdAt,
  }
}

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const constructionId = searchParams.get('constructionId')

    const regionId = await requireCurrentRegionId()
    const where: any = {}
    where.regionId = regionId
    if (projectId) where.projectId = projectId
    if (constructionId) where.constructionId = constructionId

    const supportsWorkerId = await hasDbColumn('SubcontractContract', 'workerId')
    const contracts = await db.subcontractContract.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        ...(supportsWorkerId ? { workerId: true } : {}),
        vendorId: true,
        Project: { select: { name: true } },
        ConstructionApproval: { select: { name: true } },
        ...(supportsWorkerId ? { LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } } } : {}),
        SubcontractVendor: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        subcontractType: true,
        attachmentUrl: true,
        remark: true,
        approvalStatus: true,
        approvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return success(contracts.map((contract) => toResponse({ ...contract, workerId: (contract as any).workerId ?? null, LaborWorker: (contract as any).LaborWorker ?? null })))
  },

  POST: async (req) => {
    const body = await req.json()
    const contractAmount = Number(body.contractAmount ?? 0)

    if (!body.projectId || typeof body.projectId !== 'string') {
      throw new BadRequestError('项目 ID 为必填项')
    }
    if (!body.constructionId || typeof body.constructionId !== 'string') {
      throw new BadRequestError('施工立项 ID 为必填项')
    }
    const workerId = String(body.workerId ?? body.subcontractWorkerId ?? '').trim()
    if (!workerId) {
      throw new BadRequestError('分包人员 ID 为必填项')
    }
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestError('合同名称为必填项')
    }
    if (!Number.isFinite(contractAmount)) {
      throw new BadRequestError('合同金额为必填项且必须是数字')
    }
    if (contractAmount <= 0) {
      throw new BadRequestError('合同金额必须大于 0')
    }

    const project = await assertProjectInCurrentRegion(body.projectId)
    if (!project) throw new NotFoundError('项目不存在')

    const construction = await assertConstructionApprovalInCurrentRegion(body.constructionId)
    if (!construction) throw new NotFoundError('施工立项不存在')
    if (construction.projectId !== body.projectId) {
      throw new BadRequestError('施工立项不属于该项目')
    }

    const worker = await assertMasterRecordInCurrentRegion('laborWorker', workerId)
    if (!worker) throw new NotFoundError('分包人员不存在')
    const assignee = await resolveSubcontractAssignee(workerId)
    const supportsWorkerId = await hasDbColumn('SubcontractContract', 'workerId')

    const code = `SUB${Date.now()}`

    const regionId = await requireCurrentRegionId()
    const createData: Prisma.SubcontractContractUncheckedCreateInput = {
      id: crypto.randomUUID(),
      code,
      name: body.name.trim(),
      projectId: body.projectId,
      constructionId: body.constructionId,
      ...(assignee.workerId ? { workerId: assignee.workerId } : {}),
      ...(assignee.vendorId ? { vendorId: assignee.vendorId } : {}),
      contractAmount,
      changedAmount: 0,
      payableAmount: contractAmount,
      paidAmount: 0,
      unpaidAmount: contractAmount,
      signDate: body.signDate ? new Date(body.signDate) : null,
      status: 'DRAFT',
      subcontractType: body.subcontractType?.trim() || null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    await insertCompatRecord('SubcontractContract', createData)
    const contract = await db.subcontractContract.findFirst({
      where: { id: createData.id },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        ...(supportsWorkerId ? { workerId: true } : {}),
        vendorId: true,
        Project: { select: { name: true } },
        ConstructionApproval: { select: { name: true } },
        ...(supportsWorkerId ? { LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } } } : {}),
        SubcontractVendor: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        subcontractType: true,
        attachmentUrl: true,
        remark: true,
        approvalStatus: true,
        approvedAt: true,
        createdAt: true,
      },
    })
    if (!contract) throw new NotFoundError('分包合同创建成功后未查询到记录')

    return success(toResponse({ ...contract, workerId: (contract as any).workerId ?? null, LaborWorker: (contract as any).LaborWorker ?? null }))
  },
}, {
  resource: 'subcontract-contracts',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
