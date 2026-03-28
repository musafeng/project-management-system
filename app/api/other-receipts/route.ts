import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentRegionId } from '@/lib/region'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const where: any = {}
    if (projectId) where.projectId = projectId
    if (keyword) where.receiptType = { contains: keyword }

    const records = await db.otherReceipt.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        receiptType: true, receiptAmount: true, receiptDate: true,
        attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: { receiptDate: 'desc' },
    })
    return success(records.map(r => ({
      ...r, projectName: r.project?.name, amount: r.receiptAmount,
    })))
  },

  POST: async (req) => {
    const body = await req.json()
    if (!body.projectId) throw new BadRequestError('项目ID为必填项')
    if (!body.receiptType?.trim()) throw new BadRequestError('收款事由为必填项')
    if (!body.receiptAmount || body.receiptAmount <= 0) throw new BadRequestError('金额必须大于0')
    if (!body.receiptDate) throw new BadRequestError('日期为必填项')

    const project = await db.project.findUnique({ where: { id: body.projectId } })
    if (!project) throw new NotFoundError('项目不存在')

    const record = await db.otherReceipt.create({
      data: {
        projectId: body.projectId,
        receiptType: body.receiptType.trim(),
        receiptAmount: body.receiptAmount,
        receiptDate: new Date(body.receiptDate),
        receiptMethod: body.receiptMethod?.trim() || null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
      },
    })
    return success(record)
  },
}, { resource: 'other-receipts', resourceIdExtractor: (req, result) => result?.data?.id || null })

