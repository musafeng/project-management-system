import { getApprovalBatchPositionHint } from '@/lib/approval-ui'

export type ApprovalTabKey = 'pending' | 'done' | 'cc' | 'mine'
export const APPROVAL_PAGE_SIZE = 20

export interface ApprovalRouteContext {
  approvalTab?: ApprovalTabKey
  approvalResourceType?: string
  approvalKeyword?: string
  approvalPage?: number
  approvalTaskId?: string
  approvalResourceId?: string
  returnPath?: string
}

export interface ApprovalNavigationItem {
  resourceType: string
  resourceId: string
  taskId?: string
  page?: number
}

export interface ApprovalNavigationState {
  position: number
  total: number
  prev?: ApprovalNavigationItem
  next?: ApprovalNavigationItem
}

export const APPROVAL_RESOURCE_ROUTE: Record<string, string> = {
  'construction-approvals': '/construction-approvals',
  'contract-receipts': '/contract-receipts',
  'procurement-contracts': '/procurement-contracts',
  'procurement-payments': '/procurement-payments',
  'labor-contracts': '/labor-contracts',
  'labor-payments': '/labor-payments',
  'subcontract-contracts': '/subcontract-contracts',
  'subcontract-payments': '/subcontract-payments',
}

export const APPROVAL_TAB_LABELS: Record<ApprovalTabKey, string> = {
  pending: '待我审批',
  done: '我已处理',
  cc: '抄送我',
  mine: '我发起的',
}

export const APPROVAL_RESOURCE_LABELS: Record<string, string> = {
  'construction-approvals': '施工立项',
  'contract-receipts': '合同收款',
  'procurement-contracts': '采购合同',
  'procurement-payments': '采购付款',
  'labor-contracts': '劳务合同',
  'labor-payments': '劳务付款',
  'subcontract-contracts': '分包合同',
  'subcontract-payments': '分包付款',
}

export function buildApprovalRouteHref(
  pathname: string,
  params: Record<string, string | number | null | undefined>
): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function readApprovalRouteContext(search?: string): ApprovalRouteContext {
  const params = new URLSearchParams(
    typeof search === 'string'
      ? search
      : (typeof window !== 'undefined' ? window.location.search : '')
  )

  const pageValue = Number(params.get('approvalPage') || '')

  return {
    approvalTab: (params.get('approvalTab') as ApprovalTabKey | null) || undefined,
    approvalResourceType: params.get('approvalResourceType') || undefined,
    approvalKeyword: params.get('approvalKeyword') || undefined,
    approvalPage: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : undefined,
    approvalTaskId: params.get('approvalTaskId') || undefined,
    approvalResourceId: params.get('approvalResourceId') || undefined,
    returnPath: params.get('returnPath') || undefined,
  }
}

export function buildApprovalListPath(params: {
  tab?: string
  resourceType?: string
  keyword?: string
  page?: number
  focusTaskId?: string
}): string {
  return buildApprovalRouteHref('/approval', {
    tab: params.tab || 'pending',
    resourceType: params.resourceType,
    keyword: params.keyword,
    page: params.page,
    focusTaskId: params.focusTaskId,
  })
}

export function buildApprovalDetailPath(
  item: ApprovalNavigationItem,
  context: ApprovalRouteContext
): string | null {
  const pathname = APPROVAL_RESOURCE_ROUTE[item.resourceType]
  if (!pathname) return null

  const returnPath = buildApprovalListPath({
    tab: context.approvalTab || 'pending',
    resourceType: context.approvalResourceType,
    keyword: context.approvalKeyword,
    page: context.approvalPage || 1,
    focusTaskId: item.taskId || item.resourceId,
  })

  return buildApprovalRouteHref(pathname, {
    detailId: item.resourceId,
    returnPath,
    approvalTab: context.approvalTab || 'pending',
    approvalResourceType: context.approvalResourceType,
    approvalKeyword: context.approvalKeyword,
    approvalPage: context.approvalPage || 1,
    approvalTaskId: item.taskId,
    approvalResourceId: item.resourceId,
  })
}

export function buildApprovalFilterSummary(context: ApprovalRouteContext): string {
  const parts: string[] = []
  if (context.approvalTab) parts.push(APPROVAL_TAB_LABELS[context.approvalTab] || context.approvalTab)
  if (context.approvalResourceType) {
    parts.push(APPROVAL_RESOURCE_LABELS[context.approvalResourceType] || context.approvalResourceType)
  }
  if (context.approvalKeyword) parts.push(`关键字：${context.approvalKeyword}`)
  if (context.approvalPage) parts.push(`审批列表第 ${context.approvalPage} 页`)
  return parts.join(' · ') || '当前审批结果'
}

export function buildApprovalPositionSummary(
  context: ApprovalRouteContext,
  navigation?: ApprovalNavigationState | null
): string {
  return getApprovalBatchPositionHint({
    summary: buildApprovalFilterSummary(context),
    position: navigation?.position,
    total: navigation?.total,
    hasNext: Boolean(navigation?.next),
  })
}
