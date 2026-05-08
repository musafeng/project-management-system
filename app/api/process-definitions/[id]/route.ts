/**
 * GET /api/process-definitions/[id]  - 获取单个流程定义
 * PUT /api/process-definitions/[id]  - 更新流程定义
 */
import { apiHandlerWithPermissionAndLog, success, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { normalizeProcessDefinition } from '@/lib/process-definitions'
import { requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


export const { GET, PUT } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const regionId = await requireCurrentRegionId()
    const id = req.url.split('/process-definitions/')[1]?.split('/')[0]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少流程定义 ID')
    const def = await db.processDefinition.findFirst({
      where: { id, regionId },
      include: { ProcessNode: { orderBy: { order: 'asc' } } },
    })
    if (!def) throw new NotFoundError('流程定义不存在')
    return success(normalizeProcessDefinition(def))
  },

  PUT: async (req) => {
    const regionId = await requireCurrentRegionId()
    const id = req.url.split('/process-definitions/')[1]?.split('/')[0]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少流程定义 ID')
    const body = await req.json()
    const def = await db.processDefinition.findFirst({ where: { id, regionId } })
    if (!def) throw new NotFoundError('流程定义不存在')

    const updated = await db.processDefinition.update({
      where: { id },
      data: {
        name: body.name ?? def.name,
        isActive: body.isActive ?? def.isActive,
      },
      include: { ProcessNode: { orderBy: { order: 'asc' } } },
    })
    return success(normalizeProcessDefinition(updated))
  },
}, {
  resource: 'process-definitions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
