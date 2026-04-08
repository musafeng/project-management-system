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
      if (keyword) where.paymentType = { contains: keyword }

      const records = await db.otherPayment.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          Project: { select: { name: true } },
          regionId: true,
          paymentType: true,
          paymentAmount: true,
          paymentDate: true,
          paymentMethod: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { paymentDate: 'desc' },
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
      const paymentType = String(body.paymentType ?? '').trim()
      const paymentDate = String(body.paymentDate ?? '').trim()
      const paymentAmount = Number(body.paymentAmount ?? 0)

      if (!paymentType) throw new BadRequestError('付款事由为必填项')
      if (!paymentDate) throw new BadRequestError('日期为必填项')
      if (paymentAmount <= 0) throw new BadRequestError('金额必须大于0')

      if (projectId) {
        const project = await assertProjectInCurrentRegion(projectId)
        if (!project) throw new NotFoundError('项目不存在')
      }

      const now = new Date()
      const record = await db.otherPayment.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          regionId,
          paymentType,
          paymentAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod: String(body.paymentMethod ?? '').trim() || null,
          attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
          remark: String(body.remark ?? '').trim() || null,
          updatedAt: now,
        },
      })

      return success(record)
    },
  },
  {
    resource: 'other-payments',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
