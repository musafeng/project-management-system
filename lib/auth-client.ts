/**
 * 前端认证客户端工具
 * 用于前端获取和管理当前登录用户状态
 */

/**
 * 登录用户信息
 */
export interface AuthUser {
  userid: string
  name: string
  mobile?: string
  unionid?: string
  deptIds?: number[]
  systemRole?: string
  isActive?: boolean
}

/**
 * API 响应类型
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 获取当前登录用户
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // 包含 cookie
    })

    const result: ApiResponse<AuthUser> = await response.json()

    if (result.success && result.data) {
      return result.data
    }

    return null
  } catch (error) {
    console.error('获取当前登录用户失败:', error)
    return null
  }
}

/**
 * 执行退出登录
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    const result: ApiResponse<any> = await response.json()
    return result.success
  } catch (error) {
    console.error('退出登录失败:', error)
    return false
  }
}

