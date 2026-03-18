/**
 * GET  /api/org-units  - 获取组织单元列表
 * POST /api/org-units  - 创建组织单元
 */
import { apiHandlerWithPermissionAndLog, success, BadRequestError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  GET: async (_req) => {
    const units = await db.organizationUnit.findMany({
      include: {
        members: {
          include: {
            systemUser: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return success(units)
  },

  POST: async (req) => {
    const body = await req.json()
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestError('组织名称为必填项')
    }
    const code = body.code?.trim() || null
    if (code) {
      const exists = await db.organizationUnit.findUnique({ where: { code } })
      if (exists) throw new ConflictError('组织代码已存在')
    }
    const unit = await db.organizationUnit.create({
      data: {
        name: body.name.trim(),
        code,
        parentId: body.parentId || null,
        remark: body.remark?.trim() || null,
        isActive: true,
      },
    })
    return success(unit)
  },
}, {
  resource: 'org-units',
  resourceIdExtractor: (_req, result) => result?.data?.id || null,
})


