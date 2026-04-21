import { apiHandler, success } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


/**
 * GET /api/subcontract-vendors
 * 获取分包单位列表（只读）
 */
export const GET = apiHandler(async (req) => {
  const supportsRegionId = await hasDbColumn('SubcontractVendor', 'regionId')
  const regionId = supportsRegionId ? await requireCurrentRegionId() : null
  const vendors = await db.subcontractVendor.findMany({
    where: supportsRegionId ? { regionId } : {},
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
