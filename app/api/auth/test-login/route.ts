/**
 * 测试登录 API
 * POST /api/auth/test-login
 * 
 * 仅用于测试环境，设置测试用户的登录态
 */

import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const TEST_LOGIN_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_LOGIN === '1'

export async function POST(req: NextRequest) {
  if (!TEST_LOGIN_ENABLED) {
    return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 })
  }

  try {
    // 设置测试用户登录态
    await setAuthCookie({
      userid: 'test_user_001',
      name: '测试账号',
    })

    return NextResponse.json({
      success: true,
      message: '测试登录成功',
    })
  } catch (error) {
    console.error('测试登录失败:', error)
    return NextResponse.json(
      { success: false, error: '测试登录失败' },
      { status: 500 }
    )
  }
}
