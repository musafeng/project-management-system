import { apiHandlerWithPermissionAndLog, success, NotFoundError, BadRequestError } from '@/lib/api'
import { parseDateOnlyForStorage } from '@/lib/date-only'
import { db } from '@/lib/db'
import { getLowRiskFieldRule, normalizeOptionalProjectId, normalizeOptionalText, validateScopedFieldValue } from '@/lib/low-risk-form-validation'

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.otherPayment.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success({ ...record, projectName: record.project?.name || null })
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.otherPayment.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')

    const projectId = body.projectId !== undefined ? normalizeOptionalProjectId(body.projectId) : existing.projectId
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }
    const paymentType = body.paymentType !== undefined ? (normalizeOptionalText(body.paymentType) || '') : existing.paymentType
    const paymentTypeError = validateScopedFieldValue(
      getLowRiskFieldRule('other-payments', 'paymentType')!,
      paymentType,
      '付款事由为必填项'
    )
    if (paymentTypeError) throw new BadRequestError(paymentTypeError)

    const paymentAmount = body.paymentAmount !== undefined ? body.paymentAmount : existing.paymentAmount
    const paymentAmountError = validateScopedFieldValue(
      getLowRiskFieldRule('other-payments', 'paymentAmount')!,
      paymentAmount,
      '金额必须大于0'
    )
    if (paymentAmountError) throw new BadRequestError(paymentAmountError)

    const paymentDateInput = body.paymentDate !== undefined ? normalizeOptionalText(body.paymentDate) : existing.paymentDate
    const paymentDateError = validateScopedFieldValue(
      getLowRiskFieldRule('other-payments', 'paymentDate')!,
      paymentDateInput,
      '日期为必填项'
    )
    if (paymentDateError) throw new BadRequestError(paymentDateError)

    const updated = await db.otherPayment.update({
      where: { id },
      data: {
        projectId: projectId ?? undefined,
        paymentType,
        paymentAmount: Number(paymentAmount),
        paymentDate: body.paymentDate !== undefined
          ? parseDateOnlyForStorage(paymentDateInput as string)
          : existing.paymentDate,
        attachmentUrl: body.attachmentUrl !== undefined ? (body.attachmentUrl?.trim() || null) : existing.attachmentUrl,
        remark: body.remark !== undefined ? (body.remark?.trim() || null) : existing.remark,
        updatedAt: new Date(),
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()!
    const existing = await db.otherPayment.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    await db.otherPayment.delete({ where: { id } })
    return success({ id })
  },
}, { resource: 'other-payments', resourceIdExtractor: (req, result) => result?.data?.id || req.url.split('/').pop() || null })
