import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { assertProjectInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId')
      const supportsRegionId = await hasDbColumn('PettyCash', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null

      const records = await db.pettyCash.findMany({
        where: {
          ...(supportsRegionId ? { regionId } : {}),
          ...(projectId ? { projectId } : {}),
        },
        select: {
          id: true,
          ...(supportsRegionId ? { regionId: true } : {}),
          projectId: true,
          Project: { select: { name: true } },
          holder: true,
          applyReason: true,
          issuedAmount: true,
          returnedAmount: true,
          issueDate: true,
          returnDate: true,
          status: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { issueDate: 'desc' },
      })

      return success(
        records.map((record) => ({
          ...record,
          projectName: record.Project?.name ?? null,
        }))
      )
    },

    POST: async (req) => {
      const body = await req.json()
      const supportsRegionId = await hasDbColumn('PettyCash', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const projectId = String(body.projectId ?? '').trim() || null
      const holder = String(body.holder ?? '').trim()
      const issueDate = String(body.issueDate ?? '').trim()
      const issuedAmount = Number(body.issuedAmount ?? 0)

      if (!holder) throw new BadRequestError('申请人为必填项')
      if (!issueDate) throw new BadRequestError('日期为必填项')
      if (!Number.isFinite(issuedAmount) || issuedAmount <= 0) throw new BadRequestError('金额必须大于0')

      if (projectId) {
        const project = await assertProjectInCurrentRegion(projectId)
        if (!project) throw new NotFoundError('项目不存在')
      }

      const now = new Date()
      const record = await db.pettyCash.create({
        data: {
          id: crypto.randomUUID(),
          ...(supportsRegionId ? { regionId } : {}),
          projectId,
          holder,
          applyReason: String(body.applyReason ?? '').trim() || null,
          description: String(body.description ?? '').trim() || null,
          issuedAmount,
          issueDate: new Date(issueDate),
          attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
          remark: String(body.remark ?? '').trim() || null,
          status: 'ISSUED',
          updatedAt: now,
        },
        select: { id: true },
      })

      return success(record)
    },
  },
  {
    resource: 'petty-cashes',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
