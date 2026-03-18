/**
 * GET  /api/regions  - 获取区域列表
 * POST /api/regions  - 创建区域
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (_req) => {
    const regions = await db.region.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true, isActive: true, createdAt: true },
    })
    return success(regions)
  },

  POST: async (req) => {
    const body = await req.json()

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestError('区域名称为必填项')
    }

    const name = body.name.trim()
    const code = body.code?.trim() || null

    if (code) {
      const exists = await db.region.findUnique({ where: { code } })
      if (exists) throw new ConflictError('区域代码已存在')
    }

    const region = await db.region.create({
      data: { name, code, isActive: true },
      select: { id: true, name: true, code: true, isActive: true, createdAt: true },
    })

    return success(region)
  },
}, {
  resource: 'regions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})

