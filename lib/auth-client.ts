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
 * 等待登录态落盘后再返回用户信息。
 * 用于避免页面首屏先于 layout 自动登录完成，导致权限被误判为空。
 */
export async function waitForCurrentAuthUser(
  maxAttempts = 5,
  delayMs = 300
): Promise<AuthUser | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const user = await getCurrentAuthUser()
    if (user?.systemRole) {
      return user
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return null
}

/**
 * 监听前端登录态恢复，并在页面重新获得焦点或可见时重新拉取当前用户。
 * 用于避免首屏加载过早导致权限一直停留在未登录态。
 */
export function watchCurrentAuthUser(
  onChange: (user: AuthUser | null) => void
): () => void {
  let active = true

  const refresh = async () => {
    const user = await waitForCurrentAuthUser()
    if (active) {
      onChange(user)
    }
  }

  const handleFocus = () => {
    void refresh()
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void refresh()
    }
  }

  void refresh()
  window.addEventListener('focus', handleFocus)
  window.addEventListener('pageshow', handleFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    active = false
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('pageshow', handleFocus)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
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
