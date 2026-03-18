/**
 * GET /api/process-tasks/pending?resource=xxx&resourceId=yyy
 * 返回当前单据是否有待处理 task，以及当前用户是否是审批人
 */
import { apiHandler, success } from '@/lib/api'
import { checkAuth } from '@/lib/api'
import { db } from '@/lib/db'
import { findSystemUserByDingUserId } from '@/lib/system-user'

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url)
  const resource = searchParams.get('resource')
  const resourceId = searchParams.get('resourceId')

  if (!resource || !resourceId) {
    return success({ canApprove: false, task: null })
  }

  // 获取当前用户（未登录时返回无权限）
  const authUser = await checkAuth()
  if (!authUser) {
    return success({ canApprove: false, task: null })
  }

  // 查询当前单据最新 PENDING 流程实例的第一个 PENDING task
  const instance = await db.processInstance.findFirst({
    where: { resourceType: resource, resourceId, status: 'PENDING' },
    include: {
      tasks: {
        where: { status: 'PENDING' },
        orderBy: { nodeOrder: 'asc' },
        take: 1,
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  const task = instance?.tasks[0] ?? null

  if (!task) {
    return success({ canApprove: false, task: null })
  }

  // 判断当前用户是否是该 task 的审批人
  let canApprove = false

  if (task.approverType === 'ROLE') {
    // 直接用 authUser.systemRole 比较（枚举字符串值一致）
    canApprove = authUser.systemRole === task.approverRole
  } else if (task.approverType === 'USER') {
    // approverUserId 存的是 SystemUser.id，通过 dingUserId 查出当前用户的 SystemUser.id
    const sysUser = await findSystemUserByDingUserId(authUser.userid)
    canApprove = sysUser?.id === task.approverUserId
  }

  return success({
    canApprove,
    task: {
      id: task.id,
      approverType: task.approverType,
      approverRole: task.approverRole,
      nodeOrder: task.nodeOrder,
    },
  })
})
