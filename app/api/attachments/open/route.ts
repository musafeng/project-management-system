import { NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { BadRequestError, getCurrentUser } from '@/lib/api'
import { serverEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

const ATTACHMENT_PREFIX = 'attachments/'
const SIGNED_URL_EXPIRES_SECONDS = 10 * 60

const INLINE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf'])

function getOssClient() {
  const { region, accessKeyId, accessKeySecret, bucket } = serverEnv.oss
  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw new Error('阿里云 OSS 环境变量未配置，请检查 OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET')
  }
  return new OSS({ region, accessKeyId, accessKeySecret, bucket, secure: true })
}

function decodeObjectKey(rawKey: string) {
  try {
    return decodeURIComponent(rawKey)
  } catch {
    return rawKey
  }
}

function extractAttachmentObjectKey(rawUrl: string) {
  const input = rawUrl.trim()
  if (!input) throw new BadRequestError('缺少附件地址')

  if (input.startsWith(ATTACHMENT_PREFIX)) {
    return input
  }

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    throw new BadRequestError('附件地址格式无效')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestError('附件地址格式无效')
  }

  const objectKey = decodeObjectKey(parsed.pathname.replace(/^\/+/, ''))
  if (!objectKey.startsWith(ATTACHMENT_PREFIX)) {
    throw new BadRequestError('附件地址不属于系统附件目录')
  }

  return objectKey
}

function getFileExtension(objectKey: string): string {
  const name = objectKey.split('/').pop() || ''
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function attachmentErrorResponse(message: string, status = 400, wantsJson = false) {
  if (wantsJson) {
    return NextResponse.json({ success: false, error: message }, { status })
  }

  return new NextResponse(
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>附件打开失败</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;margin:0;padding:24px;color:#1f1f1f}
    .card{max-width:560px;margin:12vh auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 6px 24px rgba(0,0,0,.08)}
    h1{font-size:20px;margin:0 0 12px}
    p{line-height:1.7;margin:0;color:#595959}
  </style>
</head>
<body>
  <div class="card">
    <h1>附件打开失败</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams
  const wantsJson = searchParams.get('format') === 'json'

  try {
    await getCurrentUser()
    const rawUrl = new URL(req.url).searchParams.get('url')
    if (!rawUrl) throw new BadRequestError('缺少附件地址')

    const objectKey = extractAttachmentObjectKey(rawUrl)
    const client = getOssClient()

    const ext = getFileExtension(objectKey)
    const isInline = INLINE_EXTENSIONS.has(ext)

    const signedUrl = client.signatureUrl(objectKey, {
      expires: SIGNED_URL_EXPIRES_SECONDS,
      method: 'GET',
      ...(isInline ? { response: { 'content-disposition': 'inline' } } : {}),
    })

    if (wantsJson) {
      return NextResponse.json({ success: true, data: { url: signedUrl, inline: isInline } })
    }

    const response = NextResponse.redirect(signedUrl, 302)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : '附件打开失败'
    const message = rawMessage.includes('未登录') || rawMessage.includes('登录已失效')
      ? '未登录或登录已失效，请重新登录后再打开附件'
      : rawMessage.includes('无权限')
        ? '无权限打开该附件'
        : rawMessage || '附件打开失败'
    const status = message.includes('未登录') ? 401 : message.includes('无权限') ? 403 : 400
    console.error('[附件打开失败]', error)
    return attachmentErrorResponse(message, status, wantsJson)
  }
}
