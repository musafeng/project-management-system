import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { db } from '@/lib/db'
import {
  assertDirectRecordInCurrentRegion,
  assertProjectInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'

function getIdFromRequest(req: Request) {
  return new URL(req.url).pathname.split('/').pop() ?? ''
}

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const id = getIdFromRequest(req)
      const regionId = await requireCurrentRegionId()
      const record = await db.otherReceipt.findFirst({
        where: { id, regionId },
        include: { Project: { select: { name: true } } },
      })

      if (!record) throw new NotFoundError('记录不存在')

      return success({
        ...record,
        projectName: record.Project?.name ?? null,
      })
    },

    PUT: async (req) => {
      const id = getIdFromRequest(req)
      const body = await req.json()
      const existing = await assertDirectRecordInCurrentRegion('otherReceipt', id)

      if (!existing) throw new NotFoundError('记录不存在')

      const nextProjectId =
        body.projectId === undefined
          ? existing.projectId
          : String(body.projectId ?? '').trim() || null
      const receiptType =
        body.receiptType === undefined
          ? existing.receiptType
          : String(body.receiptType ?? '').trim()
      const receiptAmount =
        body.receiptAmount === undefined
          ? Number(existing.receiptAmount)
          : Number(body.receiptAmount)

      if (!receiptType) throw new BadRequestError('收款事由为必填项')
      if (receiptAmount <= 0) throw new BadRequestError('金额必须大于0')

      if (nextProjectId) {
        await assertProjectInCurrentRegion(nextProjectId)
      }

      const updated = await db.otherReceipt.update({
        where: { id },
        data: {
          projectId: nextProjectId,
          receiptType,
          receiptAmount,
          receiptDate: body.receiptDate
            ? new Date(String(body.receiptDate))
            : existing.receiptDate,
          receiptMethod:
            body.receiptMethod === undefined
              ? existing.receiptMethod
              : String(body.receiptMethod ?? '').trim() || null,
          attachmentUrl:
            body.attachmentUrl === undefined
              ? existing.attachmentUrl
              : String(body.attachmentUrl ?? '').trim() || null,
          remark:
            body.remark === undefined
              ? existing.remark
              : String(body.remark ?? '').trim() || null,
          updatedAt: new Date(),
        },
      })

      return success(updated)
    },

    DELETE: async (req) => {
      const id = getIdFromRequest(req)
      const existing = await assertDirectRecordInCurrentRegion('otherReceipt', id)

      if (!existing) throw new NotFoundError('记录不存在')

      await db.otherReceipt.delete({ where: { id } })
      return success({ id })
    },
  },
  {
    resource: 'other-receipts',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
