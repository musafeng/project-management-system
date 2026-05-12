import { NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { apiHandlerWithPermissionAndLog, BadRequestError } from '@/lib/api'
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

export const { GET } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
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

    const response = NextResponse.redirect(signedUrl, 302)
    response.headers.set('Cache-Control', 'no-store')
    return response
  },
})
