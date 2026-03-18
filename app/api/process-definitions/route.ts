/**
 * GET  /api/process-definitions      - 获取流程定义列表（含节点）
 * POST /api/process-definitions      - 创建流程定义
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, ConflictError, requireSystemManager } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (_req) => {
    await requireSystemManager()
    const defs = await db.processDefinition.findMany({
      include: {
        nodes: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return success(defs)
  },

  POST: async (req) => {
    const body = await req.json()
    if (!body.resourceType || !body.name) {
      throw new BadRequestError('resourceType 和 name 为必填项')
    }
    const existing = await db.processDefinition.findUnique({ where: { resourceType: body.resourceType } })
    if (existing) throw new ConflictError('该资源类型的流程定义已存在')

    const def = await db.processDefinition.create({
      data: {
        resourceType: body.resourceType,
        name: body.name,
        isActive: true,
      },
      include: { nodes: true },
    })
    return success(def)
  },
}, {
  resource: 'process-definitions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})


