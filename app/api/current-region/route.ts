/**
 * POST /api/current-region - 设置当前区域
 * body: { regionId: string }
 */
import { apiHandler, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { setCurrentRegionId } from '@/lib/region'

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

