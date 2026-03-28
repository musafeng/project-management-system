import { apiHandlerWithMethod, success, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.projectExpense.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success({ ...record, expenseItems: record.expenseItems ? JSON.parse(record.expenseItems) : [] })
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.projectExpense.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    const items = body.expenseItems || []
    const totalAmount = items.length > 0
      ? items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
      : Number(existing.totalAmount ?? existing.expenseAmount)
    const updated = await db.projectExpense.update({
      where: { id },
      data: {
        submitter: body.submitter?.trim() ?? existing.submitter,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : existing.expenseDate,
        totalAmount, expenseAmount: totalAmount,
        expenseItems: items.length > 0 ? JSON.stringify(items) : existing.expenseItems,
        attachmentUrl: body.attachmentUrl?.trim() ?? existing.attachmentUrl,
        remark: body.remark?.trim() ?? existing.remark,
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()!
    const existing = await db.projectExpense.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    await db.projectExpense.delete({ where: { id } })
    return success({ id })
  },
})
