import { apiHandler, success } from '@/lib/api'
import { checkAuth } from '@/lib/api'
import { findSystemUserByDingUserId } from '@/lib/system-user'
import { getWorkbenchData } from '@/lib/workbench'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/workbench
 * 返回当前用户的工作台聚合数据
 */
export const GET = apiHandler(async () => {
  const authUser = await checkAuth()
  if (!authUser) {
    // 未登录时返回空数据，不报错，前端处理未登录态
    return success({
      pendingApprovalCount: 0,
      myPendingCount: 0,
      rejectedCount: 0,
      monthlyNewProjects: 0,
      activeProjectCount: 0,
      monthlyReceipt: 0,
      monthlyPayment: 0,
      pendingTasks: [],
      myRecentSubmissions: [],
      rejectedSubmissions: [],
      alerts: [],
    })
  }

  const sysUser = await findSystemUserByDingUserId(authUser.userid)
  const systemUserId = sysUser?.id ?? ''

  const data = await getWorkbenchData(
    authUser.userid,
    systemUserId,
    authUser.systemRole
  )

  return success(data)
})

