import { apiHandlerWithPermissionAndLog, success, NotFoundError, BadRequestError } from '@/lib/api'
import { parseDateOnlyForStorage } from '@/lib/date-only'
import { db } from '@/lib/db'
import { normalizeExpenseItems } from '@/lib/expense-items'
import { getLowRiskFieldRule, normalizeOptionalProjectId, normalizeOptionalText, validateScopedFieldValue } from '@/lib/low-risk-form-validation'

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.managementExpense.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success({ ...record, expenseItems: record.expenseItems ? JSON.parse(record.expenseItems) : [] })
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.managementExpense.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')

    const projectId = body.projectId !== undefined ? normalizeOptionalProjectId(body.projectId) : existing.projectId
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }

    const hasExpenseItems = Array.isArray(body.expenseItems)
    const normalizedExpenseItems = hasExpenseItems
      ? normalizeExpenseItems(body.expenseItems)
      : null
    if (normalizedExpenseItems?.error) throw new BadRequestError(normalizedExpenseItems.error)
    const items = normalizedExpenseItems?.items || []
    const totalAmount = normalizedExpenseItems
      ? normalizedExpenseItems.totalAmount
      : Number(existing.totalAmount ?? existing.expenseAmount)
    const submitter = body.submitter !== undefined
      ? (normalizeOptionalText(body.submitter) || '')
      : existing.submitter
    const submitterError = validateScopedFieldValue(
      getLowRiskFieldRule('management-expenses', 'submitter')!,
      submitter,
      '报销人为必填项'
    )
    if (submitterError) throw new BadRequestError(submitterError)

    const expenseDateInput = body.expenseDate !== undefined
      ? normalizeOptionalText(body.expenseDate)
      : existing.expenseDate
    const expenseDateError = validateScopedFieldValue(
      getLowRiskFieldRule('management-expenses', 'expenseDate')!,
      expenseDateInput,
      '日期为必填项'
    )
    if (expenseDateError) throw new BadRequestError(expenseDateError)

    const updated = await db.managementExpense.update({
      where: { id },
      data: {
        projectId,
        submitter,
        expenseDate: body.expenseDate !== undefined
          ? parseDateOnlyForStorage(expenseDateInput as string)
          : existing.expenseDate,
        totalAmount,
        expenseAmount: totalAmount,
        expenseItems: hasExpenseItems ? (items.length > 0 ? JSON.stringify(items) : null) : existing.expenseItems,
        attachmentUrl: body.attachmentUrl !== undefined ? (body.attachmentUrl?.trim() || null) : existing.attachmentUrl,
        remark: body.remark !== undefined ? (body.remark?.trim() || null) : existing.remark,
        updatedAt: new Date(),
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()!
    const existing = await db.managementExpense.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    await db.managementExpense.delete({ where: { id } })
    return success({ id })
  },
}, { resource: 'management-expenses', resourceIdExtractor: (req, result) => result?.data?.id || req.url.split('/').pop() || null })
