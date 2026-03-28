import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const where: any = {}
    if (projectId) where.projectId = projectId

    const records = await db.pettyCash.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        holder: true, applyReason: true, issuedAmount: true, returnedAmount: true,
        issueDate: true, returnDate: true, status: true,
        attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: { issueDate: 'desc' },
    })
    return success(records.map(r => ({ ...r, projectName: r.project?.name })))
  },

  POST: async (req) => {
    const body = await req.json()
    if (!body.projectId) throw new BadRequestError('项目ID为必填项')
    if (!body.holder?.trim()) throw new BadRequestError('申请人为必填项')
    if (!body.issuedAmount || body.issuedAmount <= 0) throw new BadRequestError('金额必须大于0')
    if (!body.issueDate) throw new BadRequestError('日期为必填项')

    const project = await db.project.findUnique({ where: { id: body.projectId } })
    if (!project) throw new NotFoundError('项目不存在')

    const record = await db.pettyCash.create({
      data: {
        projectId: body.projectId,
        holder: body.holder.trim(),
        applyReason: body.applyReason?.trim() || null,
        issuedAmount: body.issuedAmount,
        issueDate: new Date(body.issueDate),
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
        status: 'ISSUED',
      },
    })
    return success(record)
  },
}, { resource: 'petty-cashes', resourceIdExtractor: (req, result) => result?.data?.id || null })
