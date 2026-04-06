'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, Tabs, Tag, Space, Button, Input, Select,
  Modal, message, Tooltip, Badge,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined, CheckOutlined, CloseOutlined,
  EyeOutlined, RollbackOutlined, ReloadOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import {
  APPROVAL_RESOURCE_LABELS,
  APPROVAL_RESOURCE_ROUTE,
  APPROVAL_PAGE_SIZE,
  type ApprovalNavigationState,
  buildApprovalDetailPath,
  buildApprovalFilterSummary,
  buildApprovalListPath,
} from '@/lib/approval-context'
import {
  getApprovalBatchActionHint,
  getApprovalBatchListHint,
  getApprovalErrorMessage,
  getApprovalSuccessMessage,
} from '@/lib/approval-ui'

// ============================================================
// TypeScript 类型
// ============================================================

export interface ApprovalItem {
  id: string           // processInstance.id
  taskId: string       // processTask.id（待我审批时有值）
  resourceType: string
  resourceLabel: string
  resourceId: string
  submitterName: string
  submitterUserId: string
  status: string       // processInstance.status
  taskStatus: string   // processTask.status
  nodeName: string
  nodeOrder: number
  startedAt: string
  taskCreatedAt: string
  canApprove?: boolean
  canRevoke?: boolean
}

type TabKey = 'pending' | 'done' | 'cc' | 'mine'

// ============================================================
// 常量
// ============================================================

const RESOURCE_TYPES = [
  { label: '全部类型', value: '' },
  { label: '施工立项', value: 'construction-approvals' },
  { label: '合同收款', value: 'contract-receipts' },
  { label: '采购合同', value: 'procurement-contracts' },
  { label: '采购付款', value: 'procurement-payments' },
  { label: '劳务合同', value: 'labor-contracts' },
  { label: '劳务付款', value: 'labor-payments' },
  { label: '分包合同', value: 'subcontract-contracts' },
  { label: '分包付款', value: 'subcontract-payments' },
]

const RESOURCE_COLOR: Record<string, string> = {
  'construction-approvals': '#1677ff',
  'contract-receipts': '#2f54eb',
  'procurement-contracts': '#faad14',
  'procurement-payments': '#eb2f96',
  'labor-contracts': '#52c41a',
  'labor-payments': '#722ed1',
  'subcontract-contracts': '#13c2c2',
  'subcontract-payments': '#fa8c16',
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PENDING:  { color: 'orange',  label: '审批中' },
  APPROVED: { color: 'green',   label: '已通过' },
  REJECTED: { color: 'red',     label: '已驳回' },
  CANCELLED:{ color: 'default', label: '已撤销' },
}

// ============================================================
// 工具函数
// ============================================================

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function diffDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ============================================================
// 筛选栏组件
// ============================================================

function FilterBar({
  resourceType, setResourceType, keyword, setKeyword, onSearch, onReset, loading,
}: {
  resourceType: string
  setResourceType: (v: string) => void
  keyword: string
  setKeyword: (v: string) => void
  onSearch: () => void
  onReset: () => void
  loading: boolean
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 0 4px' }}>
      <Select
        value={resourceType}
        onChange={setResourceType}
        options={RESOURCE_TYPES}
        style={{ width: 150 }}
        size="small"
      />
      <Input
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        placeholder="搜索发起人、单号…"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onPressEnter={onSearch}
        style={{ width: 200 }}
        size="small"
      />
      <Button type="primary" size="small" onClick={onSearch} loading={loading} icon={<SearchOutlined />}>查询</Button>
      <Button size="small" onClick={onReset} icon={<ReloadOutlined />}>重置</Button>
    </div>
  )
}

// ============================================================
// 列定义工厂
// ============================================================

function buildColumns(
  tab: TabKey,
  onView: (row: ApprovalItem) => void,
  onApprove: (item: ApprovalItem) => void,
  onReject: (item: ApprovalItem) => void,
  onRevoke: (item: ApprovalItem) => void,
): ColumnsType<ApprovalItem> {
  const cols: ColumnsType<ApprovalItem> = [
    {
      title: '业务类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 110,
      render: (v: string, row) => (
        <Tag color={RESOURCE_COLOR[v] ?? 'blue'} style={{ fontSize: 11 }}>
          {row.resourceLabel}
        </Tag>
      ),
    },
    {
      title: '发起人',
      dataIndex: 'submitterName',
      key: 'submitterName',
      width: 80,
      render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span>,
    },
    {
      title: '当前节点',
      dataIndex: 'nodeName',
      key: 'nodeName',
      width: 100,
      render: (v: string) => <span style={{ color: '#595959', fontSize: 12 }}>{v || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] ?? { color: 'default', label: v }
        return <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
      },
    },
    {
      title: '发起时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 120,
      render: (v: string) => {
        const days = diffDays(v)
        const color = days >= 3 ? '#ff4d4f' : days >= 1 ? '#fa8c16' : '#8c8c8c'
        return (
          <Tooltip title={fmtDate(v)}>
            <span style={{ fontSize: 12, color }}>
              {days === 0 ? '今天' : `${days}天前`}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: tab === 'pending' ? 160 : 80,
      fixed: 'right' as const,
      render: (_: unknown, row: ApprovalItem) => (
        <Space size={4} wrap>
          <Button
            type="link" size="small" icon={<EyeOutlined />}
            onClick={() => onView(row)}
          >查看</Button>
          {tab === 'pending' && row.canApprove && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={() => onApprove(row)}>通过</Button>
              <Button type="link" size="small" icon={<CloseOutlined />} danger onClick={() => onReject(row)}>驳回</Button>
            </>
          )}
          {tab === 'mine' && row.canRevoke && (
            <Button type="link" size="small" icon={<RollbackOutlined />} danger onClick={() => onRevoke(row)}>撤回</Button>
          )}
        </Space>
      ),
    },
  ]
  return cols
}

// ============================================================
// 主页面
// ============================================================

export default function ApprovalCenterPage() {
  const router = useRouter()
  const initialParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
  const initialTab = (initialParams.get('tab') as TabKey | null) || 'pending'
  const initialResourceType = initialParams.get('resourceType') || ''
  const initialKeyword = initialParams.get('keyword') || ''
  const initialPage = Math.max(1, Number(initialParams.get('page') || '1') || 1)
  const initialFocusTaskId = initialParams.get('focusTaskId') || ''
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [resourceType, setResourceType] = useState(initialResourceType)
  const [keyword, setKeyword] = useState(initialKeyword)
  const [page, setPage] = useState(initialPage)
  const [focusTaskId, setFocusTaskId] = useState(initialFocusTaskId)
  const [total, setTotal] = useState(0)
  const [navigation, setNavigation] = useState<ApprovalNavigationState | null>(null)
  // 驳回弹窗
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async (t = tab, rt = resourceType, kw = keyword, nextPage = page, nextFocusTaskId = focusTaskId) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tab: t })
      if (rt) params.set('resourceType', rt)
      if (kw) params.set('keyword', kw)
      params.set('page', String(nextPage))
      params.set('pageSize', String(APPROVAL_PAGE_SIZE))
      if (nextFocusTaskId) params.set('focusTaskId', nextFocusTaskId)
      const res = await fetch(`/api/approval?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setItems(json.data.items)
        setTotal(json.data.total || 0)
        setNavigation(json.data.navigation || null)
      }
      else {
        setItems([])
        setTotal(0)
        setNavigation(null)
        message.error(json.error || '加载失败')
      }
    } catch {
      message.error('网络错误')
      setNavigation(null)
    } finally {
      setLoading(false)
    }
  }, [tab, resourceType, keyword, page, focusTaskId])

  useEffect(() => { load(tab, resourceType, keyword, page, focusTaskId) }, [tab, page]) // eslint-disable-line

  useEffect(() => {
    router.replace(buildApprovalListPath({
      tab,
      resourceType,
      keyword,
      page,
      focusTaskId,
    }), { scroll: false })
  }, [router, tab, resourceType, keyword, page, focusTaskId])

  const handleSearch = () => {
    setPage(1)
    setFocusTaskId('')
    setNavigation(null)
    load(tab, resourceType, keyword, 1, '')
  }
  const handleReset = () => {
    setResourceType('')
    setKeyword('')
    setPage(1)
    setFocusTaskId('')
    setNavigation(null)
    load(tab, '', '', 1, '')
  }

  const handleView = (row: ApprovalItem) => {
    const targetPath = buildApprovalDetailPath(
      {
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        taskId: row.taskId || undefined,
      },
      {
        approvalTab: tab,
        approvalResourceType: resourceType || undefined,
        approvalKeyword: keyword || undefined,
        approvalPage: page,
      },
    )

    if (!targetPath || !APPROVAL_RESOURCE_ROUTE[row.resourceType]) {
      message.error(`暂不支持直接打开${APPROVAL_RESOURCE_LABELS[row.resourceType] || row.resourceLabel}详情`)
      return
    }

    setFocusTaskId(row.taskId || row.resourceId)
    router.push(targetPath)
  }

  const resolveNextApprovalTarget = async (row: ApprovalItem) => {
    try {
      const params = new URLSearchParams({ tab })
      if (resourceType) params.set('resourceType', resourceType)
      if (keyword) params.set('keyword', keyword)
      params.set('page', String(page))
      params.set('pageSize', String(APPROVAL_PAGE_SIZE))
      if (row.taskId) params.set('focusTaskId', row.taskId)
      params.set('focusResourceId', row.resourceId)
      const res = await fetch(`/api/approval?${params.toString()}`, { credentials: 'include' })
      const json = await res.json()
      return json.success ? json.data?.navigation?.next || null : null
    } catch {
      return null
    }
  }

  const refreshAfterAction = async (row: ApprovalItem, nextItem?: {
    resourceType?: string
    resourceId?: string
    taskId?: string
    page?: number
  } | null) => {
    const target = nextItem ?? await resolveNextApprovalTarget(row)
    const nextPage = target?.page || page
    const nextFocusTaskId = target?.taskId || target?.resourceId || ''
    setPage(nextPage)
    setFocusTaskId(nextFocusTaskId)
    await load(tab, resourceType, keyword, nextPage, nextFocusTaskId)
  }

  // 审批通过
  const handleApprove = async (row: ApprovalItem) => {
    setActionLoading(true)
    try {
      const nextItem = await resolveNextApprovalTarget(row)
      const res = await fetch(`/api/${row.resourceType}/${row.resourceId}/approve`, {
        method: 'POST', credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        message.success(`${getApprovalSuccessMessage('approve')}，${getApprovalBatchActionHint(Boolean(nextItem))}`)
        await refreshAfterAction(row, nextItem)
      }
      else message.error(json.error || getApprovalErrorMessage('approve'))
    } catch { message.error(`${getApprovalErrorMessage('approve')}，请检查网络连接`) }
    finally { setActionLoading(false) }
  }

  // 驳回确认
  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    setActionLoading(true)
    try {
      const nextItem = await resolveNextApprovalTarget(rejectTarget)
      const res = await fetch(`/api/${rejectTarget.resourceType}/${rejectTarget.resourceId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      })
      const json = await res.json()
      if (json.success) {
        message.success(`${getApprovalSuccessMessage('reject')}，${getApprovalBatchActionHint(Boolean(nextItem))}`)
        setRejectTarget(null)
        setRejectReason('')
        await refreshAfterAction(rejectTarget, nextItem)
      }
      else message.error(json.error || getApprovalErrorMessage('reject'))
    } catch { message.error(`${getApprovalErrorMessage('reject')}，请检查网络连接`) }
    finally { setActionLoading(false) }
  }

  // 撤回
  const handleRevoke = async (row: ApprovalItem) => {
    Modal.confirm({
      title: '确认撤回？',
      content: '撤回后该单据将回到草稿状态，需重新提交审批。',
      okText: '确认撤回', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const nextItem = await resolveNextApprovalTarget(row)
          const res = await fetch(`/api/${row.resourceType}/${row.resourceId}/cancel`, {
            method: 'POST', credentials: 'include',
          })
          const json = await res.json()
          if (json.success) {
            message.success(`${getApprovalSuccessMessage('cancel')}，${getApprovalBatchActionHint(Boolean(nextItem))}`)
            await refreshAfterAction(row, nextItem)
          }
          else message.error(json.error || getApprovalErrorMessage('cancel'))
        } catch { message.error(`${getApprovalErrorMessage('cancel')}，请检查网络连接`) }
      },
    })
  }

  const columns = buildColumns(tab, handleView, handleApprove, (row) => setRejectTarget(row), handleRevoke)

  const pendingCount = tab === 'pending' ? total : 0
  const approvalSummary = buildApprovalFilterSummary({
    approvalTab: tab,
    approvalResourceType: resourceType || undefined,
    approvalKeyword: keyword || undefined,
    approvalPage: page,
  })

  const tabItems = [
    {
      key: 'pending' as TabKey,
      label: (
        <span>待我审批{pendingCount > 0 && tab === 'pending' && <Badge count={pendingCount} style={{ marginLeft: 6, backgroundColor: '#fa8c16' }} />}</span>
      ),
    },
    { key: 'done' as TabKey, label: '我已处理' },
    { key: 'cc' as TabKey, label: '抄送我' },
    { key: 'mine' as TabKey, label: '我发起的' },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f' }}>审批中心</span>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k as TabKey); setItems([]); setPage(1); setFocusTaskId(''); setNavigation(null) }}
        items={tabItems.map((t) => ({
          key: t.key,
          label: t.label,
          children: (
            <div>
              <FilterBar
                resourceType={resourceType}
                setResourceType={setResourceType}
                keyword={keyword}
                setKeyword={setKeyword}
                onSearch={handleSearch}
                onReset={handleReset}
                loading={loading}
              />
              <Table<ApprovalItem>
                rowKey="id"
                columns={columns}
                dataSource={items}
                loading={loading}
                size="small"
                pagination={{
                  current: page,
                  pageSize: APPROVAL_PAGE_SIZE,
                  total,
                  showTotal: (t) => `共 ${t} 条`,
                  showSizeChanger: false,
                  onChange: (nextPage) => setPage(nextPage),
                }}
                scroll={{ x: 700 }}
                locale={{ emptyText: tab === 'cc' ? '抄送功能即将开放' : tab === 'pending' ? (keyword || resourceType ? '当前筛选结果暂无待处理审批' : '当前暂无待处理审批') : (keyword || resourceType ? '当前筛选结果暂无审批记录' : '当前暂无审批记录') }}
                rowClassName={(row) => {
                  const classes: string[] = []
                  if (tab === 'pending' && diffDays(row.startedAt) >= 3) classes.push('approval-row-urgent')
                  if (focusTaskId && (row.taskId === focusTaskId || row.resourceId === focusTaskId)) classes.push('approval-row-focused')
                  return classes.join(' ')
                }}
              />
              <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
                {getApprovalBatchListHint({
                  summary: approvalSummary,
                  page,
                  pageItemCount: items.length,
                  total,
                  position: navigation?.position,
                  hasNext: Boolean(navigation?.next),
                })}
              </div>
            </div>
          ),
        }))}
      />

      {/* 驳回弹窗 */}
      <Modal
        title="驳回原因"
        open={!!rejectTarget}
        onOk={handleRejectConfirm}
        onCancel={() => { setRejectTarget(null); setRejectReason('') }}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入驳回原因（可选）"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{ marginTop: 12 }}
        />
      </Modal>

      {/* 紧急行样式注入 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .approval-row-urgent td { background: #fff7e6 !important; }
        .approval-row-urgent:hover td { background: #fff1d6 !important; }
        .approval-row-focused td { background: #e6f4ff !important; }
        .approval-row-focused:hover td { background: #d6edff !important; }
      ` }} />
    </div>
  )
}
