import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { db } from '@/lib/db'
import {
  assertConstructionApprovalInCurrentRegion,
  buildProjectRelationRegionWhere,
  requireCurrentRegionId,
} from '@/lib/region'
import { hasDbColumn } from '@/lib/db-column-compat'
import { insertCompatRecord } from '@/lib/db-write-compat'
import type { ExpenseCategory } from '@prisma/client'
import { assertApprovedUpstream } from '@/lib/approval-gates'

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

export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId')
      const regionId = await requireCurrentRegionId()
      const where: any = buildProjectRelationRegionWhere(regionId, projectId || undefined)
      const supportsConstructionId = await hasDbColumn('ProjectExpense', 'constructionId')

      const records = await db.projectExpense.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          Project: { select: { name: true } },
          ...(supportsConstructionId ? { constructionId: true } : {}),
          ...(supportsConstructionId ? { ConstructionApproval: { select: { name: true } } } : {}),
          submitter: true,
          totalAmount: true,
          expenseItems: true,
          expenseDate: true,
          attachmentUrl: true,
          approvalStatus: true,
          approvedAt: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { expenseDate: 'desc' },
      })

      return success(
        records.map((record) => ({
          ...record,
          projectName: record.Project?.name,
          constructionName: (record as any).ConstructionApproval?.name ?? null,
          expenseItems: record.expenseItems ? JSON.parse(record.expenseItems) : [],
        }))
      )
    },

    POST: async (req) => {
      const body = await req.json()
      const constructionId = String(body.constructionId ?? '').trim()
      if (!constructionId) throw new BadRequestError('施工立项为必填项')
      if (!body.submitter?.trim()) throw new BadRequestError('报销人为必填项')
      if (!body.expenseDate) throw new BadRequestError('日期为必填项')

      const construction = await resolveApprovedConstruction(constructionId)
      const items = normalizeExpenseItems(body.expenseItems)
      if (items.length === 0) {
        throw new BadRequestError('请至少填写一条有效费用明细')
      }

      if (body.projectId && body.projectId !== construction.projectId) {
        throw new BadRequestError('施工立项与项目不匹配')
      }

      const supportsConstructionId = await hasDbColumn('ProjectExpense', 'constructionId')
      const totalAmount = items.reduce(
        (sum: number, item: { type: string; amount: number }) => sum + item.amount,
        0
      )

      const id = crypto.randomUUID()
      await insertCompatRecord('ProjectExpense', {
        id,
        projectId: construction.projectId,
        ...(supportsConstructionId ? { constructionId: construction.id } : {}),
        category: mapExpenseCategory(items[0].type),
        expenseAmount: totalAmount,
        expenseDate: new Date(body.expenseDate),
        submitter: body.submitter.trim(),
        totalAmount,
        expenseItems: JSON.stringify(items),
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'DRAFT',
        updatedAt: new Date(),
      })
      return success({ id })
    },
  },
  { resource: 'project-expenses', resourceIdExtractor: (_req, result) => result?.data?.id || null }
)
