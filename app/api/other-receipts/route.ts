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
          { receiptType: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const receiptDate: any = {}
      if (startDate) receiptDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) receiptDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ receiptDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.otherReceipt.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        receiptType: true, receiptAmount: true, receiptDate: true,
        attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: [
        { receiptDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    return success(records.map(r => ({
      ...r, projectName: r.project?.name || r.projectId || null,
    })))
  },

  POST: async (req) => {
    const body = await req.json()
    const receiptType = normalizeOptionalText(body.receiptType) || ''
    const receiptTypeError = validateScopedFieldValue(
      getLowRiskFieldRule('other-receipts', 'receiptType')!,
      receiptType,
      '收款事由为必填项'
    )
    if (receiptTypeError) throw new BadRequestError(receiptTypeError)

    const receiptAmount = body.receiptAmount
    const receiptAmountError = validateScopedFieldValue(
      getLowRiskFieldRule('other-receipts', 'receiptAmount')!,
      receiptAmount,
      '金额必须大于0'
    )
    if (receiptAmountError) throw new BadRequestError(receiptAmountError)

    const receiptDate = normalizeOptionalText(body.receiptDate)
    const receiptDateError = validateScopedFieldValue(
      getLowRiskFieldRule('other-receipts', 'receiptDate')!,
      receiptDate,
      '日期为必填项'
    )
    if (receiptDateError) throw new BadRequestError(receiptDateError)

    const projectId = normalizeOptionalProjectId(body.projectId)
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }

    const record = await db.otherReceipt.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId ?? undefined,
        receiptType,
        receiptAmount: Number(receiptAmount),
        receiptDate: parseDateOnlyForStorage(receiptDate as string),
        receiptMethod: body.receiptMethod?.trim() || null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
        updatedAt: new Date(),
      },
    })
    return success(record)
  },
}, { resource: 'other-receipts', resourceIdExtractor: (req, result) => result?.data?.id || null })
