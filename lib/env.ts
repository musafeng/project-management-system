/**
 * 环境变量配置
 * 统一管理所有环境变量的读取和验证
 */

/**
 * 服务端环境变量
 */
export const serverEnv = {
  // 阿里云 OSS 配置
  oss: {
    region: process.env.OSS_REGION || '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    customDomain: process.env.OSS_CUSTOM_DOMAIN || '',
  },
  // 钉钉配置
  dingtalk: {
    corpId: process.env.DINGTALK_CORP_ID || '',
    clientId: process.env.DINGTALK_CLIENT_ID || '',
    clientSecret: process.env.DINGTALK_CLIENT_SECRET || '',
    agentId: process.env.DINGTALK_AGENT_ID || '',
    // 浏览器网页登录回调地址（部署后的完整 URL）
    webLoginRedirectUri: process.env.DINGTALK_WEB_LOGIN_REDIRECT_URI || 'https://hhyb.cc/api/auth/dingtalk-web/callback',
  },
  // 系统管理白名单（逗号分隔的 dingUserId 列表）
  systemManagerIds: (process.env.SYSTEM_MANAGER_DING_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
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
  // 系统管理白名单（逗号分隔的 dingUserId，前端用于菜单过滤）
  systemManagerIds: (process.env.NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}
