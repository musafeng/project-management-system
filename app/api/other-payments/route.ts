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
          { paymentType: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const paymentDate: any = {}
      if (startDate) paymentDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) paymentDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ paymentDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.otherPayment.findMany({
      where,
      select: {
        id: true, projectId: true,
        project: { select: { name: true } },
        paymentType: true, paymentAmount: true, paymentDate: true,
        attachmentUrl: true, approvalStatus: true, remark: true, createdAt: true,
      },
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    return success(records.map(r => ({
      ...r, projectName: r.project?.name || r.projectId || null,
    })))
  },

  POST: async (req) => {
    const body = await req.json()
    const paymentType = normalizeOptionalText(body.paymentType) || ''
    const paymentTypeError = validateScopedFieldValue(
      getLowRiskFieldRule('other-payments', 'paymentType')!,
      paymentType,
      '付款事由为必填项'
    )
    if (paymentTypeError) throw new BadRequestError(paymentTypeError)

    const paymentAmount = body.paymentAmount
    const paymentAmountError = validateScopedFieldValue(
      getLowRiskFieldRule('other-payments', 'paymentAmount')!,
      paymentAmount,
      '金额必须大于0'
    )
    if (paymentAmountError) throw new BadRequestError(paymentAmountError)

    const paymentDate = normalizeOptionalText(body.paymentDate)
    const paymentDateError = validateScopedFieldValue(
      getLowRiskFieldRule('other-payments', 'paymentDate')!,
      paymentDate,
      '日期为必填项'
    )
    if (paymentDateError) throw new BadRequestError(paymentDateError)

    const projectId = normalizeOptionalProjectId(body.projectId)
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }

    const record = await db.otherPayment.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        paymentType,
        paymentAmount: Number(paymentAmount),
        paymentDate: parseDateOnlyForStorage(paymentDate as string),
        paymentMethod: body.paymentMethod?.trim() || null,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        remark: body.remark?.trim() || null,
        approvalStatus: 'PENDING',
        updatedAt: new Date(),
      },
    })
    return success(record)
  },
}, { resource: 'other-payments', resourceIdExtractor: (req, result) => result?.data?.id || null })
