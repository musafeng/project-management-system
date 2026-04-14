/**
 * 钉钉免登录认证 API
 * POST /api/auth/dingtalk
 * 
 * 用于前端通过免登授权码换取当前用户身份信息
 * 成功后会自动写入登录态 cookie 并同步到系统用户表
 */

import { apiHandler, success, BadRequestError } from '@/lib/api'
import { toChineseErrorMessage } from '@/lib/api/error-message'
import { getUserByCode } from '@/lib/dingtalk'
import { setAuthCookie } from '@/lib/auth'
import { upsertSystemUserFromDingTalkUser, getSystemUserRoleAndStatus, getSystemUserDeptInfo } from '@/lib/system-user'

export const dynamic = 'force-dynamic'


export const POST = apiHandler(async (req) => {
  try {
    const body = await req.json()

    // 验证 code 参数
    if (!body.code || typeof body.code !== 'string') {
      throw new BadRequestError('缺少必要参数: code')
    }

    // 通过 code 获取用户信息
    const userInfo = await getUserByCode(body.code)

    // 同步用户到系统用户表
    await upsertSystemUserFromDingTalkUser(userInfo)

    // 获取用户的系统角色和活跃状态
    const systemUserInfo = await getSystemUserRoleAndStatus(userInfo.userid)

    // 获取同步后的部门信息
    const deptInfo = await getSystemUserDeptInfo(userInfo.userid)

    // 写入登录态 cookie
    await setAuthCookie({
      userid: userInfo.userid,
      name: userInfo.name,
      mobile: userInfo.mobile,
      unionid: userInfo.unionid,
      deptIds: userInfo.deptIds,
    })

    // 返回用户信息（包含系统角色、活跃状态和部门信息）
    return success({
      userid: userInfo.userid,
      name: userInfo.name,
      mobile: userInfo.mobile,
      unionid: userInfo.unionid,
      deptIds: deptInfo.deptIds,
      deptNames: deptInfo.deptNames,
      email: userInfo.email,
      avatar: userInfo.avatar,
      systemRole: systemUserInfo?.systemRole,
      isActive: systemUserInfo?.isActive,
    })
  } catch (error) {
    console.error('钉钉认证失败:', error)

    if (error instanceof BadRequestError) {
      throw error
    }

    if (error instanceof Error) {
      throw new BadRequestError(`认证失败：${toChineseErrorMessage(error.message)}`)
    }

    throw new BadRequestError('认证失败：请稍后重试')
  }
})
