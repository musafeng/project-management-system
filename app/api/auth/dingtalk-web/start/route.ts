import { NextRequest, NextResponse } from 'next/server'
import { generateWebLoginUrl } from '@/lib/dingtalk'
import { serverEnv } from '@/lib/env'

// 强制动态渲染，禁止静态预渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/dingtalk-web/start
 * 生成钉钉网页 OAuth2.0 登录 URL 并重定向
 * 管理后台浏览器登录专用，不依赖钉钉容器
 */
export async function GET(req: NextRequest) {
  try {
    const redirectUri = serverEnv.dingtalk.webLoginRedirectUri
    const loginUrl = generateWebLoginUrl(redirectUri, 'admin')
    return NextResponse.redirect(loginUrl)
  } catch (err: unknown) {
    console.error('[dingtalk-web/start]', err)
    const msg = encodeURIComponent(
      err instanceof Error ? err.message : '生成登录链接失败'
    )
    const base = req.nextUrl.origin
    return NextResponse.redirect(`${base}/admin?error=${msg}`)
  }
}
