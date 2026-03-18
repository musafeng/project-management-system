/**
 * GET  /api/current-region          - 获取当前区域信息
 * POST /api/current-region           - 设置当前区域
 * body: { regionId: string }
 */
import { apiHandler, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { getCurrentRegionId, setCurrentRegionId } from '@/lib/region'

export const GET = apiHandler(async (_req) => {
  const regionId = await getCurrentRegionId()
  if (!regionId) return success({ regionId: null, regionName: null })

  const region = await db.region.findUnique({
    where: { id: regionId },
    select: { id: true, name: true, isActive: true },
  })
  if (!region) return success({ regionId: null, regionName: null })

  return success({ regionId: region.id, regionName: region.name })
})

export const POST = apiHandler(async (req) => {
  const body = await req.json()

  if (!body.regionId || typeof body.regionId !== 'string') {
    throw new BadRequestError('regionId 为必填项')
  }

  const region = await db.region.findUnique({ where: { id: body.regionId } })
  if (!region) throw new NotFoundError('区域不存在')

  await setCurrentRegionId(body.regionId)

  return success({ regionId: body.regionId, regionName: region.name })
})

