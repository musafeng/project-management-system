import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertEditable } from '@/lib/approval'
import {
  assertConstructionApprovalInCurrentRegion,
  assertDirectRecordInCurrentRegion,
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
  Project: { id: string; name: string }
  ConstructionApproval: { id: string; name: string }
  Supplier: { id: string; name: string; phone: string | null; bankAccount: string | null; bankName: string | null }
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
  materialCategory: string | null
  remark: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: contract.id,
    code: contract.code,
    name: contract.name,
    projectId: contract.projectId,
    projectName: contract.Project.name,
    constructionId: contract.constructionId,
    constructionName: contract.ConstructionApproval.name,
    supplierId: contract.supplierId,
    supplierName: contract.Supplier.name,
    supplierPhone: contract.Supplier.phone,
    supplierBankAccount: contract.Supplier.bankAccount,
    supplierBankName: contract.Supplier.bankName,
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
    materialCategory: contract.materialCategory,
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
    const contract = await db.procurementContract.findFirst({
      where: { id, regionId },
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        supplierId: true,
        Project: { select: { id: true, name: true } },
        ConstructionApproval: { select: { id: true, name: true } },
        Supplier: { select: { id: true, name: true, phone: true, bankAccount: true, bankName: true } },
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
        materialCategory: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!contract) throw new NotFoundError('采购合同不存在')

    return success(toResponse(contract))
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()
    if (!id) throw new BadRequestError('缺少合同 ID')

    const body = await req.json()
    const existingContract = await assertDirectRecordInCurrentRegion('procurementContract', id)
    if (!existingContract) throw new NotFoundError('采购合同不存在')

    try {
      assertEditable(existingContract.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const projectId =
      body.projectId === undefined ? existingContract.projectId : String(body.projectId ?? '').trim()
    const constructionId =
      body.constructionId === undefined ? existingContract.constructionId : String(body.constructionId ?? '').trim()
    const supplierId =
      body.supplierId === undefined ? existingContract.supplierId : String(body.supplierId ?? '').trim()

    if (!projectId) throw new BadRequestError('项目为必填项')
    if (!constructionId) throw new BadRequestError('施工立项为必填项')
    if (!supplierId) throw new BadRequestError('供应商为必填项')

    await assertProjectInCurrentRegion(projectId)
    const construction = await assertConstructionApprovalInCurrentRegion(constructionId)
    if (construction.projectId !== projectId) {
      throw new BadRequestError('施工立项不属于该项目')
    }
    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    })
    if (!supplier) throw new NotFoundError('供应商不存在')

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
      supplierId,
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
    if (body.materialCategory !== undefined) {
      updateData.materialCategory = String(body.materialCategory ?? '').trim() || null
    }
    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = String(body.attachmentUrl ?? '').trim() || null
    }
    if (body.remark !== undefined) {
      updateData.remark = String(body.remark ?? '').trim() || null
    }

    const contract = await db.procurementContract.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        constructionId: true,
        supplierId: true,
        Project: { select: { id: true, name: true } },
        ConstructionApproval: { select: { id: true, name: true } },
        Supplier: { select: { id: true, name: true, phone: true, bankAccount: true, bankName: true } },
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
        materialCategory: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success(toResponse(contract))
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) throw new BadRequestError('缺少合同 ID')

    const contract = await assertDirectRecordInCurrentRegion('procurementContract', id)
    if (!contract) throw new NotFoundError('采购合同不存在')

    try {
      assertEditable(contract.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const paymentCount = await db.procurementPayment.count({
      where: { contractId: id },
    })
    if (paymentCount > 0) {
      throw new ConflictError('该采购合同已产生付款记录，无法删除')
    }

    await db.procurementContract.delete({
      where: { id },
    })

    return success({ message: '采购合同已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler
