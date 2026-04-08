'use client'

import { useEffect, useState } from 'react'
import { Table, Select, DatePicker, Button, Space, Card, Statistic, Row, Col, Tag, Spin } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

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
  return `¥${Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: 'processing', COMPLETED: 'success', PLANNING: 'default',
  SUSPENDED: 'warning', CANCELLED: 'error', APPROVED: 'processing',
}
const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: '进行中', COMPLETED: '已完成', PLANNING: '规划中',
  SUSPENDED: '暂停', CANCELLED: '已取消', APPROVED: '已批准',
}

export default function FinancialSummaryPage() {
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

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { title: '总收入', value: totals?.totalReceiptAmount || 0, color: '#52c41a' },
          { title: '总支出', value: totals?.totalPaymentAmount || 0, color: '#ff4d4f' },
          { title: '利润', value: totals?.profit || 0, color: (totals?.profit || 0) >= 0 ? '#52c41a' : '#ff4d4f' },
          { title: '合同总额', value: totals?.contractAmount || 0, color: '#1677ff' },
          { title: '已收款', value: totals?.receivedAmount || 0, color: '#13c2c2' },
          { title: '未收款', value: totals?.unreceivedAmount || 0, color: '#fa8c16' },
        ].map((item) => (
          <Col xs={12} sm={8} md={4} key={item.title}>
            <Card size="small" bordered style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{item.title}</span>}
                value={Math.abs(item.value)}
                precision={2}
                prefix={item.value < 0 ? '-¥' : '¥'}
                valueStyle={{ color: item.color, fontSize: 16, fontWeight: 700 }}
                formatter={(v) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
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
      </Card>

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
    </div>
  )
}



