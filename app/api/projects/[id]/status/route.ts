import { apiHandler, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertDirectRecordInCurrentRegion } from '@/lib/region'

/**
 * POST /api/projects/{id}/status
 * 更新项目状态
 */
export const POST = apiHandler(async (req) => {
  const id = req.url.split('/').slice(-3)[0]

  if (!id) {
    throw new BadRequestError('缺少项目 ID')
  }

  const body = await req.json()

  // 验证必填字段
  if (!body.status || typeof body.status !== 'string') {
    throw new BadRequestError('项目状态为必填项')
  }

  // 验证状态值
  const validStatuses = ['PLANNING', 'APPROVED', 'IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'CANCELLED']
  if (!validStatuses.includes(body.status)) {
    throw new BadRequestError(`无效的项目状态，允许的值：${validStatuses.join(', ')}`)
  }

  // 检查项目是否存在
  const project = await assertDirectRecordInCurrentRegion('project', id)

  if (!project) {
    throw new NotFoundError('项目不存在')
  }

  // 如果状态相同，不需要更新
  if (project.status === body.status) {
    return success({
      message: '项目状态未变化',
      project: {
        id: project.id,
        status: project.status,
      },
    })
  }

  // 创建状态变更记录
  const statusChange = await db.projectStatusChange.create({
    data: {
      id: crypto.randomUUID(),
      projectId: id,
      fromStatus: project.status as any,
      toStatus: body.status as any,
      changeReason: body.remark || null,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      projectId: true,
      fromStatus: true,
      toStatus: true,
      changeReason: true,
      createdAt: true,
    },
  })

  // 更新项目状态
  const updatedProject = await db.project.update({
    where: { id },
    data: { status: body.status },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      updatedAt: true,
    },
  })

  return success({
    project: updatedProject,
    statusChange,
  })
})
