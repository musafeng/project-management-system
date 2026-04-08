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
  { label: '项目合同变更', value: 'project-contract-changes' },
  { label: '采购合同', value: 'procurement-contracts' },
  { label: '采购付款', value: 'procurement-payments' },
  { label: '劳务合同', value: 'labor-contracts' },
  { label: '劳务付款', value: 'labor-payments' },
  { label: '分包合同', value: 'subcontract-contracts' },
  { label: '分包付款', value: 'subcontract-payments' },
]

const RESOURCE_ROUTE: Record<string, string> = {
  'construction-approvals': '/construction-approvals',
  'project-contract-changes': '/project-contract-changes',
  'procurement-contracts': '/procurement-contracts',
  'procurement-payments': '/procurement-payments',
  'labor-contracts': '/labor-contracts',
  'labor-payments': '/labor-payments',
  'subcontract-contracts': '/subcontract-contracts',
  'subcontract-payments': '/subcontract-payments',
}

const RESOURCE_COLOR: Record<string, string> = {
  'construction-approvals': '#1677ff',
  'project-contract-changes': '#2f54eb',
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
  router: ReturnType<typeof useRouter>,
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
            onClick={() => router.push(RESOURCE_ROUTE[row.resourceType] || '/')}
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
  const [tab, setTab] = useState<TabKey>('pending')
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [resourceType, setResourceType] = useState('')
  const [keyword, setKeyword] = useState('')
  // 驳回弹窗
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async (t = tab, rt = resourceType, kw = keyword) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tab: t })
      if (rt) params.set('resourceType', rt)
      if (kw) params.set('keyword', kw)
      const res = await fetch(`/api/approval?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setItems(json.data.items)
      else message.error(json.error || '加载失败')
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [tab, resourceType, keyword])

  useEffect(() => { load() }, [tab]) // eslint-disable-line

  const handleSearch = () => load(tab, resourceType, keyword)
  const handleReset = () => {
    setResourceType('')
    setKeyword('')
    load(tab, '', '')
  }

  // 审批通过
  const handleApprove = async (row: ApprovalItem) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/${row.resourceType}/${row.resourceId}/approve`, {
        method: 'POST', credentials: 'include',
      })
      const json = await res.json()
      if (json.success) { message.success('审批通过'); load() }
      else message.error(json.error || '操作失败')
    } catch { message.error('网络错误') }
    finally { setActionLoading(false) }
  }

  // 驳回确认
  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/${rejectTarget.resourceType}/${rejectTarget.resourceId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      })
      const json = await res.json()
      if (json.success) { message.success('已驳回'); setRejectTarget(null); setRejectReason(''); load() }
      else message.error(json.error || '操作失败')
    } catch { message.error('网络错误') }
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
          const res = await fetch(`/api/${row.resourceType}/${row.resourceId}/cancel`, {
            method: 'POST', credentials: 'include',
          })
          const json = await res.json()
          if (json.success) { message.success('已撤回'); load() }
          else message.error(json.error || '操作失败')
        } catch { message.error('网络错误') }
      },
    })
  }

  const columns = buildColumns(tab, router, handleApprove, (row) => setRejectTarget(row), handleRevoke)

  const pendingCount = tab === 'pending' ? items.length : 0

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
        onChange={(k) => { setTab(k as TabKey); setItems([]) }}
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
                pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
                scroll={{ x: 700 }}
                locale={{ emptyText: tab === 'cc' ? '抄送功能即将开放' : '暂无数据' }}
                rowClassName={(row) => {
                  if (tab === 'pending' && diffDays(row.startedAt) >= 3) return 'approval-row-urgent'
                  return ''
                }}
              />
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
      ` }} />
    </div>
  )
}
