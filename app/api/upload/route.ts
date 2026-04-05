import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { serverEnv } from '@/lib/env'

// 允许最大 100MB 请求体，防止大文件上传超时
export const maxDuration = 60

// 文件大小限制：100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

// 允许的文件类型
// 包括：图片、PDF、Office 文档、压缩包、文本文件
const ALLOWED_TYPES = [
  // 图片
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 压缩包
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // 文本
  'text/plain',
  'text/csv',
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
      return NextResponse.json(
        { success: false, error: '未收到文件' },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `文件超过 100MB 限制，当前大小：${(file.size / 1024 / 1024).toFixed(1)}MB`,
        },
        { status: 400 }
      )
    }

    // 验证文件类型
    // 注意：某些浏览器可能不正确识别 MIME 类型，所以也检查文件扩展名
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = ALLOWED_TYPES.includes(file.type) || isValidFileExtension(fileExtension)

    if (!isValidType) {
      return NextResponse.json(
        {
          success: false,
          error: `不支持的文件类型：${file.type || fileExtension}。支持的类型：图片、PDF、Office 文档、压缩包、文本文件`,
        },
        { status: 400 }
      )
    }

    // 构造 OSS 对象路径：attachments/年月/时间戳-原文件名
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_')
    const ossKey = `attachments/${yearMonth}/${Date.now()}-${safeName}`

    const client = getOssClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await client.put(ossKey, buffer, {
      mime: file.type || 'application/octet-stream',
      headers: { 'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"` },
    })

    // 优先使用自定义域名
    const { customDomain } = serverEnv.oss
    const url = customDomain
      ? `https://${customDomain}/${ossKey}`
      : result.url

    // 响应格式兼容性说明：
    // - 新格式：{ success: true, data: { url, key, name, size } }
    // - 旧格式：{ url, key, name, size }
    // 
    // 为了兼容旧前端，同时返回两种格式的字段
    // 旧前端可以直接从顶层获取 url/key/name/size
    // 新前端可以从 data 中获取
    return NextResponse.json({
      success: true,
      // 新格式：data 对象
      data: {
        url,
        key: ossKey,
        name: file.name,
        size: file.size,
      },
      // 旧格式兼容：顶层字段
      url,
      key: ossKey,
      name: file.name,
      size: file.size,
    })
  } catch (err: any) {
    console.error('[upload] OSS 上传失败:', err)

    // 区分不同的错误类型
    let errorMessage = '上传失败，请稍后重试'
    let statusCode = 500

    if (err.message?.includes('环境变量未配置')) {
      errorMessage = '服务器配置错误，请联系管理员'
      statusCode = 500
    } else if (err.message?.includes('AccessDenied')) {
      errorMessage = '上传权限不足，请联系管理员'
      statusCode = 403
    } else if (err.message?.includes('NoSuchBucket')) {
      errorMessage = '存储桶不存在，请联系管理员'
      statusCode = 500
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

/**
 * 根据文件扩展名验证文件类型
 * 用于处理某些浏览器 MIME 类型识别不准确的情况
 */
function isValidFileExtension(ext?: string): boolean {
  if (!ext) return false

  const validExtensions = [
    // 图片
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
    // PDF
    'pdf',
    // Word
    'doc', 'docx',
    // Excel
    'xls', 'xlsx',
    // PowerPoint
    'ppt', 'pptx',
    // 压缩包
    'zip', 'rar', '7z',
    // 文本
    'txt', 'csv',
  ]

  return validExtensions.includes(ext)
}

