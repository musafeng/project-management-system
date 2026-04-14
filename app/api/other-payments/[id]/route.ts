import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { db } from '@/lib/db'
import {
  assertDirectRecordInCurrentRegion,
  assertProjectInCurrentRegion,
  requireCurrentRegionId,
} from '@/lib/region'
import {
  parseOtherPaymentRemark,
  serializeOtherPaymentRemark,
} from '@/lib/other-payment-supplier'

export const dynamic = 'force-dynamic'


function getIdFromRequest(req: Request) {
  return new URL(req.url).pathname.split('/').pop() ?? ''
}

export const { GET, PUT, DELETE } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const id = getIdFromRequest(req)
      const regionId = await requireCurrentRegionId()
      const record = await db.otherPayment.findFirst({
        where: { id, regionId },
        include: { Project: { select: { name: true } } },
      })

      if (!record) throw new NotFoundError('记录不存在')

      return success({
        ...record,
        projectName: record.Project?.name ?? null,
        ...parseOtherPaymentRemark(record.remark),
      })
    },

    PUT: async (req) => {
      const id = getIdFromRequest(req)
      const body = await req.json()
      const existing = await assertDirectRecordInCurrentRegion('otherPayment', id)

      if (!existing) throw new NotFoundError('记录不存在')

      const nextProjectId =
        body.projectId === undefined
          ? existing.projectId
          : String(body.projectId ?? '').trim() || null
      const paymentType =
        body.paymentType === undefined
          ? existing.paymentType
          : String(body.paymentType ?? '').trim()
      const paymentAmount =
        body.paymentAmount === undefined
          ? Number(existing.paymentAmount)
          : Number(body.paymentAmount)
      const parsedRemark = parseOtherPaymentRemark(existing.remark)
      const supplierId =
        body.supplierId === undefined
          ? parsedRemark.supplierId ?? null
          : String(body.supplierId ?? '').trim() || null

      if (!paymentType) throw new BadRequestError('付款事由为必填项')
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) throw new BadRequestError('金额必须大于0')

      if (nextProjectId) {
        await assertProjectInCurrentRegion(nextProjectId)
      }

      let supplierName =
        body.supplierName === undefined
          ? parsedRemark.supplierName ?? null
          : String(body.supplierName ?? '').trim() || null
      let contact =
        body.contact === undefined
          ? parsedRemark.contact ?? null
          : String(body.contact ?? '').trim() || null
      let accountName =
        body.accountName === undefined
          ? parsedRemark.accountName ?? null
          : String(body.accountName ?? '').trim() || null
      let bankAccount =
        body.bankAccount === undefined
          ? parsedRemark.bankAccount ?? null
          : String(body.bankAccount ?? '').trim() || null
      let bankName =
        body.bankName === undefined
          ? parsedRemark.bankName ?? null
          : String(body.bankName ?? '').trim() || null

      if (supplierId) {
        const supplier = await db.supplier.findUnique({
          where: { id: supplierId },
          select: {
            id: true,
            name: true,
            contact: true,
            bankAccount: true,
            bankName: true,
          },
        })
        if (!supplier) throw new NotFoundError('供应商不存在')
        supplierName = supplierName || supplier.name
        contact = contact || supplier.contact || null
        accountName = accountName || supplier.name
        bankAccount = bankAccount || supplier.bankAccount || null
        bankName = bankName || supplier.bankName || null
      }

      const updated = await db.otherPayment.update({
        where: { id },
        data: {
          projectId: nextProjectId,
          paymentType,
          paymentAmount,
          paymentDate: body.paymentDate
            ? new Date(String(body.paymentDate))
            : existing.paymentDate,
          paymentMethod:
            body.paymentMethod === undefined
              ? existing.paymentMethod
              : String(body.paymentMethod ?? '').trim() || null,
          attachmentUrl:
            body.attachmentUrl === undefined
              ? existing.attachmentUrl
              : String(body.attachmentUrl ?? '').trim() || null,
          remark: serializeOtherPaymentRemark(
            body.remark === undefined ? parsedRemark.remark : String(body.remark ?? '').trim() || null,
            {
              supplierId,
              supplierName,
              contact,
              accountName,
              bankAccount,
              bankName,
            }
          ),
          updatedAt: new Date(),
        },
      })

      return success({
        ...updated,
        ...parseOtherPaymentRemark(updated.remark),
      })
    },

    DELETE: async (req) => {
      const id = getIdFromRequest(req)
      const existing = await assertDirectRecordInCurrentRegion('otherPayment', id)

      if (!existing) throw new NotFoundError('记录不存在')

      await db.otherPayment.delete({ where: { id } })
      return success({ id })
    },
  },
  {
    resource: 'other-payments',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
