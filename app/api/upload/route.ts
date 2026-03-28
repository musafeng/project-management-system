import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { serverEnv } from '@/lib/env'

// 关闭默认 bodyParser，允许接收大文件（App Router Route Handler 配置）
export const config = {
  api: {
    bodyParser: false,
  },
}

// 允许最大 100MB 请求体
export const maxDuration = 60 // 秒，防止大文件上传超时

// 文件大小限制：100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

// 允许的文件类型
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
]

function getOssClient() {
  const { region, accessKeyId, accessKeySecret, bucket } = serverEnv.oss
  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw new Error('阿里云 OSS 环境变量未配置，请检查 OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET')
  }
  return new OSS({ region, accessKeyId, accessKeySecret, bucket })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '未收到文件' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `文件超过 100MB 限制，当前大小：${(file.size / 1024 / 1024).toFixed(1)}MB` }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `不支持的文件类型：${file.type}` }, { status: 400 })
    }

    // 构造 OSS 对象路径：attachments/年月/时间戳-原文件名
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_')
    const ossKey = `attachments/${yearMonth}/${Date.now()}-${safeName}`

    const client = getOssClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await client.put(ossKey, buffer, {
      mime: file.type,
      headers: { 'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"` },
    })

    // 优先使用自定义域名
    const { customDomain, bucket, region } = serverEnv.oss
    const url = customDomain
      ? `https://${customDomain}/${ossKey}`
      : result.url

    return NextResponse.json({ url, key: ossKey, name: file.name, size: file.size })
  } catch (err: any) {
    console.error('[upload] OSS 上传失败:', err)
    return NextResponse.json({ error: err.message || '上传失败，请稍后重试' }, { status: 500 })
  }
}

