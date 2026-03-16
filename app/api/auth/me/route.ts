/**
 * 获取当前登录用户 API
 * GET /api/auth/me
 * 
 * 返回当前登录态中的用户信息
 * 如果 cookie 中有钉钉用户但数据库中没有系统用户，会自动补同步一次
 */

import { apiHandler, success, BadRequestError } from '@/lib/api'
import { getAuthCookie } from '@/lib/auth'
import { getSystemUserRoleAndStatus, upsertSystemUserFromDingTalkUser } from '@/lib/system-user'
import { getUserDetail } from '@/lib/dingtalk'

export const GET = apiHandler(async (req) => {
  try {
    // 从 cookie 中获取登录用户信息
    const user = await getAuthCookie()

    if (!user) {
      throw new BadRequestError('未登录')
    }

    // 获取用户的系统角色和活跃状态
    let systemUserInfo = await getSystemUserRoleAndStatus(user.userid)

    // 如果系统用户不存在，尝试自动补同步一次
    if (!systemUserInfo) {
      try {
        // 从钉钉获取完整用户信息
        const dingTalkUser = await getUserDetail(user.userid)
        // 同步到系统用户表
        await upsertSystemUserFromDingTalkUser(dingTalkUser)
        // 再次获取系统用户信息
        systemUserInfo = await getSystemUserRoleAndStatus(user.userid)
      } catch (error) {
        console.warn('自动补同步系统用户失败:', error)
        // 补同步失败不影响登录，继续返回用户信息
      }
    }

    return success({
      userid: user.userid,
      name: user.name,
      mobile: user.mobile,
      unionid: user.unionid,
      deptIds: user.deptIds,
      systemRole: systemUserInfo?.systemRole,
      isActive: systemUserInfo?.isActive,
    })
  } catch (error) {
    console.error('获取当前登录用户失败:', error)

    if (error instanceof Error) {
      throw new BadRequestError(error.message)
    }

    throw new BadRequestError('获取用户信息失败')
  }
})

