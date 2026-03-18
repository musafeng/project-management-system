/**
 * PUT /api/regions/[id] - 编辑区域（名称、代码、启用/停用）
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { PUT } = apiHandlerWithPermissionAndLog({
  PUT: async (req) => {
    const id = req.url.split('/regions/')[1]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少区域 ID')
    const body = await req.json()

    const region = await db.region.findUnique({ where: { id } })
    if (!region) throw new NotFoundError('区域不存在')

    const updateData: { name?: string; code?: string | null; isActive?: boolean } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw new BadRequestError('区域名称不能为空')
      }
      updateData.name = body.name.trim()
    }

    if (body.code !== undefined) {
      updateData.code = body.code?.trim() || null
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    const updated = await db.region.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, code: true, isActive: true, createdAt: true },
    })

    return success(updated)
  },
}, {
  resource: 'regions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
