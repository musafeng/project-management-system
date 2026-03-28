import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const where: any = {}
    if (projectId) where.projectId = projectId
    if (keyword) where.paymentType = { contains: keyword }

    const records = await db.otherPayment.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        paymentType: true, paymentAmount: true, paymentDate: true,
        attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: { paymentDate: 'desc' },
    })
    return success(records.map(r => ({ ...r, projectName: r.project?.name, amount: r.paymentAmount })))
  },

  POST: async (req) => {
    const body = await req.json()
    if (!body.projectId) throw new BadRequestError('项目ID为必填项')
    if (!body.paymentType?.trim()) throw new BadRequestError('付款事由为必填项')
    if (!body.paymentAmount || body.paymentAmount <= 0) throw new BadRequestError('金额必须大于0')
    if (!body.paymentDate) throw new BadRequestError('日期为必填项')

    const project = await db.project.findUnique({ where: { id: body.projectId } })
    if (!project) throw new NotFoundError('项目不存在')

    const record = await db.otherPayment.create({
      data: {
        projectId: body.projectId,
        paymentType: body.paymentType.trim(),
        paymentAmount: body.paymentAmount,
        paymentDate: new Date(body.paymentDate),
        paymentMethod: body.paymentMethod?.trim() || null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
      },
    })
    return success(record)
  },
}, { resource: 'other-payments', resourceIdExtractor: (req, result) => result?.data?.id || null })

