import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { insertCompatRecord } from '@/lib/db-write-compat'
import { assertProjectInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId')
      const keyword = searchParams.get('keyword')
      const supportsRegionId = await hasDbColumn('OtherReceipt', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const where: any = supportsRegionId ? { regionId } : {}

      if (projectId) where.projectId = projectId
      if (keyword) where.receiptType = { contains: keyword }

      const records = await db.otherReceipt.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          Project: { select: { name: true } },
          ...(supportsRegionId ? { regionId: true } : {}),
          receiptType: true,
          receiptAmount: true,
          receiptDate: true,
          receiptMethod: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { receiptDate: 'desc' },
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
      const supportsRegionId = await hasDbColumn('OtherReceipt', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const projectId = String(body.projectId ?? '').trim()
      const receiptType = String(body.receiptType ?? '').trim()
      const receiptDate = String(body.receiptDate ?? '').trim()
      const receiptAmount = Number(body.receiptAmount ?? 0)

      if (!projectId) throw new BadRequestError('项目为必填项')
      if (!receiptType) throw new BadRequestError('收款事由为必填项')
      if (!receiptDate) throw new BadRequestError('日期为必填项')
      if (!Number.isFinite(receiptAmount) || receiptAmount <= 0) throw new BadRequestError('金额必须大于0')

      const project = await assertProjectInCurrentRegion(projectId)
      if (!project) throw new NotFoundError('项目不存在')

      const now = new Date()
      const id = crypto.randomUUID()
      await insertCompatRecord('OtherReceipt', {
        id,
        projectId,
        ...(supportsRegionId ? { regionId } : {}),
        receiptType,
        receiptAmount,
        receiptDate: new Date(receiptDate),
        receiptMethod: String(body.receiptMethod ?? '').trim() || null,
        attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
        remark: String(body.remark ?? '').trim() || null,
        updatedAt: now,
      })

      return success({ id })
    },
  },
  {
    resource: 'other-receipts',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
