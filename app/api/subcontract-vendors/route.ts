import { apiHandler, success } from '@/lib/api'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


/**
 * GET /api/subcontract-vendors
 * 获取分包单位列表（只读）
 */
export const GET = apiHandler(async (req) => {
  const vendors = await db.subcontractVendor.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      contact: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return success(vendors)
})
