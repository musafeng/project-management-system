import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  assertConstructionApprovalInCurrentRegion,
  assertProjectInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'

export const dynamic = 'force-dynamic'


function toResponse(contract: {
  id: string
  code: string
  name: string
  projectId: string
  constructionId: string
  supplierId: string
  Project: { name: string }
  ConstructionApproval: { name: string }
  Supplier: { name: string; phone: string | null; bankAccount: string | null; bankName: string | null }
  contractAmount: Prisma.Decimal | number
  payableAmount: Prisma.Decimal | number
  paidAmount: Prisma.Decimal | number
  unpaidAmount: Prisma.Decimal | number
  signDate: Date | null
  materialCategory?: string | null
  attachmentUrl?: string | null
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
    supplierId: contract.supplierId,
    projectName: contract.Project.name,
    constructionName: contract.ConstructionApproval.name,
    supplierName: contract.Supplier.name,
    supplierPhone: contract.Supplier.phone,
    supplierBankAccount: contract.Supplier.bankAccount,
    supplierBankName: contract.Supplier.bankName,
    contractAmount: contract.contractAmount,
    payableAmount: contract.payableAmount,
    paidAmount: contract.paidAmount,
    unpaidAmount: contract.unpaidAmount,
    signDate: contract.signDate,
    materialCategory: contract.materialCategory ?? null,
    attachmentUrl: contract.attachmentUrl ?? null,
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

    const contracts = await db.procurementContract.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        supplierId: true,
        Project: { select: { name: true } },
        ConstructionApproval: { select: { name: true } },
        Supplier: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        materialCategory: true,
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
    if (!body.supplierId || typeof body.supplierId !== 'string') {
      throw new BadRequestError('供应商 ID 为必填项')
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

    const supplier = await db.supplier.findUnique({
      where: { id: body.supplierId },
      select: { id: true, name: true, phone: true, bankAccount: true, bankName: true },
    })
    if (!supplier) throw new NotFoundError('供应商不存在')

    const code = `PROC${Date.now()}`
    const regionId = await requireCurrentRegionId()
    const createData: Prisma.ProcurementContractUncheckedCreateInput = {
      id: crypto.randomUUID(),
      code,
      name: body.name.trim(),
      projectId: body.projectId,
      constructionId: body.constructionId,
      supplierId: body.supplierId,
      contractAmount: body.contractAmount,
      changedAmount: 0,
      payableAmount: body.contractAmount,
      paidAmount: 0,
      unpaidAmount: body.contractAmount,
      signDate: body.signDate ? new Date(body.signDate) : null,
      status: 'DRAFT',
      materialCategory: body.materialCategory?.trim() || null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      remark: body.remark?.trim() || null,
      regionId,
      updatedAt: new Date(),
    }
    const contract = await db.procurementContract.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        supplierId: true,
        Project: { select: { name: true } },
        ConstructionApproval: { select: { name: true } },
        Supplier: { select: { name: true, phone: true, bankAccount: true, bankName: true } },
        contractAmount: true,
        payableAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        signDate: true,
        materialCategory: true,
        attachmentUrl: true,
        remark: true,
        approvalStatus: true,
        createdAt: true,
      },
    })

    return success(toResponse(contract))
  },
}, {
  resource: 'procurement-contracts',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
