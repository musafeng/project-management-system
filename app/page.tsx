'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Avatar, Badge, Card, Col, Empty, Row, Spin, Tag, Tabs, Tooltip } from 'antd'
import {
  AuditOutlined, BellOutlined, CaretRightOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, DollarOutlined, FileAddOutlined,
  FolderOpenOutlined, PlusCircleOutlined, TeamOutlined, ThunderboltOutlined, WarningOutlined,
} from '@ant-design/icons'
import { getCurrentAuthUser } from '@/lib/auth-client'
import type { AuthUser } from '@/lib/auth-client'
import type { WorkbenchData, PendingTask, RecentSubmission, BusinessAlert } from '@/lib/workbench'

const RESOURCE_ROUTE: Record<string, string> = {
  'projects': '/projects',
  'project-contracts': '/project-contracts',
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
  'projects': '#1677ff',
  'project-contracts': '#0958d9',
  'construction-approvals': '#1677ff',
  'project-contract-changes': '#2f54eb',
  'procurement-contracts': '#faad14',
  'procurement-payments': '#eb2f96',
  'labor-contracts': '#52c41a',
  'labor-payments': '#722ed1',
  'subcontract-contracts': '#13c2c2',
  'subcontract-payments': '#fa8c16',
}

const QUICK_ACTIONS = [
  { label: '新建项目', desc: '立项·预算·客户', icon: <FolderOpenOutlined style={{ fontSize: 20, color: '#1677ff' }} />, bg: '#e8f4ff', href: '/projects' },
  { label: '发起施工立项', desc: '关联项目和合同', icon: <FileAddOutlined style={{ fontSize: 20, color: '#52c41a' }} />, bg: '#f0fff0', href: '/construction-approvals' },
  { label: '新增采购合同', desc: '采购·供应商·审批', icon: <AuditOutlined style={{ fontSize: 20, color: '#faad14' }} />, bg: '#fffbe6', href: '/procurement-contracts' },
  { label: '登记收款', desc: '合同收款·到账确认', icon: <DollarOutlined style={{ fontSize: 20, color: '#eb2f96' }} />, bg: '#fff0f6', href: '/contract-receipts' },
  { label: '申请劳务付款', desc: '劳务费·工人结算', icon: <TeamOutlined style={{ fontSize: 20, color: '#722ed1' }} />, bg: '#f9f0ff', href: '/labor-payments' },
  { label: '申请采购付款', desc: '采购付款·报销', icon: <ThunderboltOutlined style={{ fontSize: 20, color: '#fa8c16' }} />, bg: '#fff7e6', href: '/procurement-payments' },
]

function fmt(val: number) {
  if (val >= 10000) return `${(val / 10000).toFixed(1)}万`
  return val.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

// ── 子组件：欢迎栏 ──
function WelcomeBar({ user, pendingCount, rejectedCount, onNav }: {
  user: AuthUser | null
  pendingCount: number
  rejectedCount: number
  onNav: (href: string) => void
}) {
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  return (
    <div style={{ background: 'linear-gradient(135deg,#1677ff 0%,#0050b3 100%)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, color: '#fff' }}>
      <div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 2 }}>{greeting()}，<b>{user?.name || '访客'}</b></div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>工程项目管理系统</div>
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>{dateStr}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {pendingCount > 0 && (
          <Tooltip title="点击查看待审批">
            <div onClick={() => onNav('/approval')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '8px 16px', textAlign: 'center', cursor: 'pointer', minWidth: 64 }}>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{pendingCount}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>待审批</div>
            </div>
          </Tooltip>
        )}
        {rejectedCount > 0 && (
          <div style={{ background: 'rgba(255,77,79,0.25)', border: '1px solid rgba(255,77,79,0.5)', borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 64 }}>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{rejectedCount}</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>被驳回</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 子组件：数据看板 ──
function StatsBar({ data, onNav }: { data: WorkbenchData | null; onNav: (h: string) => void }) {
  const items = [
    { label: '进行中项目', value: data?.activeProjectCount ?? 0, unit: '个', color: '#1677ff', bg: '#e8f4ff', icon: <FolderOpenOutlined />, href: '/projects' },
    { label: '本月新增', value: data?.monthlyNewProjects ?? 0, unit: '个', color: '#52c41a', bg: '#f0fff0', icon: <PlusCircleOutlined />, href: '/projects' },
    { label: '本月收款', value: data ? `¥${fmt(data.monthlyReceipt)}` : '¥0', unit: '', color: '#eb2f96', bg: '#fff0f6', icon: <DollarOutlined />, href: '/contract-receipts' },
    { label: '本月付款', value: data ? `¥${fmt(data.monthlyPayment)}` : '¥0', unit: '', color: '#fa8c16', bg: '#fff7e6', icon: <ThunderboltOutlined />, href: '/procurement-payments' },
  ]
  return (
    <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
      {items.map((item) => (
        <Col key={item.label} xs={12} sm={12} md={6}>
          <Card hoverable size="small" onClick={() => onNav(item.href)} bodyStyle={{ padding: '14px 16px' }} style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.055)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>{item.label}</div>
                <div style={{ fontSize: typeof item.value === 'string' ? 15 : 20, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.value}{item.unit}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

// ── 子组件：列表行 ──
function ListRow({ label, resourceType, submitterName, date, href, onNav }: {
  label: string; resourceType: string; submitterName?: string; date: string; href: string; onNav: (h: string) => void
}) {
  const color = RESOURCE_COLOR[resourceType] ?? '#1677ff'
  return (
    <div onClick={() => onNav(href)} style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #f5f5f5', gap: 10, cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar size={30} style={{ background: color, fontSize: 11, flexShrink: 0 }}>{label.slice(0, 2)}</Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Tag color={color} style={{ fontSize: 11, padding: '0 5px', margin: 0 }}>{label}</Tag>
          {submitterName && <span style={{ color: '#595959' }}>{submitterName} 发起</span>}
        </div>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{fmtDate(date)}</div>
      </div>
      <CaretRightOutlined style={{ color: '#d9d9d9', flexShrink: 0 }} />
    </div>
  )
}

// ── 子组件：待办区 ──
function TodoSection({ data, onNav }: { data: WorkbenchData | null; onNav: (h: string) => void }) {
  const tabItems = [
    {
      key: 'pending',
      label: (
        <span>
          待我审批
          {data && data.pendingApprovalCount > 0 && <Badge count={data.pendingApprovalCount} style={{ marginLeft: 6, backgroundColor: '#fa8c16' }} />}
        </span>
      ),
      children: !data || data.pendingTasks.length === 0
        ? <Empty description="暂无待审批" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />
        : data.pendingTasks.map((t: PendingTask) => (
            <ListRow key={t.taskId} label={t.resourceLabel} resourceType={t.resourceType} submitterName={t.submitterName} date={t.createdAt} href={RESOURCE_ROUTE[t.resourceType] || '/'} onNav={onNav} />
          )),
    },
    {
      key: 'rejected',
      label: (
        <span>
          被驳回
          {data && data.rejectedCount > 0 && <Badge count={data.rejectedCount} style={{ marginLeft: 6, backgroundColor: '#ff4d4f' }} />}
        </span>
      ),
      children: !data || data.rejectedSubmissions.length === 0
        ? <Empty description="暂无被驳回单据" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />
        : data.rejectedSubmissions.map((s: RecentSubmission) => (
            <ListRow key={s.id} label={s.resourceLabel} resourceType={s.resourceType} date={s.createdAt} href={RESOURCE_ROUTE[s.resourceType] || '/'} onNav={onNav} />
          )),
    },
    {
      key: 'mine',
      label: (
        <span>
          我发起的
          {data && data.myPendingCount > 0 && <Badge count={data.myPendingCount} style={{ marginLeft: 6 }} />}
        </span>
      ),
      children: !data || data.myRecentSubmissions.length === 0
        ? <Empty description="暂无审批中单据" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />
        : data.myRecentSubmissions.map((s: RecentSubmission) => (
            <ListRow key={s.id} label={s.resourceLabel} resourceType={s.resourceType} date={s.createdAt} href={RESOURCE_ROUTE[s.resourceType] || '/'} onNav={onNav} />
          )),
    },
  ]
  return (
    <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.055)', marginBottom: 16 }} bodyStyle={{ padding: '0 0 8px' }}
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined style={{ color: '#fa8c16' }} /><span>待办事项</span></div>}
    >
      <Tabs defaultActiveKey="pending" size="small" style={{ padding: '0 16px' }} items={tabItems} />
    </Card>
  )
}

// ── 子组件：常用操作 ──
function QuickActions({ onNav }: { onNav: (h: string) => void }) {
  return (
    <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.055)', marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ThunderboltOutlined style={{ color: '#1677ff' }} /><span>常用操作</span></div>}
    >
      <Row gutter={[10, 10]}>
        {QUICK_ACTIONS.map((a) => (
          <Col key={a.label} xs={12} sm={8} md={8}>
            <div onClick={() => onNav(a.href)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#fafafa', cursor: 'pointer', border: '1px solid #f0f0f0', transition: 'box-shadow 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>{a.label}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 1 }}>{a.desc}</div>
              </div>
      </div>
          </Col>
        ))}
      </Row>
    </Card>
  )
}

// ── 子组件：业务提醒 ──
function AlertSection({ alerts, onNav }: { alerts: BusinessAlert[]; onNav: (h: string) => void }) {
  if (alerts.length === 0) return null
  const typeMap: Record<string, 'warning' | 'error' | 'info'> = {
    warning: 'warning', error: 'error', info: 'info',
  }
  return (
    <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.055)' }} bodyStyle={{ padding: '12px 16px' }}
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BellOutlined style={{ color: '#fa8c16' }} /><span>业务提醒</span></div>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a) => (
          <Alert
            key={a.id}
            type={typeMap[a.level] ?? 'info'}
            message={<span style={{ cursor: 'pointer', fontWeight: 500 }} onClick={() => onNav(a.href)}>{a.title}</span>}
            description={<span style={{ fontSize: 12 }}>{a.desc}</span>}
            showIcon
            style={{ borderRadius: 8, cursor: 'default' }}
          />
        ))}
      </div>
    </Card>
  )
}

// ============================================================
// 主页面
// ============================================================
export default function WorkbenchPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<WorkbenchData | null>(null)
  const [loading, setLoading] = useState(true)

  const nav = (href: string) => router.push(href)

  useEffect(() => {
    Promise.all([
      getCurrentAuthUser(),
      fetch('/api/workbench', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([u, wb]) => {
      setUser(u)
      if (wb.success) setData(wb.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载工作台…" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 区域 1：欢迎栏 */}
      <WelcomeBar
        user={user}
        pendingCount={data?.pendingApprovalCount ?? 0}
        rejectedCount={data?.rejectedCount ?? 0}
        onNav={nav}
      />

      {/* 区域 2：数据看板 */}
      <StatsBar data={data} onNav={nav} />

      <Row gutter={[16, 16]}>
        {/* 左列：待办 + 业务提醒 */}
        <Col xs={24} md={14}>
          {/* 区域 3：待办 */}
          <TodoSection data={data} onNav={nav} />
          {/* 区域 5：业务提醒 */}
          <AlertSection alerts={data?.alerts ?? []} onNav={nav} />
        </Col>

        {/* 右列：常用操作 */}
        <Col xs={24} md={10}>
          {/* 区域 4：常用操作 */}
          <QuickActions onNav={nav} />
        </Col>
      </Row>
        </div>
  )
}
