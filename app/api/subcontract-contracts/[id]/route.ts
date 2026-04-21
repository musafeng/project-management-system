import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { deleteCompatRecord, updateCompatRecord } from '@/lib/db-write-compat'
import { assertEditable } from '@/lib/approval'
import {
  assertConstructionApprovalInCurrentRegion,
  assertDirectRecordInCurrentRegion,
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
  Project: { id: string; name: string }
  ConstructionApproval: { id: string; name: string }
  LaborWorker: {
    id: string
    name: string
    phone: string | null
    idNumber: string | null
    bankAccount: string | null
    bankName: string | null
  } | null
  SubcontractVendor: {
    id: string
    name: string
    phone: string | null
    bankAccount: string | null
    bankName: string | null
  } | null
  contractAmount: any
  changedAmount: any
  payableAmount: any
  paidAmount: any
  unpaidAmount: any
  status: string
  signDate: Date | null
  startDate: Date | null
  endDate: Date | null
  attachmentUrl: string | null
  subcontractType: string | null
  remark: string | null
  createdAt: Date
  updatedAt: Date
}) {
  const workerName = contract.LaborWorker?.name ?? contract.SubcontractVendor?.name ?? ''
  return {
    id: contract.id,
    code: contract.code,
    name: contract.name,
    projectId: contract.projectId,
    projectName: contract.Project.name,
    constructionId: contract.constructionId,
    constructionName: contract.ConstructionApproval.name,
    workerId: contract.workerId,
    vendorId: contract.vendorId,
    subcontractWorkerName: workerName,
    subcontractWorkerPhone: contract.LaborWorker?.phone ?? contract.SubcontractVendor?.phone ?? null,
    subcontractWorkerIdNumber: contract.LaborWorker?.idNumber ?? null,
    subcontractWorkerBankAccount: contract.LaborWorker?.bankAccount ?? contract.SubcontractVendor?.bankAccount ?? null,
    subcontractWorkerBankName: contract.LaborWorker?.bankName ?? contract.SubcontractVendor?.bankName ?? null,
    contractAmount: contract.contractAmount,
    changedAmount: contract.changedAmount,
    payableAmount: contract.payableAmount,
    paidAmount: contract.paidAmount,
    unpaidAmount: contract.unpaidAmount,
    status: contract.status,
    signDate: contract.signDate,
    startDate: contract.startDate,
    endDate: contract.endDate,
    attachmentUrl: contract.attachmentUrl,
    subcontractType: contract.subcontractType,
    remark: contract.remark,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  }
}

const handler = apiHandlerWithMethod({
  GET: async (req) => {
    const id = req.url.split('/').pop()
    if (!id) throw new BadRequestError('缺少合同 ID')

    const regionId = await requireCurrentRegionId()
    const supportsWorkerId = await hasDbColumn('SubcontractContract', 'workerId')
    const contract = await db.subcontractContract.findFirst({
      where: { id, regionId },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        ...(supportsWorkerId ? { workerId: true } : {}),
        vendorId: true,
        Project: { select: { id: true, name: true } },
        ConstructionApproval: { select: { id: true, name: true } },
        ...(supportsWorkerId ? { LaborWorker: { select: { id: true, name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } } } : {}),
        SubcontractVendor: { select: { id: true, name: true, phone: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        changedAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        status: true,
        signDate: true,
        startDate: true,
        endDate: true,
        attachmentUrl: true,
        subcontractType: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!contract) throw new NotFoundError('分包合同不存在')

    return success(toResponse({ ...contract, workerId: (contract as any).workerId ?? null, LaborWorker: (contract as any).LaborWorker ?? null }))
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()
    if (!id) throw new BadRequestError('缺少合同 ID')

    const body = await req.json()
    const existingContract = await assertDirectRecordInCurrentRegion('subcontractContract', id)
    if (!existingContract) throw new NotFoundError('分包合同不存在')

    try {
      assertEditable(existingContract.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const projectId =
      body.projectId === undefined ? existingContract.projectId : String(body.projectId ?? '').trim()
    const constructionId =
      body.constructionId === undefined ? existingContract.constructionId : String(body.constructionId ?? '').trim()
    const supportsWorkerId = await hasDbColumn('SubcontractContract', 'workerId')
    const workerId =
      body.workerId === undefined && body.subcontractWorkerId === undefined
        ? ((existingContract as { workerId?: string | null }).workerId ?? '')
        : String(body.workerId ?? body.subcontractWorkerId ?? '').trim()

    if (!projectId) throw new BadRequestError('项目为必填项')
    if (!constructionId) throw new BadRequestError('施工立项为必填项')
    if (!workerId) throw new BadRequestError('分包人员为必填项')

    await assertProjectInCurrentRegion(projectId)
    const construction = await assertConstructionApprovalInCurrentRegion(constructionId)
    if (construction.projectId !== projectId) {
      throw new BadRequestError('施工立项不属于该项目')
    }
    const worker = await assertMasterRecordInCurrentRegion('laborWorker', workerId)
    if (!worker) throw new NotFoundError('分包人员不存在')
    const assignee = await resolveSubcontractAssignee(workerId)

    const contractAmount =
      body.contractAmount === undefined
        ? Number(existingContract.contractAmount)
        : Number(body.contractAmount)
    if (contractAmount <= 0) {
      throw new BadRequestError('合同金额必须大于 0')
    }

    const changedAmount =
      body.changedAmount === undefined
        ? Number(existingContract.changedAmount)
        : Number(body.changedAmount)
    const payableAmount = contractAmount + changedAmount
    const unpaidAmount = payableAmount - Number(existingContract.paidAmount)

    const updateData: any = {
      projectId,
      constructionId,
      ...(assignee.workerId ? { workerId: assignee.workerId } : {}),
      ...(assignee.vendorId ? { vendorId: assignee.vendorId } : {}),
      contractAmount,
      changedAmount,
      payableAmount,
      unpaidAmount,
      updatedAt: new Date(),
    }

    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim()
      if (!name) throw new BadRequestError('合同名称不能为空')
      updateData.name = name
    }
    if (body.signDate !== undefined) {
      updateData.signDate = body.signDate ? new Date(body.signDate) : null
    }
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.subcontractType !== undefined) {
      updateData.subcontractType = String(body.subcontractType ?? '').trim() || null
    }
    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = String(body.attachmentUrl ?? '').trim() || null
    }
    if (body.remark !== undefined) {
      updateData.remark = String(body.remark ?? '').trim() || null
    }

    await updateCompatRecord('SubcontractContract', id, updateData)
    const contract = await db.subcontractContract.findFirst({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        ...(supportsWorkerId ? { workerId: true } : {}),
        vendorId: true,
        Project: { select: { id: true, name: true } },
        ConstructionApproval: { select: { id: true, name: true } },
        ...(supportsWorkerId
          ? { LaborWorker: { select: { id: true, name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } } }
          : {}),
        SubcontractVendor: { select: { id: true, name: true, phone: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        changedAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        status: true,
        signDate: true,
        startDate: true,
        endDate: true,
        attachmentUrl: true,
        subcontractType: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!contract) throw new NotFoundError('分包合同不存在')

    return success(toResponse({ ...contract, workerId: (contract as any).workerId ?? null, LaborWorker: (contract as any).LaborWorker ?? null }))
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()
    if (!id) throw new BadRequestError('缺少合同 ID')

    const contract = await assertDirectRecordInCurrentRegion('subcontractContract', id)
    if (!contract) throw new NotFoundError('分包合同不存在')

    try {
      assertEditable(contract.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const paymentCount = await db.subcontractPayment.count({
      where: { contractId: id },
    })
    if (paymentCount > 0) {
      throw new ConflictError('该分包合同已产生付款记录，无法删除')
    }

    await deleteCompatRecord('SubcontractContract', id)

    return success({ message: '分包合同已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler
