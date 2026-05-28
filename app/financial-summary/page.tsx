'use client'

import { useEffect, useState } from 'react'
import { Table, Select, DatePicker, Button, Space, Card, Row, Col, Tag, Spin, Empty } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMobile } from '@/hooks/useMobile'

const { RangePicker } = DatePicker

interface ProjectSummary {
  projectId: string
  projectName: string
  projectCode: string
  status: string
  contractReceiptAmount: number
  otherReceiptAmount: number
  totalReceiptAmount: number
  procurementPaymentAmount: number
  laborPaymentAmount: number
  subcontractPaymentAmount: number
  projectExpenseAmount: number
  managementExpenseAmount: number
  salesExpenseAmount: number
  otherPaymentAmount: number
  pettyCashAmount: number
  totalPaymentAmount: number
  profit: number
  contractAmount: number
  receivedAmount: number
  unreceivedAmount: number
  procurementPaidAmount: number
  procurementUnpaidAmount: number
  laborPaidAmount: number
  subcontractPaidAmount: number
}

interface Totals {
  totalReceiptAmount: number
  totalPaymentAmount: number
  profit: number
  contractAmount: number
  receivedAmount: number
  unreceivedAmount: number
  procurementPaidAmount: number
  procurementUnpaidAmount: number
  laborPaidAmount: number
  subcontractPaidAmount: number
}

interface Project { id: string; name: string }

function fmt(v: number) {
  const n = Number(v || 0)
  const abs = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
  return n < 0 ? `-¥${abs}` : `¥${abs}`
}

const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: 'processing', COMPLETED: 'success', PLANNING: 'default',
  SUSPENDED: 'warning', CANCELLED: 'error', APPROVED: 'processing',
}
const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: '进行中', COMPLETED: '已完成', PLANNING: '规划中',
  SUSPENDED: '暂停', CANCELLED: '已取消', APPROVED: '已批准',
}

type KpiKey = 'totalReceiptAmount' | 'totalPaymentAmount' | 'profit' | 'contractAmount' | 'receivedAmount' | 'unreceivedAmount'

const KPI_ITEMS: Record<KpiKey, { label: string; color: string | ((v: number) => string) }> = {
  totalReceiptAmount: { label: '总收入', color: '#52c41a' },
  totalPaymentAmount: { label: '总支出', color: '#ff4d4f' },
  profit:             { label: '利润',   color: (v) => (v >= 0 ? '#52c41a' : '#ff4d4f') },
  contractAmount:     { label: '合同总额', color: '#1677ff' },
  receivedAmount:     { label: '已收款', color: '#13c2c2' },
  unreceivedAmount:   { label: '未收款', color: '#fa8c16' },
}

const KPI_PC_ORDER: KpiKey[] = [
  'totalReceiptAmount',
  'totalPaymentAmount',
  'profit',
  'contractAmount',
  'receivedAmount',
  'unreceivedAmount',
]

const KPI_MOBILE_GROUPS: { title: string; items: KpiKey[] }[] = [
  { title: '收入', items: ['totalReceiptAmount', 'receivedAmount', 'unreceivedAmount'] },
  { title: '支出与盈利', items: ['totalPaymentAmount', 'profit', 'contractAmount'] },
]

function MoneyText({ value, color, bold, size }: { value: number; color?: string; bold?: boolean; size?: number }) {
  return (
    <span style={{ color, fontWeight: bold ? 700 : undefined, fontSize: size }}>
      {fmt(value)}
    </span>
  )
}

export default function FinancialSummaryPage() {
  const isMobile = useMobile()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [data, setData] = useState<ProjectSummary[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(j => { if (j.success) setProjects(j.data) })
    loadData()
  }, [])

  const loadData = async (projectId?: string, start?: string, end?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      if (start) params.set('startDate', start)
      if (end) params.set('endDate', end)
      const res = await fetch(`/api/financial-summary?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data.projects)
        setTotals(json.data.totals)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadData(
      selectedProject,
      dateRange?.[0]?.format('YYYY-MM-DD'),
      dateRange?.[1]?.format('YYYY-MM-DD'),
    )
  }

  const handleReset = () => {
    setSelectedProject(undefined)
    setDateRange(null)
    loadData()
  }

  const columns: ColumnsType<ProjectSummary> = [
    {
      title: '项目名称', dataIndex: 'projectName', width: 180, fixed: 'left',
      render: (v, r) => (
        <span>
          {v}
          <Tag color={STATUS_COLOR[r.status]} style={{ marginLeft: 6, fontSize: 11 }}>
            {STATUS_LABEL[r.status] || r.status}
          </Tag>
        </span>
      ),
    },
    { title: '合同金额', dataIndex: 'contractAmount', width: 120, align: 'right', render: fmt },
    { title: '总收入', dataIndex: 'totalReceiptAmount', width: 120, align: 'right', render: v => <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '已收', dataIndex: 'receivedAmount', width: 110, align: 'right', render: v => <span style={{ color: '#52c41a' }}>{fmt(v)}</span> },
    { title: '未收', dataIndex: 'unreceivedAmount', width: 110, align: 'right', render: v => <span style={{ color: v > 0 ? '#fa8c16' : '#8c8c8c' }}>{fmt(v)}</span> },
    { title: '总支出', dataIndex: 'totalPaymentAmount', width: 120, align: 'right', render: v => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '采购已付', dataIndex: 'procurementPaidAmount', width: 110, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{fmt(v)}</span> },
    { title: '劳务已付', dataIndex: 'laborPaidAmount', width: 110, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{fmt(v)}</span> },
    { title: '分包已付', dataIndex: 'subcontractPaidAmount', width: 110, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{fmt(v)}</span> },
    {
      title: '利润', dataIndex: 'profit', width: 130, align: 'right', fixed: 'right',
      render: v => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 700, fontSize: 15 }}>
          {fmt(v)}
        </span>
      ),
    },
  ]

  const renderKpiCard = (label: string, value: number, color: string) => (
    <Card size="small" bordered style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{fmt(value)}</div>
    </Card>
  )

  const resolveKpi = (key: KpiKey) => {
    const item = KPI_ITEMS[key]
    const value = totals?.[key] ?? 0
    const color = typeof item.color === 'function' ? item.color(value) : item.color
    return { label: item.label, value, color }
  }

  const renderKpiSection = () => {
    if (!isMobile) {
      return (
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {KPI_PC_ORDER.map((key) => {
            const { label, value, color } = resolveKpi(key)
            return (
              <Col xs={12} sm={8} md={4} key={key}>
                {renderKpiCard(label, value, color)}
              </Col>
            )
          })}
        </Row>
      )
    }

    return (
      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        {KPI_MOBILE_GROUPS.map((group) => (
          <div key={group.title}>
            <div style={{ fontSize: 12, color: '#8c8c8c', margin: '0 0 6px 4px' }}>{group.title}</div>
            <Row gutter={[8, 8]}>
              {group.items.map((key) => {
                const { label, value, color } = resolveKpi(key)
                return (
                  <Col xs={8} key={key}>
                    {renderKpiCard(label, value, color)}
                  </Col>
                )
              })}
            </Row>
          </div>
        ))}
      </div>
    )
  }

  const renderFilter = () => (
    <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={isMobile ? { padding: 12 } : undefined}>
      {isMobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <Select
            placeholder="选择项目"
            allowClear
            style={{ width: '100%' }}
            value={selectedProject}
            onChange={setSelectedProject}
            options={projects.map(p => ({ label: p.name, value: p.id }))}
            showSearch
            optionFilterProp="label"
          />
          <RangePicker
            style={{ width: '100%' }}
            value={dateRange as any}
            onChange={(v) => setDateRange(v as any)}
            placeholder={['开始日期', '结束日期']}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
          </div>
        </div>
      ) : (
        <Space wrap>
          <Select
            placeholder="选择项目"
            allowClear
            style={{ width: 220 }}
            value={selectedProject}
            onChange={setSelectedProject}
            options={projects.map(p => ({ label: p.name, value: p.id }))}
            showSearch
            optionFilterProp="label"
          />
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v as any)}
            placeholder={['开始日期', '结束日期']}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </Space>
      )}
    </Card>
  )

  const renderMobileGroup = (title: string, rows: { label: string; value: number; color?: string; bold?: boolean }[]) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>{title}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '8px 12px',
          padding: '10px 12px',
          background: '#fafafa',
          borderRadius: 8,
        }}
      >
        {rows.map((row) => (
          <div key={row.label}>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>{row.label}</div>
            <MoneyText value={row.value} color={row.color} bold={row.bold} size={13} />
          </div>
        ))}
      </div>
    </div>
  )

  const renderProjectCard = (item: ProjectSummary) => (
    <Card
      key={item.projectId}
      size="small"
      style={{ borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
      bodyStyle={{ padding: 14 }}
      title={(
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1f1f1f', wordBreak: 'break-word' }}>
              {item.projectName}
            </div>
            {item.projectCode && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>编号：{item.projectCode}</div>
            )}
          </div>
          <Tag color={STATUS_COLOR[item.status]} style={{ fontSize: 11, marginInlineEnd: 0 }}>
            {STATUS_LABEL[item.status] || item.status}
          </Tag>
        </div>
      )}
    >
      {renderMobileGroup('收入', [
        { label: '合同金额', value: item.contractAmount, color: '#1677ff' },
        { label: '总收入', value: item.totalReceiptAmount, color: '#52c41a', bold: true },
        { label: '已收', value: item.receivedAmount, color: '#52c41a' },
        { label: '未收', value: item.unreceivedAmount, color: item.unreceivedAmount > 0 ? '#fa8c16' : '#8c8c8c' },
      ])}
      {renderMobileGroup('支出', [
        { label: '总支出', value: item.totalPaymentAmount, color: '#ff4d4f', bold: true },
        { label: '采购已付', value: item.procurementPaidAmount, color: '#ff4d4f' },
        { label: '劳务已付', value: item.laborPaidAmount, color: '#ff4d4f' },
        { label: '分包已付', value: item.subcontractPaidAmount, color: '#ff4d4f' },
      ])}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#595959' }}>利润</span>
        <MoneyText
          value={item.profit}
          color={item.profit >= 0 ? '#52c41a' : '#ff4d4f'}
          bold
          size={16}
        />
      </div>
    </Card>
  )

  const renderMobileTotalsCard = () => {
    if (!totals) return null
    return (
      <Card
        size="small"
        style={{ borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', background: '#fffbe6' }}
        bodyStyle={{ padding: 14 }}
        title={<span style={{ fontSize: 15, fontWeight: 700 }}>合计</span>}
      >
        {renderMobileGroup('收入合计', [
          { label: '合同金额', value: totals.contractAmount, color: '#1677ff' },
          { label: '总收入', value: totals.totalReceiptAmount, color: '#52c41a', bold: true },
          { label: '已收', value: totals.receivedAmount, color: '#52c41a' },
          { label: '未收', value: totals.unreceivedAmount, color: '#fa8c16' },
        ])}
        {renderMobileGroup('支出合计', [
          { label: '总支出', value: totals.totalPaymentAmount, color: '#ff4d4f', bold: true },
          { label: '采购已付', value: totals.procurementPaidAmount, color: '#ff4d4f' },
          { label: '劳务已付', value: totals.laborPaidAmount, color: '#ff4d4f' },
          { label: '分包已付', value: totals.subcontractPaidAmount, color: '#ff4d4f' },
        ])}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #faad14', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#595959' }}>利润合计</span>
          <MoneyText
            value={totals.profit}
            color={totals.profit >= 0 ? '#52c41a' : '#ff4d4f'}
            bold
            size={16}
          />
        </div>
      </Card>
    )
  }

  const renderDetail = () => {
    if (isMobile) {
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#595959', padding: '0 4px' }}>
            项目明细（共 {data.length} 个项目）
          </div>
          <Spin spinning={loading}>
            {data.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {data.map(renderProjectCard)}
                {renderMobileTotalsCard()}
              </div>
            )}
          </Spin>
        </div>
      )
    }

    return (
      <Card size="small" style={{ borderRadius: 8 }} title={`项目明细（共 ${data.length} 个项目）`}>
        <Spin spinning={loading}>
          <Table<ProjectSummary>
            rowKey="projectId"
            columns={columns}
            dataSource={data}
            scroll={{ x: 1300 }}
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            summary={() => totals ? (
              <Table.Summary fixed="bottom">
                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 700 }}>
                  <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><span style={{ color: '#1677ff' }}>{fmt(totals.contractAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#52c41a' }}>{fmt(totals.totalReceiptAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><span style={{ color: '#52c41a' }}>{fmt(totals.receivedAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><span style={{ color: '#fa8c16' }}>{fmt(totals.unreceivedAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right"><span style={{ color: '#ff4d4f' }}>{fmt(totals.totalPaymentAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right"><span style={{ color: '#ff4d4f' }}>{fmt(totals.procurementPaidAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right"><span style={{ color: '#ff4d4f' }}>{fmt(totals.laborPaidAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right"><span style={{ color: '#ff4d4f' }}>{fmt(totals.subcontractPaidAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right"><span style={{ color: totals.profit >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 15 }}>{fmt(totals.profit)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : undefined}
          />
        </Spin>
      </Card>
    )
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {renderKpiSection()}
      {renderFilter()}
      {renderDetail()}
    </div>
  )
}
