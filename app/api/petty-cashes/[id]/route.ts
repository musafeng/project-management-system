import { apiHandlerWithPermissionAndLog, success, NotFoundError, BadRequestError } from '@/lib/api'
import { parseDateOnlyForStorage } from '@/lib/date-only'
import { db } from '@/lib/db'
import { getLowRiskFieldRule, normalizeOptionalProjectId, normalizeOptionalText, validateScopedFieldValue } from '@/lib/low-risk-form-validation'

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const id = req.url.split('/').pop()!
    const record = await db.pettyCash.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    })
    if (!record) throw new NotFoundError('记录不存在')
    return success(record)
  },

  PUT: async (req) => {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    const existing = await db.pettyCash.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')

    const projectId = body.projectId !== undefined ? normalizeOptionalProjectId(body.projectId) : existing.projectId
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) throw new NotFoundError('项目不存在')
    }
    const holder = body.holder !== undefined ? (normalizeOptionalText(body.holder) || '') : existing.holder
    const holderError = validateScopedFieldValue(
      getLowRiskFieldRule('petty-cashes', 'holder')!,
      holder,
      '申请人为必填项'
    )
    if (holderError) throw new BadRequestError(holderError)

    const issuedAmount = body.issuedAmount !== undefined ? body.issuedAmount : existing.issuedAmount
    const issuedAmountError = validateScopedFieldValue(
      getLowRiskFieldRule('petty-cashes', 'issuedAmount')!,
      issuedAmount,
      '金额必须大于0'
    )
    if (issuedAmountError) throw new BadRequestError(issuedAmountError)

    const issueDateInput = body.issueDate !== undefined ? normalizeOptionalText(body.issueDate) : existing.issueDate
    const issueDateError = validateScopedFieldValue(
      getLowRiskFieldRule('petty-cashes', 'issueDate')!,
      issueDateInput,
      '日期为必填项'
    )
    if (issueDateError) throw new BadRequestError(issueDateError)

    const updated = await db.pettyCash.update({
      where: { id },
      data: {
        projectId: projectId ?? undefined,
        holder,
        applyReason: body.applyReason !== undefined ? (body.applyReason?.trim() || null) : existing.applyReason,
        issuedAmount: Number(issuedAmount),
        issueDate: body.issueDate !== undefined
          ? parseDateOnlyForStorage(issueDateInput as string)
          : existing.issueDate,
        returnedAmount: body.returnedAmount ?? existing.returnedAmount,
        returnDate: body.returnDate ? parseDateOnlyForStorage(body.returnDate) : existing.returnDate,
        attachmentUrl: body.attachmentUrl !== undefined ? (body.attachmentUrl?.trim() || null) : existing.attachmentUrl,
        remark: body.remark !== undefined ? (body.remark?.trim() || null) : existing.remark,
        updatedAt: new Date(),
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const id = req.url.split('/').pop()!
    const existing = await db.pettyCash.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('记录不存在')
    await db.pettyCash.delete({ where: { id } })
    return success({ id })
  },
}, { resource: 'petty-cashes', resourceIdExtractor: (req, result) => result?.data?.id || req.url.split('/').pop() || null })
