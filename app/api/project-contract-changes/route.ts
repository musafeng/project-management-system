import { apiHandlerWithPermissionAndLog, success } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { createProjectContractChangeRecord } from '@/lib/project-contract-changes'
import { requireCurrentRegionId } from '@/lib/region'

function toResponse(change: {
  id: string
  contractId: string
  regionId: string | null
  changeDate: Date | null
  changeType: string
  changeAmount: Prisma.Decimal | number
  increaseAmount: Prisma.Decimal | number | null
  originalAmount: Prisma.Decimal | number | null
  totalAmount: Prisma.Decimal | number | null
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
  }
}

export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const contractId = searchParams.get('contractId')
      const projectId = searchParams.get('projectId')

      const regionId = await requireCurrentRegionId()
      const where: any = {}
      where.regionId = regionId
      if (contractId) where.contractId = contractId
      if (projectId) {
        where.ProjectContract = { projectId }
      }

      const rows = await db.projectContractChange.findMany({
        where,
        select: {
          id: true,
          contractId: true,
          regionId: true,
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
        },
        orderBy: [{ changeDate: 'desc' }, { createdAt: 'desc' }],
      })

      return success(rows.map(toResponse))
    },

    POST: async (req) => {
      const body = await req.json()
      const row = await createProjectContractChangeRecord({
        contractId: body.contractId,
        changeDate: body.changeDate,
        increaseAmount: body.increaseAmount ?? body.changeAmount,
        remark: body.remark,
        attachmentUrl: body.attachmentUrl,
      })

      return success(toResponse(row))
    },
  },
  {
    resource: 'project-contract-changes',
    resourceIdExtractor: (_req, result) => result?.data?.id ?? null,
  }
)
