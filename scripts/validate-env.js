#!/usr/bin/env node

const { loadEnvConfig } = require('@next/env')

loadEnvConfig(process.cwd())

const mode = process.argv[2] || 'check'
const strict = mode === 'build' || mode === 'start'

const REQUIRED_ENV = [
  'DATABASE_URL',
  'DINGTALK_CORP_ID',
  'DINGTALK_CLIENT_ID',
  'DINGTALK_CLIENT_SECRET',
  'DINGTALK_AGENT_ID',
  'DINGTALK_WEB_LOGIN_REDIRECT_URI',
  'NEXT_PUBLIC_DINGTALK_CORP_ID',
  'NEXT_PUBLIC_DINGTALK_CLIENT_ID',
  'SYSTEM_MANAGER_DING_USER_IDS',
  'NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS',
  'OSS_REGION',
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
  'OSS_BUCKET',
]

function readEnv(name) {
  return (process.env[name] || '').trim()
}

function assertUrl(name, value, errors) {
  if (!value) return
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push(`${name} 必须是 http/https URL`)
    }
  } catch {
    errors.push(`${name} 不是合法 URL`)
  }
}

const missing = REQUIRED_ENV.filter((key) => !readEnv(key))
const errors = []

assertUrl('DINGTALK_WEB_LOGIN_REDIRECT_URI', readEnv('DINGTALK_WEB_LOGIN_REDIRECT_URI'), errors)

if (
  readEnv('SYSTEM_MANAGER_DING_USER_IDS') &&
  readEnv('NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS') &&
  readEnv('SYSTEM_MANAGER_DING_USER_IDS') !== readEnv('NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS')
) {
  errors.push('SYSTEM_MANAGER_DING_USER_IDS 与 NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS 必须保持一致')
}

if (
  readEnv('DINGTALK_CORP_ID') &&
  readEnv('NEXT_PUBLIC_DINGTALK_CORP_ID') &&
  readEnv('DINGTALK_CORP_ID') !== readEnv('NEXT_PUBLIC_DINGTALK_CORP_ID')
) {
  errors.push('DINGTALK_CORP_ID 与 NEXT_PUBLIC_DINGTALK_CORP_ID 必须保持一致')
}

if (
  readEnv('DINGTALK_CLIENT_ID') &&
  readEnv('NEXT_PUBLIC_DINGTALK_CLIENT_ID') &&
  readEnv('DINGTALK_CLIENT_ID') !== readEnv('NEXT_PUBLIC_DINGTALK_CLIENT_ID')
) {
  errors.push('DINGTALK_CLIENT_ID 与 NEXT_PUBLIC_DINGTALK_CLIENT_ID 必须保持一致')
}

if (missing.length === 0 && errors.length === 0) {
  console.log(`[env] ${mode} 环境校验通过`)
  process.exit(0)
}

const lines = [
  `[env] ${mode} 环境校验${strict ? '失败' : '警告'}`,
]

if (missing.length > 0) {
  lines.push(`缺少变量: ${missing.join(', ')}`)
}

if (errors.length > 0) {
  lines.push(...errors.map((item) => `校验错误: ${item}`))
}

lines.push('请参考 .env.example 补齐配置后再继续。')

const output = lines.join('\n')

if (strict) {
  console.error(output)
  process.exit(1)
}

console.warn(output)
