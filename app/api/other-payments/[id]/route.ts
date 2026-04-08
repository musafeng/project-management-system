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
      const record = await db.otherPayment.findFirst({
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
      const existing = await assertDirectRecordInCurrentRegion('otherPayment', id)

      if (!existing) throw new NotFoundError('记录不存在')

      const nextProjectId =
        body.projectId === undefined
          ? existing.projectId
          : String(body.projectId ?? '').trim() || null
      const paymentType =
        body.paymentType === undefined
          ? existing.paymentType
          : String(body.paymentType ?? '').trim()
      const paymentAmount =
        body.paymentAmount === undefined
          ? Number(existing.paymentAmount)
          : Number(body.paymentAmount)

      if (!paymentType) throw new BadRequestError('付款事由为必填项')
      if (paymentAmount <= 0) throw new BadRequestError('金额必须大于0')

      if (nextProjectId) {
        await assertProjectInCurrentRegion(nextProjectId)
      }

      const updated = await db.otherPayment.update({
        where: { id },
        data: {
          projectId: nextProjectId,
          paymentType,
          paymentAmount,
          paymentDate: body.paymentDate
            ? new Date(String(body.paymentDate))
            : existing.paymentDate,
          paymentMethod:
            body.paymentMethod === undefined
              ? existing.paymentMethod
              : String(body.paymentMethod ?? '').trim() || null,
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
      const existing = await assertDirectRecordInCurrentRegion('otherPayment', id)

      if (!existing) throw new NotFoundError('记录不存在')

      await db.otherPayment.delete({ where: { id } })
      return success({ id })
    },
  },
  {
    resource: 'other-payments',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
