type ListFilters = {
  keyword?: string
  startDate?: string
  endDate?: string
  projectId?: string
}

function normalizeFilterValue(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function buildListFilters(filters: ListFilters): ListFilters {
  return {
    keyword: normalizeFilterValue(filters.keyword),
    startDate: normalizeFilterValue(filters.startDate),
    endDate: normalizeFilterValue(filters.endDate),
    projectId: normalizeFilterValue(filters.projectId),
  }
}

export function buildListQueryString(filters: ListFilters): string {
  const normalized = buildListFilters(filters)
  const query = new URLSearchParams()

  if (normalized.keyword) query.set('keyword', normalized.keyword)
  if (normalized.startDate) query.set('startDate', normalized.startDate)
  if (normalized.endDate) query.set('endDate', normalized.endDate)
  if (normalized.projectId) query.set('projectId', normalized.projectId)

  return query.toString()
}
