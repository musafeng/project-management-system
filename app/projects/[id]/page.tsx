'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Card, Descriptions, Tag, Button, Space, Tabs, Table,
  Divider, Row, Col, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ProjectOutlined, FileAddOutlined, DollarOutlined, WalletOutlined,
  ArrowLeftOutlined, CheckCircleOutlined,
  ClockCircleOutlined, WarningOutlined,
} from '@ant-design/icons'
import { fmtMoney, fmtDate } from '@/lib/utils/format'

const { Title, Text } = Typography

// ============================================================
// 类型定义
// ============================================================

interface Project {
  id: string
  code: string
  name: string
  status: string
  customer: { id: string; name: string }
  startDate: string | null
  endDate: string | null
  budget: number
  remark: string | null
  regionName?: string | null
  createdAt: string
  updatedAt: string
}

interface ProjectStats {
  // 收入
  contractReceivableAmount: number
  contractReceivedAmount: number
  contractUnreceivedAmount: number
  totalIncomeAmount: number
  // 支出
  procurementPaidAmount: number
  laborPaidAmount: number
  subcontractPaidAmount: number
  totalExpenseAmount: number
  // 利润
  profitAmount: number
}

interface ContractRow {
  id: string
  code: string
  name: string
  contractAmount: number
  receivedAmount: number
  unreceivedAmount: number
  status: string
  signDate: string | null
}

interface ReceiptRow {
  id: string
  contractCode: string
  receiptAmount: number
  receiptDate: string
  receiptMethod: string | null
  status: string
}

interface PaymentRow {
  id: string
  type: string
  partyName: string
  paymentAmount: number
  paymentDate: string
  approvalStatus: string
}

interface ApprovalRow {
  id: string
  resourceType: string
  resourceLabel: string
  submitterName: string
  status: string
  nodeName: string
  startedAt: string
}

// ============================================================
// 常量 & 工具
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PLANNING:    { label: '规划中', color: 'default',    icon: <ClockCircleOutlined /> },
  APPROVED:    { label: '已批准', color: 'blue',       icon: <CheckCircleOutlined /> },
  IN_PROGRESS: { label: '进行中', color: 'processing', icon: <ClockCircleOutlined /> },
  SUSPENDED:   { label: '暂停中', color: 'warning',    icon: <WarningOutlined /> },
  COMPLETED:   { label: '已完成', color: 'success',    icon: <CheckCircleOutlined /> },
  CANCELLED:   { label: '已取消', color: 'error',      icon: <WarningOutlined /> },
}

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:      { label: '草稿',   color: 'default' },
  PENDING:    { label: '审批中', color: 'orange' },
  APPROVED:   { label: '已批准', color: 'blue' },
  EXECUTING:  { label: '执行中', color: 'processing' },
  COMPLETED:  { label: '已完成', color: 'success' },
  TERMINATED: { label: '已终止', color: 'error' },
}

const APPROVAL_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: '审批中', color: 'orange' },
  APPROVED: { label: '已通过', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
  CANCELLED:{ label: '已撤销', color: 'default' },
}

function profitColor(v: number) {
  if (v > 0) return '#52c41a'
  if (v < 0) return '#ff4d4f'
  return '#8c8c8c'
}

// ============================================================
// API 字段映射工具
// ============================================================

// contract-receipts API 返回 amount 字段（不是 receiptAmount），此处做映射
function mapReceipt(r: any): ReceiptRow {
  return {
    id: r.id,
    contractCode: r.contractCode ?? '—',
    receiptAmount: Number(r.amount ?? r.receiptAmount ?? 0),
    receiptDate: r.receiptDate ?? r.createdAt,
    receiptMethod: r.receiptMethod ?? null,
    status: r.status ?? 'RECEIVED',
  }
}

// procurement-payments API 返回 amount（不是 paymentAmount），supplierName 作为 partyName
function mapPayment(r: any, type: string): PaymentRow {
  return {
    id: r.id,
    type,
    partyName: r.supplierName ?? r.laborWorkerName ?? r.subcontractVendorName ?? '—',
    paymentAmount: Number(r.amount ?? r.paymentAmount ?? 0),
    paymentDate: r.paymentDate ?? r.createdAt,
    approvalStatus: r.approvalStatus ?? 'PENDING',
  }
}

// summary API 返回数组，取第一个匹配当前项目的
function mapStats(s: any): ProjectStats {
  return {
    contractReceivableAmount: Number(s.contractReceivableAmount ?? 0),
    contractReceivedAmount: Number(s.contractReceivedAmount ?? 0),
    contractUnreceivedAmount: Number(s.contractUnreceivedAmount ?? 0),
    totalIncomeAmount: Number(s.totalIncomeAmount ?? 0),
    procurementPaidAmount: Number(s.procurementPaidAmount ?? 0),
    laborPaidAmount: Number(s.laborPaidAmount ?? 0),
    subcontractPaidAmount: Number(s.subcontractPaidAmount ?? 0),
    totalExpenseAmount: Number(s.totalExpenseAmount ?? 0),
    profitAmount: Number(s.profitAmount ?? 0),
  }
}

const EMPTY_STATS: ProjectStats = {
  contractReceivableAmount: 0,
  contractReceivedAmount: 0,
  contractUnreceivedAmount: 0,
  totalIncomeAmount: 0,
  procurementPaidAmount: 0,
  laborPaidAmount: 0,
  subcontractPaidAmount: 0,
  totalExpenseAmount: 0,
  profitAmount: 0,
}

// ============================================================
// 子组件：顶部统计卡片
// ============================================================

function StatCards({ stats }: { stats: ProjectStats }) {
  const cards = [
    { title: '合同总额', value: stats.contractReceivableAmount, color: '#1677ff', suffix: '应收' },
    { title: '已收款', value: stats.contractReceivedAmount, color: '#52c41a', suffix: `未收 ${fmtMoney(stats.contractUnreceivedAmount)}` },
    { title: '已付款', value: stats.totalExpenseAmount, color: '#fa8c16', suffix: `采购+劳务+分包` },
    { title: '项目利润', value: stats.profitAmount, color: profitColor(stats.profitAmount), suffix: `收入-支出` },
  ]
  return (
    <Row gutter={[12, 12]}>
      {cards.map((c) => (
        <Col xs={12} sm={6} key={c.title}>
          <Card
            bordered={false}
            size="small"
            style={{ borderRadius: 10, background: `${c.color}08`, border: `1px solid ${c.color}22` }}
          >
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color, lineHeight: 1.2 }}>
              {fmtMoney(c.value)}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{c.suffix}</div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

// ============================================================
// 子组件：合同标签页
// ============================================================

function ContractTab({ rows }: { rows: ContractRow[] }) {
  const cols: ColumnsType<ContractRow> = [
    { title: '合同编号', dataIndex: 'code', key: 'code', width: 120, render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: '合同名称', dataIndex: 'name', key: 'name' },
    { title: '合同金额', dataIndex: 'contractAmount', key: 'contractAmount', width: 130, align: 'right', render: (v) => <Text strong style={{ color: '#1677ff' }}>{fmtMoney(v)}</Text> },
    { title: '已收款', dataIndex: 'receivedAmount', key: 'receivedAmount', width: 120, align: 'right', render: (v) => <Text style={{ color: '#52c41a' }}>{fmtMoney(v)}</Text> },
    { title: '未收款', dataIndex: 'unreceivedAmount', key: 'unreceivedAmount', width: 120, align: 'right', render: (v) => <Text style={{ color: v > 0 ? '#fa8c16' : '#8c8c8c' }}>{fmtMoney(v)}</Text> },
    { title: '签订日期', dataIndex: 'signDate', key: 'signDate', width: 110, render: fmtDate },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v) => { const c = CONTRACT_STATUS[v] ?? { label: v, color: 'default' }; return <Tag color={c.color}>{c.label}</Tag> },
    },
  ]
  return <Table rowKey="id" columns={cols} dataSource={rows} size="small" pagination={false} scroll={{ x: 700 }} />
}

// ============================================================
// 子组件：收款标签页
// ============================================================

function ReceiptTab({ rows }: { rows: ReceiptRow[] }) {
  const cols: ColumnsType<ReceiptRow> = [
    { title: '关联合同', dataIndex: 'contractCode', key: 'contractCode', width: 120, render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: '收款金额', dataIndex: 'receiptAmount', key: 'receiptAmount', width: 130, align: 'right', render: (v) => <Text strong style={{ color: '#52c41a' }}>{fmtMoney(v)}</Text> },
    { title: '收款日期', dataIndex: 'receiptDate', key: 'receiptDate', width: 110, render: fmtDate },
    { title: '收款方式', dataIndex: 'receiptMethod', key: 'receiptMethod', width: 110, render: (v) => v || '—' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (v) => <Tag color={v === 'RECEIVED' ? 'success' : 'default'}>{v === 'RECEIVED' ? '已收款' : '未收款'}</Tag> },
  ]
  return <Table rowKey="id" columns={cols} dataSource={rows} size="small" pagination={false} scroll={{ x: 600 }} />
}

// ============================================================
// 子组件：付款标签页
// ============================================================

function PaymentTab({ rows }: { rows: PaymentRow[] }) {
  const cols: ColumnsType<PaymentRow> = [
    { title: '付款类型', dataIndex: 'type', key: 'type', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: '收款方', dataIndex: 'partyName', key: 'partyName' },
    { title: '付款金额', dataIndex: 'paymentAmount', key: 'paymentAmount', width: 130, align: 'right', render: (v) => <Text strong style={{ color: '#fa8c16' }}>{fmtMoney(v)}</Text> },
    { title: '付款日期', dataIndex: 'paymentDate', key: 'paymentDate', width: 110, render: fmtDate },
    {
      title: '审批状态', dataIndex: 'approvalStatus', key: 'approvalStatus', width: 90,
      render: (v) => { const c = APPROVAL_STATUS[v] ?? { label: v, color: 'default' }; return <Tag color={c.color}>{c.label}</Tag> },
    },
  ]
  return <Table rowKey="id" columns={cols} dataSource={rows} size="small" pagination={false} scroll={{ x: 600 }} />
}

// ============================================================
// 子组件：审批记录标签页
// ============================================================

function ApprovalTab({ rows }: { rows: ApprovalRow[] }) {
  const cols: ColumnsType<ApprovalRow> = [
    { title: '单据类型', dataIndex: 'resourceLabel', key: 'resourceLabel', width: 100, render: (v) => <Tag color="blue">{v}</Tag> },
    { title: '发起人', dataIndex: 'submitterName', key: 'submitterName', width: 90 },
    { title: '当前节点', dataIndex: 'nodeName', key: 'nodeName', width: 100 },
    {
      title: '审批状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v) => { const c = APPROVAL_STATUS[v] ?? { label: v, color: 'default' }; return <Tag color={c.color}>{c.label}</Tag> },
    },
    { title: '发起时间', dataIndex: 'startedAt', key: 'startedAt', width: 120, render: fmtDate },
  ]
  return <Table rowKey="id" columns={cols} dataSource={rows} size="small" pagination={false} scroll={{ x: 500 }} />
}

// ============================================================
// 主页面
// ============================================================

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<ProjectStats>(EMPTY_STATS)
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [approvals, setApprovals] = useState<ApprovalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('contracts')

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      // 并行请求项目详情 + 统计数据
      const [projRes, summaryRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { credentials: 'include' }),
        fetch(`/api/projects/summary`, { credentials: 'include' }),
      ])
      const [pj, summary] = await Promise.all([projRes.json(), summaryRes.json()])

      if (!pj.success) {
        setError(pj.error || '项目不存在或已被删除')
        setLoading(false)
        return
      }
      setProject(pj.data)

      // summary 返回数组，找到当前项目的统计
      if (summary.success && Array.isArray(summary.data)) {
        const found = summary.data.find((s: any) => s.id === projectId)
        if (found) setStats(mapStats(found))
      }

      // 并行加载子列表
      const [contractsRes, receiptsRes, procRes, laborRes, subRes, approvalsRes] =
        await Promise.all([
          fetch(`/api/project-contracts?projectId=${projectId}`, { credentials: 'include' }),
          fetch(`/api/contract-receipts?projectId=${projectId}`, { credentials: 'include' }),
          fetch(`/api/procurement-payments?projectId=${projectId}`, { credentials: 'include' }),
          fetch(`/api/labor-payments?projectId=${projectId}`, { credentials: 'include' }),
          fetch(`/api/subcontract-payments?projectId=${projectId}`, { credentials: 'include' }),
          fetch(`/api/approval?tab=mine&projectId=${projectId}`, { credentials: 'include' }),
        ])

      const [ct, rc, proc, labor, sub, ap] = await Promise.all([
        contractsRes.json(), receiptsRes.json(),
        procRes.json(), laborRes.json(), subRes.json(),
        approvalsRes.json(),
      ])

      if (ct.success) setContracts(ct.data ?? [])
      if (rc.success) setReceipts((rc.data ?? []).map((r: any) => mapReceipt(r)))

      // 合并三类付款
      const allPayments: PaymentRow[] = [
        ...(proc.success ? (proc.data ?? []).map((r: any) => mapPayment(r, '采购付款')) : []),
        ...(labor.success ? (labor.data ?? []).map((r: any) => mapPayment(r, '劳务付款')) : []),
        ...(sub.success ? (sub.data ?? []).map((r: any) => mapPayment(r, '分包付款')) : []),
      ]
      allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      setPayments(allPayments)

      // 审批记录：过滤属于本项目的（API 目前无 projectId 过滤，前端临时过滤）
      if (ap.success) setApprovals(ap.data?.items ?? [])

    } catch (e) {
      console.error(e)
      setError('网络不稳定，请刷新页面重试')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const statusCfg = STATUS_CONFIG[project?.status ?? ''] ?? { label: '未知', color: 'default', icon: null }

  // ── loading 态 ──
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <span style={{ fontSize: 14, color: '#8c8c8c' }}>正在加载项目信息…</span>
      </div>
    )
  }

  // ── error 态 ──
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 15, color: '#ff4d4f', marginBottom: 16 }}>{error}</div>
        <Button onClick={() => load()}>重新加载</Button>
        <Button style={{ marginLeft: 8 }} onClick={() => router.push('/projects')}>返回列表</Button>
      </div>
    )
  }

  // ── empty 态（项目不存在）──
  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 15, color: '#8c8c8c', marginBottom: 16 }}>找不到该项目，可能已被删除</div>
        <Button type="primary" onClick={() => router.push('/projects')}>返回项目列表</Button>
      </div>
    )
  }

  const tabItems = [
    {
      key: 'contracts', label: `合同（${contracts.length}）`,
      children: <ContractTab rows={contracts} />,
    },
    {
      key: 'receipts', label: `收款（${receipts.length}）`,
      children: <ReceiptTab rows={receipts} />,
    },
    {
      key: 'payments', label: `付款（${payments.length}）`,
      children: <PaymentTab rows={payments} />,
    },
    {
      key: 'approvals', label: (
        <span>审批记录
          {approvals.filter(a => a.status === 'PENDING').length > 0 && (
            <span style={{ marginLeft: 4, background: '#fa8c16', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 11 }}>
              {approvals.filter(a => a.status === 'PENDING').length}
            </span>
          )}
        </span>
      ),
      children: <ApprovalTab rows={approvals} />,
    },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 面包屑返回 */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/projects')}
        style={{ padding: 0, marginBottom: 12, color: '#8c8c8c' }}
      >返回项目列表</Button>

      {/* ── 顶部：项目标题 + 快捷操作 ── */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
              <Tag color={statusCfg.color} icon={statusCfg.icon}>{statusCfg.label}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>{project.code}</Text>
            </div>
            <Space size={16} wrap>
              <Text style={{ fontSize: 13 }}><span style={{ color: '#8c8c8c' }}>客户：</span>{project.customer.name}</Text>
              {project.regionName && <Text style={{ fontSize: 13 }}><span style={{ color: '#8c8c8c' }}>区域：</span>{project.regionName}</Text>}
              <Text style={{ fontSize: 13 }}><span style={{ color: '#8c8c8c' }}>工期：</span>{fmtDate(project.startDate)} ~ {fmtDate(project.endDate)}</Text>
            </Space>
          </div>
          <Space wrap>
            <Button icon={<ProjectOutlined />} onClick={() => router.push('/construction-approvals')}>发起施工立项</Button>
            <Button icon={<FileAddOutlined />} onClick={() => router.push('/project-contracts')}>新增合同</Button>
            <Button icon={<DollarOutlined />} onClick={() => router.push('/contract-receipts')}>登记收款</Button>
            <Button type="primary" icon={<WalletOutlined />} onClick={() => router.push('/payment-apply')}>申请付款</Button>
          </Space>
        </div>
      </Card>

      {/* ── 统计卡片 ── */}
      <div style={{ marginBottom: 16 }}>
        <StatCards stats={stats} />
      </div>

      {/* ── 中部：基本信息 + 收支明细 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Card
            title="项目基本信息"
            bordered={false}
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          >
            <Descriptions column={1} size="small" styles={{ label: { color: '#8c8c8c', width: 88 } }}>
              <Descriptions.Item label="项目编号"><Text code>{project.code}</Text></Descriptions.Item>
              <Descriptions.Item label="所属客户">{project.customer.name}</Descriptions.Item>
              <Descriptions.Item label="项目预算"><Text strong style={{ color: '#1677ff' }}>{fmtMoney(Number(project.budget))}</Text></Descriptions.Item>
              <Descriptions.Item label="计划开始">{fmtDate(project.startDate)}</Descriptions.Item>
              <Descriptions.Item label="计划结束">{fmtDate(project.endDate)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{fmtDate(project.createdAt)}</Descriptions.Item>
              {project.remark && <Descriptions.Item label="备注"><Text type="secondary">{project.remark}</Text></Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card
            title="收支明细"
            bordered={false}
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          >
            <Row gutter={[8, 12]}>
              {[
                { label: '合同应收', value: stats.contractReceivableAmount, color: '#1677ff' },
                { label: '合同已收', value: stats.contractReceivedAmount, color: '#52c41a' },
                { label: '合同未收', value: stats.contractUnreceivedAmount, color: '#fa8c16' },
                { label: '采购付款', value: stats.procurementPaidAmount, color: '#ff4d4f' },
                { label: '劳务付款', value: stats.laborPaidAmount, color: '#722ed1' },
                { label: '分包付款', value: stats.subcontractPaidAmount, color: '#eb2f96' },
              ].map((item) => (
                <Col span={8} key={item.label}>
                  <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: item.color }}>{fmtMoney(item.value)}</div>
                  </div>
                </Col>
              ))}
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ color: '#8c8c8c', fontSize: 13 }}>项目利润（已收 - 已付）</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: profitColor(stats.profitAmount) }}>
                {fmtMoney(stats.profitAmount)}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── 下方标签页 ── */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '0 0 16px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ padding: '0 16px' }}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Card>
    </div>
  )
}

