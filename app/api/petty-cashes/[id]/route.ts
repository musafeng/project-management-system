import { apiHandlerWithMethod, success, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.pettyCash.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success(record)
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.pettyCash.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    const updated = await db.pettyCash.update({
      where: { id },
      data: {
        holder: body.holder?.trim() ?? existing.holder,
        applyReason: body.applyReason?.trim() ?? existing.applyReason,
        issuedAmount: body.issuedAmount ?? existing.issuedAmount,
        issueDate: body.issueDate ? new Date(body.issueDate) : existing.issueDate,
        returnedAmount: body.returnedAmount ?? existing.returnedAmount,
        returnDate: body.returnDate ? new Date(body.returnDate) : existing.returnDate,
        attachmentUrl: body.attachmentUrl?.trim() ?? existing.attachmentUrl,
        remark: body.remark?.trim() ?? existing.remark,
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()!
    const existing = await db.pettyCash.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    await db.pettyCash.delete({ where: { id } })
    return success({ id })
  },
})
