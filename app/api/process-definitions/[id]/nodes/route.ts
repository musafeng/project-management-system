/**
 * POST /api/process-definitions/[id]/nodes - 新增节点
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, requireSystemManager } from '@/lib/api'
import { db } from '@/lib/db'

export const { POST } = apiHandlerWithPermissionAndLog({
  POST: async (req) => {
    await requireSystemManager()
    const id = req.url.split('/process-definitions/')[1]?.split('/nodes')[0]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少流程定义 ID')
    const body = await req.json()

    const def = await db.processDefinition.findUnique({ where: { id } })
    if (!def) throw new NotFoundError('流程定义不存在')

    if (!body.approverType) throw new BadRequestError('approverType 为必填项')
    if (body.approverType === 'ROLE' && !body.approverRole) {
      throw new BadRequestError('approverType=ROLE 时，approverRole 为必填项')
    }
    if (body.approverType === 'USER' && !body.approverUserId) {
      throw new BadRequestError('approverType=USER 时，approverUserId 为必填项')
    }

    const maxNode = await db.processNode.findFirst({
      where: { definitionId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = (maxNode?.order ?? 0) + 1

    const node = await db.processNode.create({
      data: {
        definitionId: id,
        order,
        name: body.name || '审批',
        approverType: body.approverType,
        approverRole: body.approverRole ?? null,
        approverUserId: body.approverUserId ?? null,
        ccMode: body.ccMode ?? 'NONE',
        ccRole: body.ccRole ?? null,
        ccUserId: body.ccUserId ?? null,
      },
    })
    return success(node)
  },
}, {
  resource: 'process-definitions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
