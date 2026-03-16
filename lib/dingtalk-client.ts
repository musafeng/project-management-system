/**
 * 钉钉前端客户端工具
 * 用于在浏览器中安全调用钉钉 JSAPI
 */

/**
 * 判断当前是否在钉钉环境中
 */
export function isDingTalkEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // 检查钉钉特有的全局对象
  return !!(window as any).dd || window.location.href.includes('dingtalk')
}

/**
 * 动态加载钉钉 JSAPI SDK
 */
function loadDingTalkSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('不在浏览器环境中'))
      return
    }

    // 如果已经加载过，直接返回
    if ((window as any).dd) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://g.alicdn.com/dingding/dingtalk-pc-api/2.10.0/index.js'
    script.async = true

    script.onload = () => {
      resolve()
    }

    script.onerror = () => {
      reject(new Error('钉钉 SDK 加载失败'))
    }

    document.head.appendChild(script)
  })
}

/**
 * 获取钉钉免登授权码
 * 仅在钉钉环境中有效
 */
export async function getAuthCode(): Promise<string> {
  if (!isDingTalkEnvironment()) {
    throw new Error('当前不在钉钉环境中，无法获取免登授权码')
  }

  try {
    // 加载钉钉 SDK
    await loadDingTalkSDK()

    const dd = (window as any).dd

    if (!dd) {
      throw new Error('钉钉 SDK 加载失败')
    }

    // 调用钉钉 JSAPI 获取免登授权码
    return new Promise((resolve, reject) => {
      dd.ready(() => {
        dd.biz.user.get({
          onSuccess: (result: any) => {
            // 获取免登授权码
            if (result.code) {
              resolve(result.code)
            } else {
              reject(new Error('未能获取授权码'))
            }
          },
          onFail: (error: any) => {
            reject(new Error(`获取授权码失败: ${error.message || '未知错误'}`))
          },
        })
      })
    })
  } catch (error) {
    console.error('获取钉钉免登授权码失败:', error)
    throw error
  }
}

/**
 * 获取当前登录用户信息
 * 通过前端获取 authCode，然后调用后端 API 换取用户信息
 */
export async function getCurrentUser(): Promise<any> {
  try {
    // 1. 获取免登授权码
    const code = await getAuthCode()

    // 2. 调用后端 API 换取用户信息
    const response = await fetch('/api/auth/dingtalk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '获取用户信息失败')
    }

    return result.data
  } catch (error) {
    console.error('获取当前用户信息失败:', error)
    throw error
  }
}

