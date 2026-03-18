/**
 * POST   /api/org-units/[id]/members  - 添加成员
 * DELETE /api/org-units/[id]/members  - 移除成员（body: { systemUserId }）
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

export const { POST, DELETE } = apiHandlerWithPermissionAndLog({
  POST: async (req) => {
    const id = req.url.split('/org-units/')[1]?.split('/members')[0]
    if (!id) throw new BadRequestError('缺少组织单元 ID')
    const body = await req.json()
    if (!body.systemUserId) throw new BadRequestError('systemUserId 为必填项')

    const unit = await db.organizationUnit.findUnique({ where: { id } })
    if (!unit) throw new NotFoundError('组织单元不存在')

    const user = await db.systemUser.findUnique({ where: { id: body.systemUserId } })
    if (!user) throw new NotFoundError('用户不存在')

    const exists = await db.systemUserOrgUnit.findUnique({
      where: { systemUserId_orgUnitId: { systemUserId: body.systemUserId, orgUnitId: id } },
    })
    if (exists) throw new ConflictError('用户已在该组织中')

    const member = await db.systemUserOrgUnit.create({
      data: { systemUserId: body.systemUserId, orgUnitId: id },
    })
    return success(member)
  },

  DELETE: async (req) => {
    const id = req.url.split('/org-units/')[1]?.split('/members')[0]
    if (!id) throw new BadRequestError('缺少组织单元 ID')
    const body = await req.json()
    if (!body.systemUserId) throw new BadRequestError('systemUserId 为必填项')

    await db.systemUserOrgUnit.deleteMany({
      where: { orgUnitId: id, systemUserId: body.systemUserId },
    })
    return success({ ok: true })
  },
}, {
  resource: 'org-units',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})
