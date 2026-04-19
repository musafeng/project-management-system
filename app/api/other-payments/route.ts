import {
  apiHandlerWithPermissionAndLog,
  BadRequestError,
  NotFoundError,
  success,
} from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { insertCompatRecord } from '@/lib/db-write-compat'
import { assertProjectInCurrentRegion, requireCurrentRegionId } from '@/lib/region'
import {
  parseOtherPaymentRemark,
  serializeOtherPaymentRemark,
} from '@/lib/other-payment-supplier'

export const dynamic = 'force-dynamic'


export const { GET, POST } = apiHandlerWithPermissionAndLog(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url)
      const projectId = searchParams.get('projectId')
      const keyword = searchParams.get('keyword')
      const supportsRegionId = await hasDbColumn('OtherPayment', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const where: any = supportsRegionId ? { regionId } : {}

      if (projectId) where.projectId = projectId
      if (keyword) where.paymentType = { contains: keyword }

      const records = await db.otherPayment.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          Project: { select: { name: true } },
          ...(supportsRegionId ? { regionId: true } : {}),
          paymentType: true,
          paymentAmount: true,
          paymentDate: true,
          paymentMethod: true,
          attachmentUrl: true,
          approvalStatus: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { paymentDate: 'desc' },
      })

      return success(
        records.map((record) => ({
          ...record,
          projectName: record.Project?.name ?? null,
          ...parseOtherPaymentRemark(record.remark),
        }))
      )
    },

    POST: async (req) => {
      const body = await req.json()
      const supportsRegionId = await hasDbColumn('OtherPayment', 'regionId')
      const regionId = supportsRegionId ? await requireCurrentRegionId() : null
      const projectId = String(body.projectId ?? '').trim()
      const paymentType = String(body.paymentType ?? '').trim()
      const paymentDate = String(body.paymentDate ?? '').trim()
      const paymentAmount = Number(body.paymentAmount ?? 0)
      const supplierId = String(body.supplierId ?? '').trim() || null

      if (!projectId) throw new BadRequestError('项目为必填项')
      if (!paymentType) throw new BadRequestError('付款事由为必填项')
      if (!paymentDate) throw new BadRequestError('日期为必填项')
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) throw new BadRequestError('金额必须大于0')

      const project = await assertProjectInCurrentRegion(projectId)
      if (!project) throw new NotFoundError('项目不存在')

      let supplierName: string | null = null
      let contact: string | null = String(body.contact ?? '').trim() || null
      let accountName: string | null = String(body.accountName ?? '').trim() || null
      let bankAccount: string | null = String(body.bankAccount ?? '').trim() || null
      let bankName: string | null = String(body.bankName ?? '').trim() || null

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
        supplierName = supplier.name
        contact = contact || supplier.contact || null
        accountName = accountName || supplier.name
        bankAccount = bankAccount || supplier.bankAccount || null
        bankName = bankName || supplier.bankName || null
      }

      const now = new Date()
      const id = crypto.randomUUID()
      await insertCompatRecord('OtherPayment', {
        id,
        projectId,
        ...(supportsRegionId ? { regionId } : {}),
        paymentType,
        paymentAmount,
        paymentDate: new Date(paymentDate),
        paymentMethod: String(body.paymentMethod ?? '').trim() || null,
        attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
        remark: serializeOtherPaymentRemark(String(body.remark ?? '').trim() || null, {
          supplierId,
          supplierName,
          contact,
          accountName,
          bankAccount,
          bankName,
        }),
        updatedAt: now,
      })

      return success({ id })
    },
  },
  {
    resource: 'other-payments',
    resourceIdExtractor: (_, result) => result?.data?.id ?? null,
  }
)
