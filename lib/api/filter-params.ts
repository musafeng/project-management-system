export function getMonthDateRange(searchParams: URLSearchParams) {
  const month = searchParams.get('month')?.trim()
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null

  const start = new Date(`${month}-01T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return null

  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  return { gte: start, lt: end }
}

export function applyMonthDateFilter(
  where: Record<string, any>,
  field: string,
  searchParams: URLSearchParams
) {
  const range = getMonthDateRange(searchParams)
  if (range) {
    where[field] = range
  }
}
