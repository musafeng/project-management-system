/**
 * GET  /api/process-definitions      - 获取流程定义列表（含节点）
 * POST /api/process-definitions      - 创建流程定义
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, ConflictError, requireSystemManager } from '@/lib/api'
import { db } from '@/lib/db'
import { normalizeProcessDefinition, normalizeProcessDefinitions } from '@/lib/process-definitions'
import { requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (_req) => {
    await requireSystemManager()
    const regionId = await requireCurrentRegionId()
    const defs = await db.processDefinition.findMany({
      where: { regionId },
      include: {
        ProcessNode: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return success(normalizeProcessDefinitions(defs))
  },

  POST: async (req) => {
    await requireSystemManager()
    const body = await req.json()
    if (!body.resourceType || !body.name) {
      throw new BadRequestError('resourceType 和 name 为必填项')
    }
    const regionId = await requireCurrentRegionId()
    const existing = await db.processDefinition.findFirst({
      where: { regionId, resourceType: body.resourceType },
    })
    if (existing) throw new ConflictError('该资源类型的流程定义已存在')

    const def = await db.processDefinition.create({
      data: {
        id: crypto.randomUUID(),
        regionId,
        resourceType: body.resourceType,
        name: body.name,
        isActive: true,
        updatedAt: new Date(),
      },
      include: { ProcessNode: true },
    })
    return success(normalizeProcessDefinition(def))
  },
}, {
  resource: 'process-definitions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
