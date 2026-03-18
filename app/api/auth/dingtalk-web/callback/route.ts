import { NextRequest, NextResponse } from 'next/server'
import { getUserByWebCode } from '@/lib/dingtalk'
import { setAuthCookie } from '@/lib/auth'
import {
  upsertSystemUserFromDingTalkUser,
  getSystemUserRoleAndStatus,
} from '@/lib/system-user'
import { isSystemManager } from '@/lib/api/auth'
import type { AuthenticatedUser } from '@/lib/api/auth'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/dingtalk-web/callback
 * 接收钉钉网页 OAuth2.0 登录回调
 * 换取用户身份 → 同步 SystemUser → 写入登录 cookie → 跳转 /admin
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  // 钉钉回调携带了 error 参数（用户拒绝等）
  if (errorParam) {
    const msg = encodeURIComponent(`钉钉登录被拒绝: ${errorParam}`)
    return NextResponse.redirect(`${origin}/admin?error=${msg}`)
  }

  if (!code) {
    const msg = encodeURIComponent('缺少授权码 code')
    return NextResponse.redirect(`${origin}/admin?error=${msg}`)
  }

  try {
    // 1. 通过网页登录 code 获取用户信息
    const userInfo = await getUserByWebCode(code)

    // 2. 同步 / 更新 SystemUser 表
    await upsertSystemUserFromDingTalkUser(userInfo)

    // 3. 写入登录态 cookie（与钉钉工作台免登完全相同）
    await setAuthCookie({
      userid: userInfo.userid,
      name: userInfo.name,
      mobile: userInfo.mobile,
      unionid: userInfo.unionid,
      deptIds: userInfo.deptIds,
    })

    // 4. 检查是否系统管理员
    const systemUserInfo = await getSystemUserRoleAndStatus(userInfo.userid)
    const authUser: AuthenticatedUser = {
      userid: userInfo.userid,
      name: userInfo.name,
      systemRole: systemUserInfo?.systemRole ?? ('STAFF' as AuthenticatedUser['systemRole']),
      isActive: systemUserInfo?.isActive ?? true,
    }

    if (!isSystemManager(authUser)) {
      const msg = encodeURIComponent('您没有管理后台访问权限，请联系系统管理员')
      return NextResponse.redirect(`${origin}/admin?error=${msg}`)
    }

    // 5. 登录成功，跳转管理后台首页
    return NextResponse.redirect(`${origin}/admin/dashboard`)
  } catch (err: unknown) {
    console.error('[dingtalk-web/callback]', err)
    const msg = encodeURIComponent(
      err instanceof Error ? err.message : '登录失败，请重试'
    )
    return NextResponse.redirect(`${origin}/admin?error=${msg}`)
  }
}
