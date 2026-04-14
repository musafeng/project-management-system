/**
 * PUT /api/org-units/[id] - 编辑组织单元
 */
import { apiHandlerWithPermissionAndLog, success, NotFoundError, requireSystemManager } from '@/lib/api'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export const { PUT } = apiHandlerWithPermissionAndLog({
  PUT: async (req) => {
    await requireSystemManager()
    const id = req.url.split('/org-units/')[1]?.split('?')[0]
    if (!id) throw new NotFoundError('缺少组织单元 ID')
    const body = await req.json()
    const unit = await db.organizationUnit.findUnique({ where: { id } })
    if (!unit) throw new NotFoundError('组织单元不存在')

    const updated = await db.organizationUnit.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? unit.name,
        code: body.code !== undefined ? (body.code?.trim() || null) : unit.code,
        isActive: body.isActive ?? unit.isActive,
        remark: body.remark !== undefined ? (body.remark?.trim() || null) : unit.remark,
        parentId: body.parentId !== undefined ? (body.parentId || null) : unit.parentId,
      },
    })
    return success(updated)
  },
}, {
  resource: 'org-units',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
