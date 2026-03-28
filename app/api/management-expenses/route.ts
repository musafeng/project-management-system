import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const where: any = {}
    if (projectId) where.projectId = projectId

    const records = await db.managementExpense.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        submitter: true, totalAmount: true, expenseItems: true,
        expenseDate: true, attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: { expenseDate: 'desc' },
    })
    return success(records.map(r => ({
      ...r, projectName: r.project?.name,
      expenseItems: r.expenseItems ? JSON.parse(r.expenseItems) : [],
    })))
  },

  POST: async (req) => {
    const body = await req.json()
    if (!body.projectId) throw new BadRequestError('项目ID为必填项')
    if (!body.submitter?.trim()) throw new BadRequestError('报销人为必填项')
    if (!body.expenseDate) throw new BadRequestError('日期为必填项')

    const project = await db.project.findUnique({ where: { id: body.projectId } })
    if (!project) throw new NotFoundError('项目不存在')

    const items = body.expenseItems || []
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)

    const record = await db.managementExpense.create({
      data: {
        projectId: body.projectId,
        category: body.category || 'OTHER',
        expenseAmount: totalAmount,
        expenseDate: new Date(body.expenseDate),
        submitter: body.submitter.trim(),
        totalAmount,
        expenseItems: items.length > 0 ? JSON.stringify(items) : null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
      },
    })
    return success(record)
  },
}, { resource: 'management-expenses', resourceIdExtractor: (req, result) => result?.data?.id || null })

