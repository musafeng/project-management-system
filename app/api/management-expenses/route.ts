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

export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId')
      const supportsRegionId = await hasDbColumn('ManagementExpense', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null

      const records = await db.managementExpense.findMany({
        where: {
          ...(supportsRegionId ? { regionId } : {}),
          ...(projectId ? { projectId } : {}),
        },
        select: {
          id: true,
          ...(supportsRegionId ? { regionId: true } : {}),
          projectId: true,
          Project: { select: { name: true } },
          submitter: true,
          totalAmount: true,
          expenseItems: true,
          expenseDate: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { expenseDate: 'desc' },
      })

      return success(
        records.map((record) => ({
          ...record,
          projectName: record.Project?.name ?? null,
          expenseItems: record.expenseItems ? JSON.parse(record.expenseItems) : [],
        }))
      )
    },

    POST: async (req) => {
      const body = await req.json()
      const supportsRegionId = await hasDbColumn('ManagementExpense', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const projectId = String(body.projectId ?? '').trim()
      const submitter = String(body.submitter ?? '').trim()
      const expenseDate = String(body.expenseDate ?? '').trim()
      const expenseItems = normalizeExpenseItems(body.expenseItems)
      const totalAmount = expenseItems.reduce(
        (sum: number, item: { type: string; amount: number }) => sum + item.amount,
        0
      )

      if (!projectId) throw new BadRequestError('项目为必填项')
      if (!submitter) throw new BadRequestError('报销人为必填项')
      if (!expenseDate) throw new BadRequestError('日期为必填项')
      if (expenseItems.length === 0 || totalAmount <= 0) {
        throw new BadRequestError('请至少填写一条有效费用明细')
      }

      const project = await assertProjectInCurrentRegion(projectId)
      if (!project) throw new NotFoundError('项目不存在')

      const now = new Date()
      const id = crypto.randomUUID()
      await insertCompatRecord('ManagementExpense', {
        id,
        ...(supportsRegionId ? { regionId } : {}),
        projectId,
        category: String(body.category ?? '').trim() || expenseItems[0].type,
        expenseDate: new Date(expenseDate),
        expenseAmount: totalAmount,
        submitter,
        totalAmount,
        expenseItems: JSON.stringify(expenseItems),
        attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
        remark: String(body.remark ?? '').trim() || null,
        updatedAt: now,
      })

      return success({ id })
    },
  },
  {
    resource: 'management-expenses',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
