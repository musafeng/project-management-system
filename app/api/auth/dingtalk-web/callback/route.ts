import { NextRequest, NextResponse } from 'next/server'
import { getUserByWebCode } from '@/lib/dingtalk'
import { setAuthCookie } from '@/lib/auth'
import {
  upsertSystemUserFromDingTalkUser,
  getSystemUserRoleAndStatus,
} from '@/lib/system-user'
import { isSystemManager } from '@/lib/api/auth'
import type { AuthenticatedUser } from '@/lib/api/auth'
import { serverEnv } from '@/lib/env'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 推算真实的站点 origin
 * 优先从 DINGTALK_WEB_LOGIN_REDIRECT_URI 中提取（最可靠）
 * 次选 x-forwarded-proto + x-forwarded-host header
 * 最后才 fallback 到 req.nextUrl.origin
 */
function resolveOrigin(req: NextRequest): string {
  // 1. 从回调地址环境变量推算（最可靠）
  const redirectUri = serverEnv.dingtalk.webLoginRedirectUri
  if (redirectUri) {
    try {
      const u = new URL(redirectUri)
      return u.origin
    } catch {}
  }

  // 2. 反向代理 header
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`

  // 3. 原始 origin（可能是 0.0.0.0，仅本地开发时用）
  return req.nextUrl.origin
}

/**
 * GET /api/auth/dingtalk-web/callback
 * 接收钉钉网页 OAuth2.0 登录回调
 * 换取用户身份 → 同步 SystemUser → 写入登录 cookie → 跳转 /admin
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const origin = resolveOrigin(req)

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
