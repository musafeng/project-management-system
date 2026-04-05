import { apiHandlerWithPermissionAndLog, success, NotFoundError, BadRequestError } from '@/lib/api'
import { parseDateOnlyForStorage } from '@/lib/date-only'
import { db } from '@/lib/db'
import { getLowRiskFieldRule, normalizeOptionalProjectId, normalizeOptionalText, validateScopedFieldValue } from '@/lib/low-risk-form-validation'

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.otherReceipt.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success({ ...record, projectName: record.project?.name || null })
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.otherReceipt.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')

    const projectId = body.projectId !== undefined ? normalizeOptionalProjectId(body.projectId) : existing.projectId
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }
    const receiptType = body.receiptType !== undefined ? (normalizeOptionalText(body.receiptType) || '') : existing.receiptType
    const receiptTypeError = validateScopedFieldValue(
      getLowRiskFieldRule('other-receipts', 'receiptType')!,
      receiptType,
      '收款事由为必填项'
    )
    if (receiptTypeError) throw new BadRequestError(receiptTypeError)

    const receiptAmount = body.receiptAmount !== undefined ? body.receiptAmount : existing.receiptAmount
    const receiptAmountError = validateScopedFieldValue(
      getLowRiskFieldRule('other-receipts', 'receiptAmount')!,
      receiptAmount,
      '金额必须大于0'
    )
    if (receiptAmountError) throw new BadRequestError(receiptAmountError)

    const receiptDateInput = body.receiptDate !== undefined ? normalizeOptionalText(body.receiptDate) : existing.receiptDate
    const receiptDateError = validateScopedFieldValue(
      getLowRiskFieldRule('other-receipts', 'receiptDate')!,
      receiptDateInput,
      '日期为必填项'
    )
    if (receiptDateError) throw new BadRequestError(receiptDateError)

    const updated = await db.otherReceipt.update({
      where: { id },
      data: {
        projectId: projectId ?? undefined,
        receiptType,
        receiptAmount: Number(receiptAmount),
        receiptDate: body.receiptDate !== undefined
          ? parseDateOnlyForStorage(receiptDateInput as string)
          : existing.receiptDate,
        receiptMethod: body.receiptMethod !== undefined ? (body.receiptMethod?.trim() || null) : existing.receiptMethod,
        attachmentUrl: body.attachmentUrl !== undefined ? (body.attachmentUrl?.trim() || null) : existing.attachmentUrl,
        remark: body.remark !== undefined ? (body.remark?.trim() || null) : existing.remark,
        updatedAt: new Date(),
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
}, { resource: 'other-receipts', resourceIdExtractor: (req, result) => result?.data?.id || req.url.split('/').pop() || null })
