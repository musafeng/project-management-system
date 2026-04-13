export function getAttachmentDisplayName(url?: string | null) {
  if (!url) return ''
  const parts = url.split('/')
  const raw = parts[parts.length - 1] || ''
  const name = raw.replace(/^\d+-/, '')
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
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
