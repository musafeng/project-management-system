'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Select,
  Space,
  DatePicker,
  message,
  Tag,
  Typography,
  Card,
  Divider,
} from 'antd'
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

const RESOURCE_TYPE_OPTIONS = [
  { label: '施工立项', value: 'construction-approvals' },
  { label: '项目合同', value: 'project-contracts' },
  { label: '项目合同变更', value: 'project-contract-changes' },
  { label: '合同收款', value: 'contract-receipts' },
  { label: '采购合同', value: 'procurement-contracts' },
  { label: '采购付款', value: 'procurement-payments' },
  { label: '劳务合同', value: 'labor-contracts' },
  { label: '劳务付款', value: 'labor-payments' },
  { label: '分包合同', value: 'subcontract-contracts' },
  { label: '分包付款', value: 'subcontract-payments' },
  { label: '项目列表', value: 'projects' },
]

const APPROVAL_STATUS_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '待审批 (PENDING)', value: 'PENDING' },
  { label: '已通过 (APPROVED)', value: 'APPROVED' },
  { label: '已驳回 (REJECTED)', value: 'REJECTED' },
]

interface Region { id: string; name: string }
interface Project { id: string; name: string; code: string }

export default function DataExportsPage() {
  // 筛选条件
  const [resourceType, setResourceType] = useState<string | undefined>(undefined)
  const [regionId, setRegionId] = useState<string | undefined>(undefined)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [approvalStatus, setApprovalStatus] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // 数据
  const [regions, setRegions] = useState<Region[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [queried, setQueried] = useState(false)

  // 加载区域和项目
  useEffect(() => {
    fetch('/api/regions').then(r => r.json()).then(res => {
      if (res.success) setRegions(res.data || [])
    }).catch(() => {})
    fetch('/api/projects').then(r => r.json()).then(res => {
      if (res.success) setProjects(res.data || [])
    }).catch(() => {})
  }, [])

  function buildParams() {
    const p = new URLSearchParams()
    if (resourceType) p.set('resourceType', resourceType)
    if (regionId) p.set('regionId', regionId)
    if (projectId) p.set('projectId', projectId)
    if (approvalStatus && approvalStatus !== 'ALL') p.set('approvalStatus', approvalStatus)
    if (dateRange?.[0]) p.set('startDate', dateRange[0].format('YYYY-MM-DD'))
    if (dateRange?.[1]) p.set('endDate', dateRange[1].format('YYYY-MM-DD'))
    return p.toString()
  }

  const handlePreview = async () => {
    if (!resourceType) {
      message.warning('请先选择业务模块')
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`/api/data-exports/preview?${buildParams()}`)
      const json = await res.json()
      if (!json.success) {
        message.error(json.error || '查询失败')
        return
      }
      const rows: Record<string, unknown>[] = json.data || []
      setPreviewData(rows)
      setQueried(true)
      if (rows.length === 0) {
        setColumns([])
        message.info('未查询到数据')
        return
      }
      // 自动生成列
      const cols = Object.keys(rows[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        width: key === 'id' ? 220 : key.includes('时间') || key.includes('日期') ? 110 : 140,
        render: (val: unknown) => {
          if (val === null || val === undefined || val === '') return <span style={{ color: '#bbb' }}>-</span>
          if (key === '审批状态') {
            const colorMap: Record<string, string> = { APPROVED: 'success', PENDING: 'processing', REJECTED: 'error' }
            return <Tag color={colorMap[String(val)] || 'default'}>{String(val)}</Tag>
          }
          return <span>{String(val)}</span>
        },
      }))
      setColumns(cols)
      message.success(`查询到 ${rows.length} 条记录`)
    } catch {
      message.error('查询失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!resourceType) {
      message.warning('请先选择业务模块')
      return
    }
    try {
      setDownloading(true)
      const url = `/api/data-exports/download?${buildParams()}`
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        message.error(json.error || '下载失败')
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      let filename = `${resourceType}_${dayjs().format('YYYY-MM-DD')}.csv`
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/)
      if (match) filename = decodeURIComponent(match[1])
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(objUrl)
      message.success('CSV 文件已开始下载')
    } catch {
      message.error('下载失败，请重试')
    } finally {
      setDownloading(false)
    }
  }

  const handleReset = () => {
    setResourceType(undefined)
    setRegionId(undefined)
    setProjectId(undefined)
    setApprovalStatus('ALL')
    setDateRange(null)
    setPreviewData([])
    setColumns([])
    setQueried(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <Title level={4} style={{ marginBottom: 4 }}>数据下载中心</Title>
      <Text type="secondary" style={{ fontSize: 13 }}>
        仅系统管理员可用。选择业务模块和筛选条件后，先查询预览，确认后再下载 CSV。
      </Text>

      <Divider style={{ margin: '16px 0' }} />

      {/* 筛选区 */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa', border: '1px solid #f0f0f0' }}>
        <Space wrap size={[12, 12]}>
          <Select
            placeholder="选择业务模块（必选）"
            value={resourceType}
            onChange={setResourceType}
            style={{ width: 200 }}
            options={RESOURCE_TYPE_OPTIONS}
            allowClear
          />
          <Select
            placeholder="选择区域（可选）"
            value={regionId}
            onChange={setRegionId}
            style={{ width: 160 }}
            options={regions.map(r => ({ label: r.name, value: r.id }))}
            allowClear
          />
          <Select
            placeholder="选择项目（可选）"
            value={projectId}
            onChange={setProjectId}
            style={{ width: 200 }}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={projects.map(p => ({ label: `${p.code} ${p.name}`, value: p.id }))}
            allowClear
          />
          <Select
            placeholder="审批状态"
            value={approvalStatus}
            onChange={setApprovalStatus}
            style={{ width: 180 }}
            options={APPROVAL_STATUS_OPTIONS}
          />
          <RangePicker
            value={dateRange as any}
            onChange={(val) => setDateRange(val as any)}
            placeholder={['开始日期', '结束日期']}
            style={{ width: 240 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handlePreview}
          >
            查询预览
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={handleDownload}
            disabled={!resourceType}
          >
            下载 CSV
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 预览结果 */}
      {queried && (
        <>
          <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
            共 <strong>{previewData.length}</strong> 条记录
            {previewData.length > 0 && (
              <span style={{ marginLeft: 12, color: '#1677ff' }}>
                点击「下载 CSV」可将以上数据导出为文件
              </span>
            )}
          </div>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={previewData as any}
            loading={loading}
            size="small"
            scroll={{ x: Math.max(800, columns.length * 140) }}
            pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
            locale={{ emptyText: '暂无数据' }}
          />
        </>
      )}
    </div>
  )
}



