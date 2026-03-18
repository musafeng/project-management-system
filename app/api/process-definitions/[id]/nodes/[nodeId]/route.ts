/**
 * PUT    /api/process-definitions/[id]/nodes/[nodeId] - 更新节点
 * DELETE /api/process-definitions/[id]/nodes/[nodeId] - 删除节点
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { PUT, DELETE } = apiHandlerWithPermissionAndLog({
  PUT: async (req) => {
    const parts = req.url.split('/process-definitions/')
    const sub = parts[1] ?? ''
    const nodeId = sub.split('/nodes/')[1]?.split('?')[0]
    if (!nodeId) throw new NotFoundError('缺少节点 ID')

    const body = await req.json()

    const node = await db.processNode.findUnique({ where: { id: nodeId } })
    if (!node) throw new NotFoundError('节点不存在')

    if (body.approverType === 'ROLE' && !body.approverRole) {
      throw new BadRequestError('approverType=ROLE 时，approverRole 为必填项')
    }
    if (body.approverType === 'USER' && !body.approverUserId) {
      throw new BadRequestError('approverType=USER 时，approverUserId 为必填项')
    }

    const updated = await db.processNode.update({
      where: { id: nodeId },
      data: {
        name: body.name ?? node.name,
        order: body.order ?? node.order,
        approverType: body.approverType ?? node.approverType,
        approverRole: body.approverType === 'ROLE' ? (body.approverRole ?? node.approverRole) : null,
        approverUserId: body.approverType === 'USER' ? (body.approverUserId ?? node.approverUserId) : null,
        ccMode: body.ccMode ?? node.ccMode,
        ccRole: body.ccMode === 'ROLE' ? (body.ccRole ?? node.ccRole) : null,
        ccUserId: body.ccMode === 'USER' ? (body.ccUserId ?? node.ccUserId) : null,
      },
    })
    return success(updated)
  },

  DELETE: async (req) => {
    const parts = req.url.split('/process-definitions/')
    const sub = parts[1] ?? ''
    const nodeId = sub.split('/nodes/')[1]?.split('?')[0]
    if (!nodeId) throw new NotFoundError('缺少节点 ID')

    const node = await db.processNode.findUnique({ where: { id: nodeId } })
    if (!node) throw new NotFoundError('节点不存在')

    await db.processNode.delete({ where: { id: nodeId } })
    return success({ id: nodeId })
  },
}, {
  resource: 'process-definitions',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})


