/**
 * 退出登录 API
 * POST /api/auth/logout
 * 
 * 清除登录态 cookie
 */

import { apiHandler, success } from '@/lib/api'
import { clearAuthCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'


export const POST = apiHandler(async (req) => {
  try {
    // 清除登录态 cookie
    await clearAuthCookie()

    return success({
      message: '已退出登录',
    })
  } catch (error) {
    console.error('退出登录失败:', error)
    throw error
  }
})
