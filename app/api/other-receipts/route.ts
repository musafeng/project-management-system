import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { db } from '@/lib/db'
import { assertProjectInCurrentRegion, requireCurrentRegionId } from '@/lib/region'

export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId')
      const keyword = searchParams.get('keyword')
      const regionId = await requireCurrentRegionId()
      const where: any = { regionId }

      if (projectId) where.projectId = projectId
      if (keyword) where.receiptType = { contains: keyword }

      const records = await db.otherReceipt.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          Project: { select: { name: true } },
          regionId: true,
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
      const regionId = await requireCurrentRegionId()
      const projectId = String(body.projectId ?? '').trim() || null
      const receiptType = String(body.receiptType ?? '').trim()
      const receiptDate = String(body.receiptDate ?? '').trim()
      const receiptAmount = Number(body.receiptAmount ?? 0)

      if (!receiptType) throw new BadRequestError('收款事由为必填项')
      if (!receiptDate) throw new BadRequestError('日期为必填项')
      if (receiptAmount <= 0) throw new BadRequestError('金额必须大于0')

      if (projectId) {
        const project = await assertProjectInCurrentRegion(projectId)
        if (!project) throw new NotFoundError('项目不存在')
      }

      const now = new Date()
      const record = await db.otherReceipt.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          regionId,
          receiptType,
          receiptAmount,
          receiptDate: new Date(receiptDate),
          receiptMethod: String(body.receiptMethod ?? '').trim() || null,
          attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
          remark: String(body.remark ?? '').trim() || null,
          updatedAt: now,
        },
      })

      return success(record)
    },
  },
  {
    resource: 'other-receipts',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
