/**
 * GET  /api/current-region - 获取当前区域信息
 * POST /api/current-region - 设置当前区域
 * body: { regionId: string }
 */
import { apiHandler, success, BadRequestError, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'
import {
  assertRegionAccessible,
  getAccessibleRegions,
  resolveCurrentRegionContext,
  setCurrentRegionId,
} from '@/lib/region'

export const dynamic = 'force-dynamic'


export const GET = apiHandler(async (_req) => {
  const user = await requireAuth()
  const context = await resolveCurrentRegionContext(user)
  const accessibleRegions = await getAccessibleRegions(user)

  if (!context) {
    return success({ regionId: null, regionName: null, accessibleRegions: [] })
  }

  const region = await db.region.findUnique({
    where: { id: context.currentRegion.id },
    select: { id: true, name: true, isActive: true },
  })
  if (!region) {
    return success({ regionId: null, regionName: null, accessibleRegions: [] })
  }

  return success({
    regionId: region.id,
    regionName: region.name,
    accessibleRegions,
  })
})

export const POST = apiHandler(async (req) => {
  const user = await requireAuth()
  const body = await req.json()

  if (!body.regionId || typeof body.regionId !== 'string') {
    throw new BadRequestError('regionId 为必填项')
  }

  const region = await assertRegionAccessible(body.regionId, user)

  await setCurrentRegionId(body.regionId)

  return success({ regionId: body.regionId, regionName: region.name })
})
