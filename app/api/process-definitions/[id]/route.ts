/**
 * GET /api/process-definitions/[id]  - 获取单个流程定义
 * PUT /api/process-definitions/[id]  - 更新流程定义
 */
import { apiHandlerWithPermissionAndLog, success, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export const { GET, PUT } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const id = req.url.split('/process-definitions/')[1]?.split('/')[0]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少流程定义 ID')
    const def = await db.processDefinition.findUnique({
      where: { id },
      include: { ProcessNode: { orderBy: { order: 'asc' } } },
    })
    if (!def) throw new NotFoundError('流程定义不存在')
    return success(def)
  },

  PUT: async (req) => {
    const id = req.url.split('/process-definitions/')[1]?.split('/')[0]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少流程定义 ID')
    const body = await req.json()
    const def = await db.processDefinition.findUnique({ where: { id } })
    if (!def) throw new NotFoundError('流程定义不存在')

    const updated = await db.processDefinition.update({
      where: { id },
      data: {
        name: body.name ?? def.name,
        isActive: body.isActive ?? def.isActive,
      },
      include: { ProcessNode: { orderBy: { order: 'asc' } } },
    })
    return success(updated)
  },
}, {
  resource: 'process-definitions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
