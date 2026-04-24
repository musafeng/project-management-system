import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api'
import { assertEditable } from '@/lib/approval'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { deleteCompatRecord, updateCompatRecord } from '@/lib/db-write-compat'
import { assertDirectRecordInCurrentRegion } from '@/lib/region'

export const dynamic = 'force-dynamic'


function getIdFromRequest(req: Request) {
  return new URL(req.url).pathname.split('/').pop() ?? ''
}

function toResponse(change: {
  id: string
  contractId: string
  regionId?: string | null
  changeDate: Date | null
  changeType: string
  changeAmount: any
  increaseAmount: any
  originalAmount: any
  totalAmount: any
  attachmentUrl: string | null
  remark: string | null
  approvalStatus: string
  approvedAt: Date | null
  rejectedReason: string | null
  ProjectContract: {
    code: string
    name: string
    projectId: string
    Project: { name: string }
  }
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: change.id,
    contractId: change.contractId,
    regionId: change.regionId,
    contractCode: change.ProjectContract.code,
    contractName: change.ProjectContract.name,
    projectId: change.ProjectContract.projectId,
    projectName: change.ProjectContract.Project.name,
    changeDate: change.changeDate,
    changeType: change.changeType,
    changeAmount: change.changeAmount,
    increaseAmount: change.increaseAmount,
    originalAmount: change.originalAmount,
    totalAmount: change.totalAmount,
    attachmentUrl: change.attachmentUrl,
    remark: change.remark,
    approvalStatus: change.approvalStatus,
    approvedAt: change.approvedAt,
    rejectedReason: change.rejectedReason,
    createdAt: change.createdAt,
    updatedAt: change.updatedAt,
  }
}

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const id = getIdFromRequest(req)
      const supportsRegionId = await hasDbColumn('ProjectContractChange', 'regionId')
      await assertDirectRecordInCurrentRegion('projectContractChange', id)
      const row = await db.projectContractChange.findFirst({
        where: { id },
        select: {
          id: true,
          contractId: true,
          ...(supportsRegionId ? { regionId: true } : {}),
          changeDate: true,
          changeType: true,
          changeAmount: true,
          increaseAmount: true,
          originalAmount: true,
          totalAmount: true,
          attachmentUrl: true,
          remark: true,
          approvalStatus: true,
          approvedAt: true,
          rejectedReason: true,
          ProjectContract: {
            select: {
              code: true,
              name: true,
              projectId: true,
              Project: { select: { name: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      })
      if (!row) throw new NotFoundError('合同变更不存在')
      return success(toResponse(row))
    },

    PUT: async (req) => {
      const id = getIdFromRequest(req)
      const body = await req.json()
      const existing = await assertDirectRecordInCurrentRegion('projectContractChange', id)
      if (!existing) throw new NotFoundError('合同变更不存在')
      try {
        assertEditable(existing.approvalStatus, existing.approvedAt)
      } catch (error) {
        throw new ForbiddenError(error instanceof Error ? error.message : '当前单据无法修改')
      }

      const contractId = String(body.contractId ?? existing.contractId).trim()
      const contract = await db.projectContract.findUnique({
        where: { id: contractId },
        select: { id: true, contractAmount: true, regionId: true },
      })
      if (!contract) throw new NotFoundError('项目合同不存在')
      if (existing.regionId && contract.regionId !== existing.regionId) {
        throw new ForbiddenError('项目合同不属于当前区域')
      }

      const increaseAmount =
        body.increaseAmount === undefined
          ? Number(existing.increaseAmount ?? existing.changeAmount)
          : Number(body.increaseAmount)
      if (increaseAmount <= 0) throw new BadRequestError('增项金额必须大于 0')

      const remark =
        body.remark === undefined ? String(existing.remark ?? '') : String(body.remark ?? '').trim()
      const attachmentUrl =
        body.attachmentUrl === undefined
          ? String(existing.attachmentUrl ?? '')
          : String(body.attachmentUrl ?? '').trim()

      if (!remark) throw new BadRequestError('备注为必填项')
      if (!attachmentUrl) throw new BadRequestError('附件为必填项')

      const originalAmount = Number(contract.contractAmount)
      const totalAmount = originalAmount + increaseAmount

      await updateCompatRecord('ProjectContractChange', id, {
        contractId,
        changeDate: body.changeDate ? new Date(body.changeDate) : existing.changeDate,
        changeAmount: increaseAmount,
        increaseAmount,
        originalAmount,
        totalAmount,
        changeReason: remark,
        remark,
        attachmentUrl,
        updatedAt: new Date(),
      })

      const row = await db.projectContractChange.findFirst({
        where: { id },
        select: {
          id: true,
          contractId: true,
          ...(await hasDbColumn('ProjectContractChange', 'regionId') ? { regionId: true } : {}),
          changeDate: true,
          changeType: true,
          changeAmount: true,
          increaseAmount: true,
          originalAmount: true,
          totalAmount: true,
          attachmentUrl: true,
          remark: true,
          approvalStatus: true,
          approvedAt: true,
          rejectedReason: true,
          ProjectContract: {
            select: {
              code: true,
              name: true,
              projectId: true,
              Project: { select: { name: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      })
      if (!row) throw new NotFoundError('合同变更不存在')

      return success(toResponse(row))
    },

    DELETE: async (req) => {
      const id = getIdFromRequest(req)
      const existing = await assertDirectRecordInCurrentRegion('projectContractChange', id)
      if (!existing) throw new NotFoundError('合同变更不存在')
      try {
        assertEditable(existing.approvalStatus, existing.approvedAt)
      } catch (error) {
        throw new ForbiddenError(error instanceof Error ? error.message : '当前单据无法修改')
      }

      await deleteCompatRecord('ProjectContractChange', id)
      return success({ id })
    },
  },
  {
    resource: 'project-contract-changes',
    resourceIdExtractor: (_req, result) => result?.data?.id ?? null,
  }
)
