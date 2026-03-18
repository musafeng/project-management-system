'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Card, Col, Row, Spin, Tag, Empty, Avatar } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  PlusCircleOutlined,
  FileAddOutlined,
  DollarOutlined,
  AuditOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  CaretRightOutlined,
} from '@ant-design/icons'
import { getCurrentAuthUser } from '@/lib/auth-client'
import type { AuthUser } from '@/lib/auth-client'
import type { WorkbenchData } from '@/lib/workbench'

const QUICK_ACTIONS = [
  { label: '新建项目', icon: <FolderOpenOutlined style={{ fontSize: 22, color: '#1677ff' }} />, href: '/projects', color: '#e8f4ff', desc: '立项 · 预算 · 客户' },
  { label: '发起施工立项', icon: <FileAddOutlined style={{ fontSize: 22, color: '#52c41a' }} />, href: '/construction-approvals', color: '#f0fff0', desc: '关联项目和合同' },
  { label: '录入采购合同', icon: <AuditOutlined style={{ fontSize: 22, color: '#faad14' }} />, href: '/procurement-contracts', color: '#fffbe6', desc: '采购 · 供应商 · 审批' },
  { label: '录入收款记录', icon: <DollarOutlined style={{ fontSize: 22, color: '#eb2f96' }} />, href: '/contract-receipts', color: '#fff0f6', desc: '合同收款 · 到账确认' },
  { label: '录入劳务付款', icon: <TeamOutlined style={{ fontSize: 22, color: '#722ed1' }} />, href: '/labor-payments', color: '#f9f0ff', desc: '劳务费 · 工人结算' },
  { label: '项目收支总览', icon: <ArrowUpOutlined style={{ fontSize: 22, color: '#13c2c2' }} />, href: '/', color: '#e6fffb', desc: '收入 · 支出 · 利润' },
]

const RESOURCE_ROUTE_MAP: Record<string, string> = {
  'construction-approvals': '/construction-approvals',
  'procurement-contracts': '/procurement-contracts',
  'procurement-payments': '/procurement-payments',
  'labor-contracts': '/labor-contracts',
  'labor-payments': '/labor-payments',
  'subcontract-contracts': '/subcontract-contracts',
  'subcontract-payments': '/subcontract-payments',
}

function formatCurrency(val: number) {
  return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

type StatItem = {
  title: string
  value: string | number
  suffix: string
  icon: React.ReactNode
  color: string
  bg: string
  href: string
}

export default function WorkbenchPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<WorkbenchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCurrentAuthUser(),
      fetch('/api/workbench', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([u, wb]) => {
      setUser(u)
      if (wb.success) setData(wb.data)
    }).finally(() => setLoading(false))
  }, [])

  const stats: StatItem[] = [
    { title: '进行中项目', value: data?.activeProjectCount ?? 0, suffix: '个', icon: <FolderOpenOutlined />, color: '#1677ff', bg: '#e8f4ff', href: '/projects' },
    { title: '本月新增项目', value: data?.monthlyNewProjects ?? 0, suffix: '个', icon: <PlusCircleOutlined />, color: '#52c41a', bg: '#f0fff0', href: '/projects' },
    { title: '本月收款', value: formatCurrency(data?.monthlyReceipt ?? 0), suffix: '', icon: <ArrowUpOutlined />, color: '#eb2f96', bg: '#fff0f6', href: '/contract-receipts' },
    { title: '本月付款', value: formatCurrency(data?.monthlyPayment ?? 0), suffix: '', icon: <DollarOutlined />, color: '#faad14', bg: '#fffbe6', href: '/procurement-payments' },
  ]

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载工作台…" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 欢迎栏 */}
      <div style={{ background: 'linear-gradient(135deg,#1677ff 0%,#0958d9 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>{getGreeting()}，{user?.name || '访客'}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>工程项目管理系统</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
        </div>
        {data && data.pendingApprovalCount > 0 && (
          <div onClick={() => router.push('/construction-approvals')} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 20px', textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{data.pendingApprovalCount}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>待我审批</div>
          </div>
        )}
      </div>

      {/* 数据统计卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {stats.map((stat) => (
          <Col key={stat.title} xs={12} sm={12} md={6}>
            <Card hoverable onClick={() => router.push(stat.href)} size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 18, flexShrink: 0 }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>{stat.title}</div>
                  <div style={{ fontSize: typeof stat.value === 'string' ? 14 : 22, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.2 }}>
                    {stat.value}{stat.suffix}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 左列：待办 + 我发起的 */}
        <Col xs={24} md={14}>
          {/* 待我审批 */}
          <Card
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClockCircleOutlined style={{ color: '#fa8c16' }} /><span>待我审批</span>{data && data.pendingApprovalCount > 0 && <Badge count={data.pendingApprovalCount} style={{ backgroundColor: '#fa8c16' }} />}</div>}
            size="small"
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 16 }}
            bodyStyle={{ padding: '8px 0' }}
          >
            {!data || data.pendingTasks.length === 0 ? (
              <Empty description="暂无待审批事项" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '16px 0' }} />
            ) : (
              <div>
                {data.pendingTasks.map((task) => (
                  <div
                    key={task.taskId}
                    onClick={() => router.push(RESOURCE_ROUTE_MAP[task.resourceType] || '/')}
                    style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', gap: 12 }}
                  >
                    <Avatar size={32} style={{ background: '#fa8c16', flexShrink: 0, fontSize: 12 }}>{task.resourceLabel.slice(0, 2)}</Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: '#1d1d1f' }}>
                        <Tag color="orange" style={{ fontSize: 11, padding: '0 6px', marginRight: 6 }}>{task.resourceLabel}</Tag>
                        {task.submitterName} 发起的审批
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{new Date(task.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <CaretRightOutlined style={{ color: '#d9d9d9' }} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 我发起的审批中 */}
          <Card
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircleOutlined style={{ color: '#1677ff' }} /><span>我发起的（审批中）</span>{data && data.myPendingCount > 0 && <Badge count={data.myPendingCount} />}</div>}
            size="small"
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '8px 0' }}
          >
            {!data || data.myRecentSubmissions.length === 0 ? (
              <Empty description="暂无审批中的单据" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '16px 0' }} />
            ) : (
              <div>
                {data.myRecentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => router.push(RESOURCE_ROUTE_MAP[sub.resourceType] || '/')}
                    style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', gap: 12 }}
                  >
                    <Avatar size={32} style={{ background: '#1677ff', flexShrink: 0, fontSize: 12 }}>{sub.resourceLabel.slice(0, 2)}</Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: '#1d1d1f' }}>
                        <Tag color="blue" style={{ fontSize: 11, padding: '0 6px', marginRight: 6 }}>{sub.resourceLabel}</Tag>
                        审批中
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{new Date(sub.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <CaretRightOutlined style={{ color: '#d9d9d9' }} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 右列：快捷操作 */}
        <Col xs={24} md={10}>
          <Card
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlusCircleOutlined style={{ color: '#1677ff' }} /><span>快捷操作</span></div>}
            size="small"
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '8px 0' }}
          >
            {QUICK_ACTIONS.map((action) => (
              <div
                key={action.label}
                onClick={() => router.push(action.href)}
                style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', gap: 12 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {action.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: '#1d1d1f' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{action.desc}</div>
                </div>
                <CaretRightOutlined style={{ color: '#d9d9d9' }} />
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
