/**
 * GET /api/process-tasks/pending?resource=xxx&resourceId=yyy
 * 返回当前单据审批中的任务、当前节点和当前用户的可执行动作
 */
import { apiHandler, success } from '@/lib/api'
import { checkAuth } from '@/lib/api'
import { canSubmitApproval } from '@/lib/approval-status'
import { db } from '@/lib/db'
import { assertResourceInCurrentRegion } from '@/lib/region'
import { findSystemUserByDingUserId } from '@/lib/system-user'

export const dynamic = 'force-dynamic'


export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url)
  const resource = searchParams.get('resource')
  const resourceId = searchParams.get('resourceId')

  if (!resource || !resourceId) {
    return success({ canApprove: false, canSubmit: false, canUrge: false, latestStatus: null, task: null })
  }

  // 获取当前用户（未登录时返回无权限）
  const authUser = await checkAuth()
  if (!authUser) {
    return success({ canApprove: false, canSubmit: false, canUrge: false, latestStatus: null, task: null })
  }

  let record: { approvalStatus?: string | null; approvedAt?: Date | null } | null = null
  try {
    record = await assertResourceInCurrentRegion(resource, resourceId)
  } catch {
    return success({ canApprove: false, canSubmit: false, canUrge: false, latestStatus: null, task: null })
  }

  // 查询当前单据最新流程实例，并带出当前待处理节点
  const instance = await db.processInstance.findFirst({
    where: { resourceType: resource, resourceId },
    include: {
      ProcessTask: {
        where: { status: 'PENDING' },
        orderBy: { nodeOrder: 'asc' },
        take: 1,
        include: {
          ProcessNode: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  const task = instance?.ProcessTask[0] ?? null

  // 判断当前用户是否是该 task 的审批人
  let canApprove = false

  if (task?.approverType === 'ROLE') {
    // 直接用 authUser.systemRole 比较（枚举字符串值一致）
    canApprove = authUser.systemRole === task.approverRole
  } else if (task?.approverType === 'USER') {
    // approverUserId 存的是 SystemUser.id，通过 dingUserId 查出当前用户的 SystemUser.id
    const sysUser = await findSystemUserByDingUserId(authUser.userid)
    canApprove = sysUser?.id === task.approverUserId
  }

  const latestStatus = instance?.status ?? null
  const canSubmit = canSubmitApproval(record ?? {}, latestStatus)
  const canUrge = latestStatus === 'PENDING' && instance?.submitterUserId === authUser.userid

  return success({
    canApprove,
    canSubmit,
    canUrge,
    latestStatus,
    task: {
      id: task?.id ?? null,
      approverType: task?.approverType ?? null,
      approverRole: task?.approverRole ?? null,
      nodeName: task?.ProcessNode?.name ?? null,
      nodeOrder: task?.nodeOrder ?? null,
    },
  })
})
