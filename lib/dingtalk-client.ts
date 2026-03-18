/**
 * 钉钉前端客户端工具
 * 使用钉钉移动端 H5 JSAPI SDK
 */

import { clientEnv } from '@/lib/env'

/**
 * 判断当前是否在钉钉环境中
 * 同时检查 UA 和 window.dd
 */
export function isDingTalkEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  const hasDDUA = /dingtalk/i.test(navigator.userAgent)
  const hasDDObj = !!(window as any).dd
  return hasDDUA || hasDDObj
}

/**
 * 动态加载钉钉移动端 H5 JSAPI SDK
 * 成功后返回 window.dd 对象
 */
export function loadDingTalkSDK(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('非浏览器环境'))
      return
    }

    // 已加载且可用
    if ((window as any).dd) {
      resolve((window as any).dd)
      return
    }

    // 检查是否已插入过 script（避免重复插入）
    const existing = document.querySelector('script[data-dingtalk-sdk]')
    if (existing) {
      // 等待已有 script 加载完成
      existing.addEventListener('load', () => {
        if ((window as any).dd) {
          resolve((window as any).dd)
        } else {
          reject(new Error('SDK 脚本加载完成但 window.dd 仍不存在'))
        }
      })
      existing.addEventListener('error', () => reject(new Error('SDK 脚本加载失败')))
      return
    }

    const script = document.createElement('script')
    // 钉钉移动端 H5 JSAPI，兼容工作台内嵌 webview
    script.src = 'https://g.alicdn.com/dingding/dingtalk-jsapi/2.10.3/dingtalk.open.js'
    script.setAttribute('data-dingtalk-sdk', '1')
    script.async = true

    script.onload = () => {
      // SDK 加载后 window.dd 可能需要一个微任务才挂载
      setTimeout(() => {
        if ((window as any).dd) {
          resolve((window as any).dd)
        } else {
          reject(new Error('SDK 脚本加载完成但 window.dd 仍为 undefined，可能不在钉钉内置浏览器中'))
        }
      }, 100)
    }

    script.onerror = () => reject(new Error('钉钉 SDK 脚本加载失败，请检查网络或 CSP 配置'))

    document.head.appendChild(script)
  })
}

/**
 * 获取钉钉免登授权码
 */
export async function getAuthCode(): Promise<string> {
  const dd = await loadDingTalkSDK()
  const corpId = clientEnv.dingtalk.corpId

  return new Promise((resolve, reject) => {
    dd.ready(() => {
      dd.runtime.permission.requestAuthCode({
        corpId,
        onSuccess: (info: any) => {
          if (info?.code) {
            resolve(info.code)
          } else {
            reject(new Error('requestAuthCode 成功但未返回 code，响应：' + JSON.stringify(info)))
          }
        },
        onFail: (err: any) => {
          reject(new Error('requestAuthCode 失败：' + (err?.message || JSON.stringify(err))))
        },
      })
    })

    // 监听 dd.error，防止 ready 永不触发
    if (typeof dd.error === 'function') {
      dd.error((err: any) => {
        reject(new Error('dd.error 触发：' + (err?.message || JSON.stringify(err))))
      })
    }
  })
}

/**
 * 获取当前登录用户信息
 * 内部：获取 authCode → POST /api/auth/dingtalk → 写入 cookie
 */
export async function getCurrentUser(): Promise<any> {
  const code = await getAuthCode()

  const res = await fetch('/api/auth/dingtalk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  })

  const data = await res.json()

  if (!data.success) {
    throw new Error(data.error || '钉钉登录接口失败')
  }

  return data.data
}
