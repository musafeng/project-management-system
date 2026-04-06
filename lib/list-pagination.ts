export interface PaginatedListResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PaginationQuery {
  paginated: boolean
  page: number
  pageSize: number
  skip: number
  take: number
}

export function parsePaginationParams(searchParams: URLSearchParams, defaultPageSize = 20): PaginationQuery {
  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const rawPageSize = parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = Math.min(Math.max(Number.isFinite(rawPageSize) ? rawPageSize : defaultPageSize, 1), 100)
  return {
    paginated: searchParams.has('page') || searchParams.has('pageSize'),
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

export function isPaginatedListResult<T>(value: unknown): value is PaginatedListResult<T> {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return Array.isArray(data.items) && typeof data.total === 'number'
}

export function normalizePaginatedList<T>(
  value: T[] | PaginatedListResult<T> | undefined,
  fallbackPage = 1,
  fallbackPageSize = 20,
): PaginatedListResult<T> {
  if (isPaginatedListResult<T>(value)) return value
  const items = Array.isArray(value) ? value : []
  return {
    items,
    total: items.length,
    page: fallbackPage,
    pageSize: fallbackPageSize,
  }
}

export function appendPaginationParams(params: URLSearchParams, page: number, pageSize: number) {
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
}

export function getPageAfterDelete(currentPage: number, currentItemsLength: number) {
  if (currentItemsLength <= 1 && currentPage > 1) {
    return currentPage - 1
  }
  return currentPage
}
