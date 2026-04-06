export interface LedgerRouteContext {
  keyword?: string
  projectId?: string
  contractId?: string
  approvalStatus?: string
  startDate?: string
  endDate?: string
  detailId?: string
  returnPath?: string
}

export function readLedgerRouteContext(search?: string): LedgerRouteContext {
  const params = new URLSearchParams(
    typeof search === 'string'
      ? search
      : (typeof window !== 'undefined' ? window.location.search : '')
  )

  return {
    keyword: params.get('keyword') || undefined,
    projectId: params.get('projectId') || undefined,
    contractId: params.get('contractId') || undefined,
    approvalStatus: params.get('approvalStatus') || undefined,
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    detailId: params.get('detailId') || undefined,
    returnPath: params.get('returnPath') || undefined,
  }
}

export function buildLedgerRouteHref(
  pathname: string,
  params: Record<string, string | null | undefined>
): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildLedgerFilterSummary(params: {
  projectName?: string
  contractName?: string
  keyword?: string
  statusLabel?: string
  startDate?: string
  endDate?: string
}): string {
  const parts: string[] = []
  if (params.projectName) parts.push(`项目：${params.projectName}`)
  if (params.contractName) parts.push(`合同：${params.contractName}`)
  if (params.keyword) parts.push(`关键字：${params.keyword}`)
  if (params.statusLabel) parts.push(`状态：${params.statusLabel}`)
  if (params.startDate || params.endDate) {
    parts.push(`日期：${params.startDate || '开始'} 至 ${params.endDate || '结束'}`)
  }
  return parts.join(' · ') || '当前筛选：全部记录'
}
