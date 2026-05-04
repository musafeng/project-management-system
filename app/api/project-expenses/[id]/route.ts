import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  success,
} from '@/lib/api'
import { assertEditable } from '@/lib/approval'
import { assertApprovedUpstream } from '@/lib/approval-gates'
import { db } from '@/lib/db'
import { deleteCompatRecord, updateCompatRecord } from '@/lib/db-write-compat'
import {
  assertConstructionApprovalInCurrentRegion,
  assertProjectScopedRecordInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'
import { hasDbColumn } from '@/lib/db-column-compat'
import type { ExpenseCategory } from '@prisma/client'

export const dynamic = 'force-dynamic'


const ALLOWED_EXPENSE_TYPES = new Set(['辅料', '人工', '材料'])

function mapExpenseCategory(type: string): ExpenseCategory {
  if (type === '人工') return 'LABOR'
  if (type === '辅料' || type === '材料') return 'MATERIAL'
  return 'OTHER'
}

function normalizeExpenseItems(items: unknown) {
  if (!Array.isArray(items)) return []

  return items
    .map((item: any) => {
      const type = String(item?.type ?? '').trim()
      const amount = Number(item?.amount ?? 0)
      if (!ALLOWED_EXPENSE_TYPES.has(type) || amount <= 0) return null
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

async function resolveApprovedConstruction(constructionId: string) {
  const construction = await assertConstructionApprovalInCurrentRegion(constructionId)
  if (!construction) throw new NotFoundError('施工立项不存在')
  assertApprovedUpstream(construction, '施工立项')
  return construction
}

function getIdFromRequest(req: Request) {
  return new URL(req.url).pathname.split('/').pop() ?? ''
}

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const id = getIdFromRequest(req)
      const regionId = await requireCurrentRegionId()
      const supportsConstructionId = await hasDbColumn('ProjectExpense', 'constructionId')
      const record = await db.projectExpense.findFirst({
        where: { id, Project: { regionId } },
        include: {
          Project: { select: { name: true } },
          ...(supportsConstructionId ? { ConstructionApproval: { select: { name: true } } } : {}),
        },
      })
      if (!record) throw new NotFoundError('记录不存在')
      return success({
        ...record,
        projectName: record.Project?.name ?? null,
        constructionName: (record as any).ConstructionApproval?.name ?? null,
        expenseItems: record.expenseItems ? JSON.parse(record.expenseItems) : [],
      })
    },

    PUT: async (req) => {
      const id = getIdFromRequest(req)
      const body = await req.json()
      const existing = await assertProjectScopedRecordInCurrentRegion('projectExpense', id)
      if (!existing) throw new NotFoundError('记录不存在')
      try {
        assertEditable(existing.approvalStatus, existing.approvedAt)
      } catch (error) {
        throw new ForbiddenError(error instanceof Error ? error.message : '当前单据无法修改')
      }
      const supportsConstructionId = await hasDbColumn('ProjectExpense', 'constructionId')

      const constructionId = String(body.constructionId ?? existing.constructionId ?? '').trim()
      if (!constructionId) throw new BadRequestError('施工立项为必填项')

      const construction = await resolveApprovedConstruction(constructionId)
      if (body.projectId && body.projectId !== construction.projectId) {
        throw new BadRequestError('施工立项与项目不匹配')
      }

      let items = existing.expenseItems ? JSON.parse(existing.expenseItems) : []
      if (body.expenseItems !== undefined) {
        items = normalizeExpenseItems(body.expenseItems)
        if (items.length === 0) {
          throw new BadRequestError('请至少填写一条有效费用明细')
        }
      }

      const totalAmount = items.reduce(
        (sum: number, item: { type: string; amount: number }) => sum + item.amount,
        0
      )

      await updateCompatRecord('ProjectExpense', id, {
        projectId: construction.projectId,
        ...(supportsConstructionId ? { constructionId: construction.id } : {}),
        submitter: body.submitter?.trim() ?? existing.submitter,
        category: items[0] ? mapExpenseCategory(items[0].type) : existing.category,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : existing.expenseDate,
        totalAmount,
        expenseAmount: totalAmount,
        expenseItems: JSON.stringify(items),
        attachmentUrl:
          body.attachmentUrl === undefined
            ? existing.attachmentUrl
            : body.attachmentUrl?.trim() || null,
        remark:
          body.remark === undefined ? existing.remark : body.remark?.trim() || null,
      })
      return success({ id })
    },

    DELETE: async (req) => {
      const id = getIdFromRequest(req)
      const existing = await assertProjectScopedRecordInCurrentRegion('projectExpense', id)
      if (!existing) throw new NotFoundError('记录不存在')
      try {
        assertEditable(existing.approvalStatus, existing.approvedAt)
      } catch (error) {
        throw new ForbiddenError(error instanceof Error ? error.message : '当前单据无法删除')
      }
      await deleteCompatRecord('ProjectExpense', id)
      return success({ id })
    },
  },
  {
    resource: 'project-expenses',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
