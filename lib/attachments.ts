export function getAttachmentDisplayName(url?: string | null) {
  if (!url) return ''
  const parts = url.split('/')
  const raw = parts[parts.length - 1] || ''
  const name = raw.replace(/^\d+-/, '').replace(/^[0-9a-f-]{36}-/i, '')
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

export type AttachmentPreviewType = 'image' | 'pdf' | 'office' | 'text' | 'download'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])
const PDF_EXTENSIONS = new Set(['pdf'])
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx'])
const TEXT_EXTENSIONS = new Set(['csv', 'txt'])

export function getAttachmentExtension(url?: string | null): string {
  const name = getAttachmentDisplayName(url)
  const cleanName = name.split('?')[0].split('#')[0]
  const index = cleanName.lastIndexOf('.')
  return index >= 0 ? cleanName.slice(index + 1).toLowerCase() : ''
}

export function getAttachmentPreviewType(url?: string | null): AttachmentPreviewType {
  const ext = getAttachmentExtension(url)
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (PDF_EXTENSIONS.has(ext)) return 'pdf'
  if (OFFICE_EXTENSIONS.has(ext)) return 'office'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  return 'download'
}

export function canPreviewAttachmentInline(url?: string | null): boolean {
  return getAttachmentPreviewType(url) !== 'download'
}

export function getAttachmentOpenUrl(url: string): string {
  return `/api/attachments/open?url=${encodeURIComponent(url)}`
}

export function getAttachmentResolveUrl(url: string): string {
  return `/api/attachments/open?format=json&url=${encodeURIComponent(url)}`
}

function normalizeUrl(url: unknown): string | null {
  const value = typeof url === 'string' ? url.trim() : ''
  return value || null
}

export function parseAttachmentUrls(value: unknown): string[] {
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []

  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === 'string') return normalizeUrl(item)
            if (item && typeof item === 'object') {
              return normalizeUrl((item as { url?: unknown }).url)
            }
            return null
          })
          .filter((item): item is string => Boolean(item))
      }
    } catch {
      return trimmed ? [trimmed] : []
    }
  }

  return [trimmed]
}

export function serializeAttachmentUrls(urls: string[]): string | null {
  const normalized = Array.from(
    new Set(
      urls
        .map((item) => normalizeUrl(item))
        .filter((item): item is string => Boolean(item))
    )
  )

  if (normalized.length === 0) return null
  if (normalized.length === 1) return normalized[0]
  return JSON.stringify(normalized)
}

export function summarizeAttachmentUrls(value: string | null | undefined): string {
  const urls = parseAttachmentUrls(value)
  if (urls.length === 0) return ''
  return urls.join('\n')
}
