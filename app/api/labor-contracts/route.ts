import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  assertConstructionApprovalInCurrentRegion,
  assertProjectInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'

function toResponse(contract: {
  id: string
  code: string
  name: string
  projectId: string
  constructionId: string
  workerId: string
  Project: { name: string }
  ConstructionApproval: { name: string }
  LaborWorker: {
    name: string
    phone: string | null
    idNumber: string | null
    bankAccount: string | null
    bankName: string | null
  }
  contractAmount: Prisma.Decimal | number
  payableAmount: Prisma.Decimal | number
  paidAmount: Prisma.Decimal | number
  unpaidAmount: Prisma.Decimal | number
  signDate: Date | null
  attachmentUrl?: string | null
  laborType?: string | null
  remark?: string | null
  approvalStatus: string
  createdAt: Date
}) {
  return {
    id: contract.id,
    code: contract.code,
    name: contract.name,
    projectId: contract.projectId,
    constructionId: contract.constructionId,
    workerId: contract.workerId,
    projectName: contract.Project.name,
    constructionName: contract.ConstructionApproval.name,
    laborWorkerName: contract.LaborWorker.name,
    laborWorkerPhone: contract.LaborWorker.phone,
    laborWorkerIdNumber: contract.LaborWorker.idNumber,
    laborWorkerBankAccount: contract.LaborWorker.bankAccount,
    laborWorkerBankName: contract.LaborWorker.bankName,
    contractAmount: contract.contractAmount,
    payableAmount: contract.payableAmount,
    paidAmount: contract.paidAmount,
    unpaidAmount: contract.unpaidAmount,
    signDate: contract.signDate,
    attachmentUrl: contract.attachmentUrl ?? null,
    laborType: contract.laborType ?? null,
    remark: contract.remark ?? null,
    approvalStatus: contract.approvalStatus,
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

    const contracts = await db.laborContract.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        workerId: true,
        Project: { select: { name: true } },
        ConstructionApproval: { select: { name: true } },
        LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        laborType: true,
        attachmentUrl: true,
        remark: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return success(contracts.map(toResponse))
  },

  POST: async (req) => {
    const body = await req.json()

    if (!body.projectId || typeof body.projectId !== 'string') {
      throw new BadRequestError('项目 ID 为必填项')
    }
    if (!body.constructionId || typeof body.constructionId !== 'string') {
      throw new BadRequestError('施工立项 ID 为必填项')
    }
    if (!body.laborWorkerId || typeof body.laborWorkerId !== 'string') {
      throw new BadRequestError('劳务人员 ID 为必填项')
    }
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestError('合同名称为必填项')
    }
    if (body.contractAmount === undefined || typeof body.contractAmount !== 'number') {
      throw new BadRequestError('合同金额为必填项且必须是数字')
    }
    if (body.contractAmount <= 0) {
      throw new BadRequestError('合同金额必须大于 0')
    }

    const project = await assertProjectInCurrentRegion(body.projectId)
    if (!project) throw new NotFoundError('项目不存在')

    const construction = await assertConstructionApprovalInCurrentRegion(body.constructionId)
    if (!construction) throw new NotFoundError('施工立项不存在')
    if (construction.projectId !== body.projectId) {
      throw new BadRequestError('施工立项不属于该项目')
    }

    const worker = await db.laborWorker.findUnique({
      where: { id: body.laborWorkerId },
      select: { id: true, name: true, phone: true, idNumber: true, bankAccount: true, bankName: true },
    })
    if (!worker) throw new NotFoundError('劳务人员不存在')

    const code = `LABOR${Date.now()}`

    const regionId = await requireCurrentRegionId()
    const createData: Prisma.LaborContractUncheckedCreateInput = {
      id: crypto.randomUUID(),
      code,
      name: body.name.trim(),
      projectId: body.projectId,
      constructionId: body.constructionId,
      workerId: body.laborWorkerId,
      contractAmount: body.contractAmount,
      changedAmount: 0,
      payableAmount: body.contractAmount,
      paidAmount: 0,
      unpaidAmount: body.contractAmount,
      signDate: body.signDate ? new Date(body.signDate) : null,
      status: 'DRAFT',
      laborType: body.laborType?.trim() || null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const contract = await db.laborContract.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        workerId: true,
        Project: { select: { name: true } },
        ConstructionApproval: { select: { name: true } },
        LaborWorker: { select: { name: true, phone: true, idNumber: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        laborType: true,
        attachmentUrl: true,
        remark: true,
        approvalStatus: true,
        createdAt: true,
      },
    })

    return success(toResponse(contract))
  },
}, {
  resource: 'labor-contracts',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
