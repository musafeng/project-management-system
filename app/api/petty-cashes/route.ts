import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { parseDateOnlyForStorage, parseDateOnlyRangeEnd, parseDateOnlyRangeStart } from '@/lib/date-only'
import { db } from '@/lib/db'
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
          { holder: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const issueDate: any = {}
      if (startDate) issueDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) issueDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ issueDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.pettyCash.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        holder: true, applyReason: true, issuedAmount: true, returnedAmount: true,
        issueDate: true, returnDate: true, status: true,
        attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: [
        { issueDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    return success(records.map(r => ({ ...r, projectName: r.project?.name || r.projectId || null })))
  },

  POST: async (req) => {
    const body = await req.json()
    const holder = normalizeOptionalText(body.holder) || ''
    const holderError = validateScopedFieldValue(
      getLowRiskFieldRule('petty-cashes', 'holder')!,
      holder,
      '申请人为必填项'
    )
    if (holderError) throw new BadRequestError(holderError)

    const issuedAmount = body.issuedAmount
    const issuedAmountError = validateScopedFieldValue(
      getLowRiskFieldRule('petty-cashes', 'issuedAmount')!,
      issuedAmount,
      '金额必须大于0'
    )
    if (issuedAmountError) throw new BadRequestError(issuedAmountError)

    const issueDate = normalizeOptionalText(body.issueDate)
    const issueDateError = validateScopedFieldValue(
      getLowRiskFieldRule('petty-cashes', 'issueDate')!,
      issueDate,
      '日期为必填项'
    )
    if (issueDateError) throw new BadRequestError(issueDateError)

    const projectId = normalizeOptionalProjectId(body.projectId)
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }

    const record = await db.pettyCash.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId ?? undefined,
        holder,
        applyReason: body.applyReason?.trim() || null,
        issuedAmount: Number(issuedAmount),
        issueDate: parseDateOnlyForStorage(issueDate as string),
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
        status: 'ISSUED',
        updatedAt: new Date(),
      },
    })
    return success(record)
  },
}, { resource: 'petty-cashes', resourceIdExtractor: (req, result) => result?.data?.id || null })
