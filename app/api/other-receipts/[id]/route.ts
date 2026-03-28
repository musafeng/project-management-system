import { apiHandlerWithMethod, success, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.otherReceipt.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success(record)
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.otherReceipt.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    const updated = await db.otherReceipt.update({
      where: { id },
      data: {
        receiptType: body.receiptType?.trim() || existing.receiptType,
        receiptAmount: body.receiptAmount ?? existing.receiptAmount,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : existing.receiptDate,
        receiptMethod: body.receiptMethod?.trim() ?? existing.receiptMethod,
        attachmentUrl: body.attachmentUrl?.trim() ?? existing.attachmentUrl,
        remark: body.remark?.trim() ?? existing.remark,
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()!
    const existing = await db.otherReceipt.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    await db.otherReceipt.delete({ where: { id } })
    return success({ id })
  },
})
