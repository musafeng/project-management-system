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
import { hasDbColumn } from '@/lib/db-column-compat'

export const dynamic = 'force-dynamic'


function getIdFromRequest(req: Request) {
  return new URL(req.url).pathname.split('/').pop() ?? ''
}

function resolveStatus(issuedAmount: number, returnedAmount: number) {
  if (returnedAmount >= issuedAmount && issuedAmount > 0) return 'RETURNED'
  if (returnedAmount > 0) return 'PARTIAL'
  return 'ISSUED'
}

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const id = getIdFromRequest(req)
      const supportsRegionId = await hasDbColumn('PettyCash', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const record = await db.pettyCash.findFirst({
        where: supportsRegionId ? { id, regionId } : { id },
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
      const existing = await assertDirectRecordInCurrentRegion('pettyCash', id)

      if (!existing) throw new NotFoundError('记录不存在')

      const projectId =
        body.projectId === undefined
          ? existing.projectId
          : String(body.projectId ?? '').trim() || null
      const holder =
        body.holder === undefined ? existing.holder : String(body.holder ?? '').trim()
      const issuedAmount =
        body.issuedAmount === undefined
          ? Number(existing.issuedAmount)
          : Number(body.issuedAmount)
      const returnedAmount =
        body.returnedAmount === undefined
          ? Number(existing.returnedAmount ?? 0)
          : Number(body.returnedAmount)

      if (!holder) throw new BadRequestError('申请人为必填项')
      if (issuedAmount <= 0) throw new BadRequestError('金额必须大于0')
      if (projectId) {
        await assertProjectInCurrentRegion(projectId)
      }

      const updated = await db.pettyCash.update({
        where: { id },
        data: {
          projectId,
          holder,
          applyReason:
            body.applyReason === undefined
              ? existing.applyReason
              : String(body.applyReason ?? '').trim() || null,
          description:
            body.description === undefined
              ? existing.description
              : String(body.description ?? '').trim() || null,
          issuedAmount,
          issueDate: body.issueDate
            ? new Date(String(body.issueDate))
            : existing.issueDate,
          returnedAmount,
          returnDate:
            body.returnDate === undefined
              ? existing.returnDate
              : body.returnDate
                ? new Date(String(body.returnDate))
                : null,
          status: resolveStatus(issuedAmount, returnedAmount),
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
      const existing = await assertDirectRecordInCurrentRegion('pettyCash', id)

      if (!existing) throw new NotFoundError('记录不存在')

      await db.pettyCash.delete({ where: { id } })
      return success({ id })
    },
  },
  {
    resource: 'petty-cashes',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
