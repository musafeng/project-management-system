import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { serverEnv } from '@/lib/env'
import { toChineseErrorMessage } from '@/lib/api/error-message'

export const maxDuration = 60

const MAX_FILE_SIZE = 100 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/octet-stream',
]

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'zip',
  'rar',
  '7z',
])

function getFileExtension(fileName: string) {
  const cleanName = fileName.split('?')[0].split('#')[0]
  const index = cleanName.lastIndexOf('.')
  if (index < 0) return ''
  return cleanName.slice(index + 1).toLowerCase()
}

function isAllowedFile(file: File) {
  const fileType = String(file.type || '').toLowerCase()
  const extension = getFileExtension(file.name)

  if (ALLOWED_TYPES.includes(fileType)) {
    return true
  }

  return extension ? ALLOWED_EXTENSIONS.has(extension) : false
}

function getOssClient() {
  const { region, accessKeyId, accessKeySecret, bucket } = serverEnv.oss
  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw new Error('阿里云 OSS 环境变量未配置，请检查 OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET')
  }
  return new OSS({ region, accessKeyId, accessKeySecret, bucket })
}

function getUploadErrorMessage(input: unknown) {
  const text = input instanceof Error ? input.message : String(input || '')
  const translated = toChineseErrorMessage(text)
  return /[\u4e00-\u9fa5]/.test(translated) ? translated : '上传失败，请稍后重试'
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

    if (!isAllowedFile(file)) {
      const fileType = file.type || '未知类型'
      const extension = getFileExtension(file.name)
      const suffix = extension ? `（.${extension}）` : ''
      return NextResponse.json({ error: `不支持的文件类型：${fileType}${suffix}` }, { status: 400 })
    }

    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_')
    const ossKey = `attachments/${yearMonth}/${Date.now()}-${crypto.randomUUID()}-${safeName}`

    const client = getOssClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await client.put(ossKey, buffer, {
      mime: file.type || undefined,
      headers: { 'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"` },
    })

    const { customDomain } = serverEnv.oss
    const url = customDomain
      ? `https://${customDomain}/${ossKey}`
      : result.url

    return NextResponse.json({ url, key: ossKey, name: file.name, size: file.size })
  } catch (err: any) {
    console.error('[upload] OSS 上传失败:', err)
    return NextResponse.json({ error: getUploadErrorMessage(err) }, { status: 500 })
  }
}
