/**
 * 环境变量配置
 * 统一管理所有环境变量的读取和验证
 */

/**
 * 服务端环境变量
 */
export const serverEnv = {
  // 钉钉配置
  dingtalk: {
    corpId: process.env.DINGTALK_CORP_ID || '',
    clientId: process.env.DINGTALK_CLIENT_ID || '',
    clientSecret: process.env.DINGTALK_CLIENT_SECRET || '',
  },
}

/**
 * 客户端环境变量（可在浏览器中访问）
 */
export const clientEnv = {
  // 钉钉配置
  dingtalk: {
    corpId: process.env.NEXT_PUBLIC_DINGTALK_CORP_ID || '',
    clientId: process.env.NEXT_PUBLIC_DINGTALK_CLIENT_ID || '',
  },
}

/**
 * 验证必要的环境变量是否已配置
 */
export function validateEnv() {
  const missing: string[] = []

  if (!serverEnv.dingtalk.corpId) {
    missing.push('DINGTALK_CORP_ID')
  }
  if (!serverEnv.dingtalk.clientId) {
    missing.push('DINGTALK_CLIENT_ID')
  }
  if (!serverEnv.dingtalk.clientSecret) {
    missing.push('DINGTALK_CLIENT_SECRET')
  }
  if (!clientEnv.dingtalk.corpId) {
    missing.push('NEXT_PUBLIC_DINGTALK_CORP_ID')
  }
  if (!clientEnv.dingtalk.clientId) {
    missing.push('NEXT_PUBLIC_DINGTALK_CLIENT_ID')
  }

  if (missing.length > 0) {
    console.warn(`⚠️ 缺少以下环境变量: ${missing.join(', ')}`)
    return false
  }

  return true
}

