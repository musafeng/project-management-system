import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { parseDateOnlyForStorage, parseDateOnlyRangeEnd, parseDateOnlyRangeStart } from '@/lib/date-only'
import { db } from '@/lib/db'
import { normalizeExpenseItems } from '@/lib/expense-items'
import { getLowRiskFieldRule, normalizeOptionalProjectId, normalizeOptionalText, validateScopedFieldValue } from '@/lib/low-risk-form-validation'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (projectId) where.projectId = projectId

    const and: any[] = []

    if (keyword) {
      and.push({
        OR: [
          { submitter: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const expenseDate: any = {}
      if (startDate) expenseDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) expenseDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ expenseDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.salesExpense.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        submitter: true, totalAmount: true, expenseItems: true,
        expenseDate: true, attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: [
        { expenseDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    return success(records.map(r => ({
      ...r, projectName: r.project?.name || r.projectId || null,
      expenseItems: r.expenseItems ? JSON.parse(r.expenseItems) : [],
    })))
  },

  POST: async (req) => {
    const body = await req.json()
    const submitter = normalizeOptionalText(body.submitter) || ''
    const submitterError = validateScopedFieldValue(
      getLowRiskFieldRule('sales-expenses', 'submitter')!,
      submitter,
      '报销人为必填项'
    )
    if (submitterError) throw new BadRequestError(submitterError)

    const expenseDate = normalizeOptionalText(body.expenseDate)
    const expenseDateError = validateScopedFieldValue(
      getLowRiskFieldRule('sales-expenses', 'expenseDate')!,
      expenseDate,
      '日期为必填项'
    )
    if (expenseDateError) throw new BadRequestError(expenseDateError)

    const projectId = normalizeOptionalProjectId(body.projectId)
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }

    const normalizedExpenseItems = normalizeExpenseItems(body.expenseItems || [])
    if (normalizedExpenseItems.error) throw new BadRequestError(normalizedExpenseItems.error)
    const items = normalizedExpenseItems.items
    const totalAmount = normalizedExpenseItems.totalAmount

    const record = await db.salesExpense.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId ?? undefined,
        category: body.category || 'OTHER',
        expenseAmount: totalAmount,
        expenseDate: parseDateOnlyForStorage(expenseDate as string),
        submitter,
        totalAmount,
        expenseItems: items.length > 0 ? JSON.stringify(items) : null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
        updatedAt: new Date(),
      },
    })
    return success(record)
  },
}, { resource: 'sales-expenses', resourceIdExtractor: (req, result) => result?.data?.id || null })
