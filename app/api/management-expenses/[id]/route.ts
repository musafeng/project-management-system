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

export const dynamic = 'force-dynamic'


function getIdFromRequest(req: Request) {
  return new URL(req.url).pathname.split('/').pop() ?? ''
}

function normalizeExpenseItems(items: unknown) {
  if (!Array.isArray(items)) return []

  return items
    .map((item: any) => {
      const type = String(item?.type ?? '').trim()
      const amount = Number(item?.amount ?? 0)
      if (!type || amount <= 0) return null
      return {
        type,
        amount,
        remark: String(item?.remark ?? '').trim() || null,
        attachmentUrl: String(item?.attachmentUrl ?? '').trim() || null,
      }
    })
    .filter(
      (
        item: {
          type: string
          amount: number
          remark: string | null
          attachmentUrl: string | null
        } | null
      ): item is {
        type: string
        amount: number
        remark: string | null
        attachmentUrl: string | null
      } => item !== null
    )
}

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const id = getIdFromRequest(req)
      const regionId = await requireCurrentRegionId()
      const record = await db.managementExpense.findFirst({
        where: { id, regionId },
        include: { Project: { select: { name: true } } },
      })

      if (!record) throw new NotFoundError('记录不存在')

      return success({
        ...record,
        projectName: record.Project?.name ?? null,
        expenseItems: record.expenseItems ? JSON.parse(record.expenseItems) : [],
      })
    },

    PUT: async (req) => {
      const id = getIdFromRequest(req)
      const body = await req.json()
      const existing = await assertDirectRecordInCurrentRegion('managementExpense', id)

      if (!existing) throw new NotFoundError('记录不存在')

      const projectId =
        body.projectId === undefined
          ? existing.projectId
          : String(body.projectId ?? '').trim() || null
      const submitter =
        body.submitter === undefined
          ? existing.submitter
          : String(body.submitter ?? '').trim()

      if (!submitter) throw new BadRequestError('报销人为必填项')
      if (projectId) {
        await assertProjectInCurrentRegion(projectId)
      }

      let expenseItems = existing.expenseItems ? JSON.parse(existing.expenseItems) : []
      let totalAmount = Number(existing.totalAmount ?? existing.expenseAmount ?? 0)

      if (body.expenseItems !== undefined) {
        expenseItems = normalizeExpenseItems(body.expenseItems)
        totalAmount = expenseItems.reduce(
          (sum: number, item: { type: string; amount: number }) => sum + item.amount,
          0
        )

        if (expenseItems.length === 0 || totalAmount <= 0) {
          throw new BadRequestError('请至少填写一条有效费用明细')
        }
      }

      const updated = await db.managementExpense.update({
        where: { id },
        data: {
          projectId,
          submitter,
          category:
            String(body.category ?? '').trim() || expenseItems[0]?.type || existing.category,
          expenseDate: body.expenseDate
            ? new Date(String(body.expenseDate))
            : existing.expenseDate,
          totalAmount,
          expenseAmount: totalAmount,
          expenseItems: JSON.stringify(expenseItems),
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
      const existing = await assertDirectRecordInCurrentRegion('managementExpense', id)

      if (!existing) throw new NotFoundError('记录不存在')

      await db.managementExpense.delete({ where: { id } })
      return success({ id })
    },
  },
  {
    resource: 'management-expenses',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
