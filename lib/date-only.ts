export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return ''

  if (typeof value === 'string') {
    const matched = value.match(/^\d{4}-\d{2}-\d{2}/)
    if (matched) return matched[0]
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateOnlyForStorage(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

export function parseDateOnlyRangeStart(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export function parseDateOnlyRangeEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999`)
}
