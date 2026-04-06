'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Table, Modal, Form, message, Popconfirm,
  DatePicker, InputNumber, Input, Select, Button, Space, Tooltip, Typography, Switch,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined, DeleteOutlined, EyeOutlined,
  DownloadOutlined, FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  LedgerPageLayout, FilterBar, StatusTag, EmptyHint,
  CONTRACT_STATUS,
} from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import AttachmentField from '@/components/AttachmentField'
import AttachmentLink from '@/components/AttachmentLink'
import DetailModal from '@/components/DetailModal'
import LedgerDetailExtra, { type LedgerChangeRecord, type LedgerFlowRecord } from '@/components/LedgerDetailExtra'
import { downloadExportFile } from '@/lib/export-client'
import { endDateAfterStartRule, positiveAmountRules, requiredDateRule } from '@/lib/form-rules'
import {
  getBusinessStatusLabel,
  getContractChangeHint,
  getDeleteConfirmDescription,
  getDeleteConfirmTitle,
  getDeleteSuccessMessage,
  getDisplayText,
  getExecutionStatusHint,
  getLedgerEmptyText,
  getProgressText,
  getSaveSuccessMessage,
  joinDetailHints,
} from '@/lib/ledger-ui'
import { buildLedgerFilterSummary, buildLedgerRouteHref, readLedgerRouteContext } from '@/lib/ledger-context'
import { appendPaginationParams, getPageAfterDelete, normalizePaginatedList } from '@/lib/list-pagination'
import { fmtMoney, fmtDate } from '@/lib/utils/format'

const { Text } = Typography

// ============================================================
// 类型
// ============================================================

interface ProjectContract {
  id: string
  code: string
  name: string
  projectId: string
  projectName: string
  customerName: string
  contractAmount: number
  changedAmount: number
  receivableAmount: number
  receivedAmount: number
  unreceivedAmount: number
  signDate: string | null
  startDate?: string | null
  status: string
  contractType?: string | null
  paymentMethod?: string | null
  hasRetention?: boolean
  retentionRate?: number | null
  retentionAmount?: number | null
  attachmentUrl?: string | null
  createdAt: string
}

interface ProjectContractDetail extends ProjectContract {
  project?: { id: string; name: string; customer: { id: string; name: string } }
  customerId?: string
  endDate?: string | null
  remark?: string | null
  updatedAt?: string
  recentFlows?: LedgerFlowRecord[]
  changeRecords?: LedgerChangeRecord[]
}

interface Project {
  id: string
  name: string
  code: string
  customerName?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const DEFAULT_PAGE_SIZE = 20
const EMPTY_SUMMARY = {
  contractAmountTotal: 0,
  changedAmountTotal: 0,
  receivableAmountTotal: 0,
  receivedAmountTotal: 0,
  unreceivedAmountTotal: 0,
  receiptProgress: 0,
  resultCount: 0,
}

// ============================================================
// 主页面
// ============================================================

export default function ProjectContractsPage() {
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<ProjectContractDetail | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [initialFilterValues, setInitialFilterValues] = useState<FilterValues>({})
  const [form] = Form.useForm()
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const detailCacheRef = useRef<Record<string, ProjectContractDetail>>({})
  const pageCacheRef = useRef<Record<number, ProjectContract[]>>({})
  const selectedProjectId = Form.useWatch('projectId', form)
  const startDateValue = Form.useWatch('startDate', form)
  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const formatProgress = (value?: number) => `${Number(value || 0).toFixed(1)}%`

  const clearPrefetchCache = () => {
    detailCacheRef.current = {}
    pageCacheRef.current = {}
  }

  const formatFilterDate = (value: unknown) => {
    if (dayjs.isDayjs(value)) return value.format('YYYY-MM-DD')
    return typeof value === 'string' ? value : ''
  }

  const buildListParams = (filters: FilterValues = {}, nextPage = page, nextPageSize = pageSize) => {
    const params = new URLSearchParams()
    if (filters.keyword) params.set('keyword', filters.keyword as string)
    if (filters.projectId) params.set('projectId', filters.projectId as string)
    if (filters.status) params.set('status', filters.status as string)
    if (filters.dateRange?.[0]) params.set('startDate', formatFilterDate(filters.dateRange[0]))
    if (filters.dateRange?.[1]) params.set('endDate', formatFilterDate(filters.dateRange[1]))
    appendPaginationParams(params, nextPage, nextPageSize)
    return params
  }

  const loadProjects = async () => {
    const res = await fetch('/api/projects', { credentials: 'include' })
    const j: ApiResponse<Project[]> = await res.json()
    if (j.success) setProjects(j.data || [])
  }

  const loadContracts = async (filters: FilterValues = {}, nextPage = page, nextPageSize = pageSize) => {
    setLoading(true)
    try {
      const params = buildListParams(filters, nextPage, nextPageSize)
      const res = await fetch(`/api/project-contracts?${params}`, { credentials: 'include' })
      const j: ApiResponse<any> = await res.json()
      if (j.success) {
        const normalized = normalizePaginatedList<ProjectContract>(j.data, nextPage, nextPageSize)
        pageCacheRef.current[nextPage] = normalized.items
        setContracts(normalized.items)
        setPage(normalized.page)
        setPageSize(normalized.pageSize)
        setTotal(normalized.total)
        setSummary(j.data?.summary || { ...EMPTY_SUMMARY, resultCount: normalized.total })
        return normalized.items
      }
      else {
        message.error(j.error || '加载失败')
        setSummary(EMPTY_SUMMARY)
        return []
      }
    } catch {
      message.error('网络错误')
      setSummary(EMPTY_SUMMARY)
      return []
    }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const context = readLedgerRouteContext()
    const initialFilters: FilterValues = {}
    if (context.keyword) initialFilters.keyword = context.keyword
    if (context.projectId) initialFilters.projectId = context.projectId
    if (context.startDate && context.endDate) initialFilters.dateRange = [context.startDate, context.endDate]
    clearPrefetchCache()
    setInitialFilterValues(initialFilters)
    setLastFilter(initialFilters)
    loadProjects()
    loadContracts(initialFilters, 1, pageSize).then(async () => {
      if (context.detailId) await handleViewClick(context.detailId)
    })
  }, [])

  const handleSearch = (filters: FilterValues) => {
    clearPrefetchCache()
    setLastFilter(filters)
    loadContracts(filters, 1, pageSize)
  }

  const openCreateModal = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      signDate: dayjs(),
      status: 'DRAFT',
      hasRetention: false,
    })
    setModalOpen(true)
  }

  const fetchContractDetail = async (id: string) => {
    const cached = detailCacheRef.current[id]
    if (cached) return cached
    const res = await fetch(`/api/project-contracts/${id}`, { credentials: 'include' })
    const j: ApiResponse<ProjectContractDetail> = await res.json()
    if (!j.success || !j.data) {
      throw new Error(j.error || '加载失败')
    }
    detailCacheRef.current[id] = j.data
    return j.data
  }

  const handleEditClick = async (id: string) => {
    try {
      const res = await fetch(`/api/project-contracts/${id}`, { credentials: 'include' })
      const j: ApiResponse<ProjectContractDetail> = await res.json()
      if (j.success && j.data) {
        setEditingId(id)
        form.setFieldsValue({
          name: j.data.name,
          projectId: j.data.projectId,
          contractAmount: j.data.contractAmount,
          signDate: j.data.signDate ? dayjs(j.data.signDate) : undefined,
          startDate: j.data.startDate ? dayjs(j.data.startDate) : undefined,
          endDate: j.data.endDate ? dayjs(j.data.endDate) : undefined,
          status: j.data.status,
          contractType: j.data.contractType || undefined,
          paymentMethod: j.data.paymentMethod || undefined,
          hasRetention: Boolean(j.data.hasRetention),
          retentionRate: j.data.retentionRate ?? undefined,
          retentionAmount: j.data.retentionAmount ?? undefined,
          attachmentUrl: j.data.attachmentUrl || undefined,
          remark: j.data.remark || undefined,
        })
        setModalOpen(true)
      } else { message.error(j.error || '加载失败') }
    } catch { message.error('网络错误') }
  }

  const handleViewClick = async (id: string) => {
    setDetailOpen(true)
    try {
      const cached = detailCacheRef.current[id]
      if (cached) {
        setDetailData(cached)
        setDetailLoading(false)
      } else {
        setDetailLoading(true)
      }
      const detail = await fetchContractDetail(id)
      setDetailData(detail)
    } catch {
      message.error('网络错误')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshContractContext = async (recordId?: string, targetPage = page) => {
    await loadContracts(lastFilter, targetPage, pageSize)
    if (recordId && detailOpen && detailData?.id === recordId) {
      await handleViewClick(recordId)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/project-contracts/${id}`, { method: 'DELETE', credentials: 'include' })
      const j: ApiResponse<any> = await res.json()
      if (j.success) {
        message.success(getDeleteSuccessMessage('销售合同'))
        await refreshContractContext(id, getPageAfterDelete(page, contracts.length))
      }
      else message.error(j.error || '删除失败')
    } catch { message.error('网络错误') }
  }

  const handleSubmit = async (values: any) => {
    try {
      const url = editingId ? `/api/project-contracts/${editingId}` : '/api/project-contracts'
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...values,
          signDate: values.signDate ? values.signDate.format('YYYY-MM-DD') : null,
          startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
          endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
          attachmentUrl: values.attachmentUrl || null,
        }),
      })
      const j: ApiResponse<any> = await res.json()
      if (j.success) {
        message.success(getSaveSuccessMessage('销售合同', Boolean(editingId)))
        setModalOpen(false); setEditingId(null); form.resetFields()
        await refreshContractContext(editingId || j.data?.id)
      } else { message.error(j.error || '操作失败') }
    } catch { message.error('网络错误') }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (lastFilter.keyword) params.set('keyword', String(lastFilter.keyword))
      if (lastFilter.projectId) params.set('projectId', String(lastFilter.projectId))
      if (lastFilter.status) params.set('status', String(lastFilter.status))
      if (lastFilter.dateRange?.[0]) params.set('startDate', formatFilterDate(lastFilter.dateRange[0]))
      if (lastFilter.dateRange?.[1]) params.set('endDate', formatFilterDate(lastFilter.dateRange[1]))
      const exportUrl = params.toString() ? `/api/project-contracts/export?${params.toString()}` : '/api/project-contracts/export'
      await downloadExportFile(exportUrl, `销售合同台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`, '导出失败')
      message.success('导出成功')
    } catch (error: any) {
      message.error(error?.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const detailIndex = detailData ? contracts.findIndex((item) => item.id === detailData.id) : -1
  const globalPosition = detailIndex >= 0 ? (page - 1) * pageSize + detailIndex + 1 : 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrevDetail = globalPosition > 1
  const canNextDetail = globalPosition > 0 && globalPosition < total
  const contextSummary = buildLedgerFilterSummary({
    projectName: projects.find((item) => item.id === lastFilter.projectId)?.name,
    keyword: lastFilter.keyword as string | undefined,
    statusLabel: lastFilter.status ? (CONTRACT_STATUS[lastFilter.status as keyof typeof CONTRACT_STATUS]?.label || String(lastFilter.status)) : undefined,
    startDate: lastFilter.dateRange?.[0] ? formatFilterDate(lastFilter.dateRange[0]) : undefined,
    endDate: lastFilter.dateRange?.[1] ? formatFilterDate(lastFilter.dateRange[1]) : undefined,
  })

  const prefetchContractPage = async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || pageCacheRef.current[targetPage]) return
    try {
      const params = buildListParams(lastFilter, targetPage, pageSize)
      const res = await fetch(`/api/project-contracts?${params}`, { credentials: 'include' })
      const j: ApiResponse<any> = await res.json()
      if (j.success) {
        const normalized = normalizePaginatedList<ProjectContract>(j.data, targetPage, pageSize)
        pageCacheRef.current[targetPage] = normalized.items
      }
    } catch {}
  }

  const prefetchContractDetail = async (id?: string | null) => {
    if (!id || detailCacheRef.current[id]) return
    try {
      const detail = await fetchContractDetail(id)
      detailCacheRef.current[id] = detail
    } catch {}
  }

  useEffect(() => {
    if (!detailOpen || !detailData) return
    const currentIndex = contracts.findIndex((item) => item.id === detailData.id)
    if (currentIndex > 0) void prefetchContractDetail(contracts[currentIndex - 1]?.id)
    if (currentIndex >= 0 && currentIndex < contracts.length - 1) void prefetchContractDetail(contracts[currentIndex + 1]?.id)
    if (canPrevDetail && currentIndex <= 0) {
      void prefetchContractPage(page - 1).then(() => {
        const items = pageCacheRef.current[page - 1]
        if (items?.length) void prefetchContractDetail(items[items.length - 1]?.id)
      })
    }
    if (canNextDetail && currentIndex === contracts.length - 1) {
      void prefetchContractPage(page + 1).then(() => {
        const items = pageCacheRef.current[page + 1]
        if (items?.length) void prefetchContractDetail(items[0]?.id)
      })
    }
  }, [detailOpen, detailData?.id, page, pageSize, total, contracts])

  const handleDetailNavigate = async (direction: 'prev' | 'next') => {
    if (!detailData) return
    const currentIndex = contracts.findIndex((item) => item.id === detailData.id)
    if (currentIndex < 0) return

    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (contracts[targetIndex]) {
      await handleViewClick(contracts[targetIndex].id)
      return
    }

    const targetPage = direction === 'next' ? page + 1 : page - 1
    if (targetPage < 1 || targetPage > totalPages) return

    const targetItems = pageCacheRef.current[targetPage] || await loadContracts(lastFilter, targetPage, pageSize)
    const targetId = direction === 'next'
      ? targetItems[0]?.id
      : targetItems[targetItems.length - 1]?.id

    if (targetId) {
      await handleViewClick(targetId)
    }
  }

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns: ColumnsType<ProjectContract> = [
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (v: string, row) => (
        <Tooltip title="点击查看详情">
          <a
            style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => handleViewClick(row.id)}
          >
            {v}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '合同编号',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '所属项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 140,
      ellipsis: true,
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120,
      ellipsis: true,
      render: (v?: string) => getDisplayText(v),
    },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: '#1677ff' }}>{fmtMoney(v)}</Text>,
    },
    {
      title: '变更金额',
      dataIndex: 'changedAmount',
      key: 'changedAmount',
      width: 120,
      align: 'right',
      render: (v: number) => <Text>{fmtMoney(v)}</Text>,
    },
    {
      title: '已收款',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      width: 110,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{fmtMoney(v)}</Text>,
    },
    {
      title: '未收款',
      dataIndex: 'unreceivedAmount',
      key: 'unreceivedAmount',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#fa8c16' : '#8c8c8c' }}>{fmtMoney(v)}</Text>
      ),
    },
    {
      title: '签订日期',
      dataIndex: 'signDate',
      key: 'signDate',
      width: 100,
      render: fmtDate,
    },
    {
      title: '收款方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 130,
      render: (v?: string | null) => getDisplayText(v),
    },
    {
      title: '合同状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => <StatusTag status={v} map={CONTRACT_STATUS} size="small" />,
    },
    {
      title: '附件',
      dataIndex: 'attachmentUrl',
      key: 'attachmentUrl',
      width: 100,
      render: (value: string | null | undefined) => <AttachmentLink url={value} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, row: ProjectContract) => {
        return (
        <Space size={2}>
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => handleViewClick(row.id)}
          >查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleEditClick(row.id)}
          >编辑</Button>
          <Popconfirm
            title={getDeleteConfirmTitle('销售合同')}
            description={getDeleteConfirmDescription('销售合同')}
            onConfirm={() => handleDelete(row.id)}
            okText="确认" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )},
    },
  ]

  // ============================================================
  // 渲染
  // ============================================================

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'input', key: 'keyword', placeholder: '搜索合同名称 / 编号' },
        {
          type: 'select', key: 'projectId', placeholder: '全部项目', width: 180,
          options: projects.map((p) => ({ label: `${p.name}`, value: p.id })),
        },
        {
          type: 'select', key: 'status', placeholder: '全部状态', width: 130,
          options: Object.entries(CONTRACT_STATUS).map(([k, v]) => ({ label: v.label, value: k })),
        },
        { type: 'dateRange', key: 'dateRange', placeholder: ['签订开始', '签订结束'] },
      ]}
      onSearch={handleSearch}
      initialValues={initialFilterValues}
      onReset={() => { setLastFilter({}); loadContracts({}, 1, pageSize) }}
      loading={loading}
      extra={
        <Button size="small" icon={<DownloadOutlined />} type="text" style={{ color: '#8c8c8c' }} onClick={handleExport} loading={exporting}>
          导出
        </Button>
      }
    />
  )

  const table = (
    <Table<ProjectContract>
      rowKey="id"
      columns={columns}
      dataSource={contracts}
      loading={loading}
      size="small"
      pagination={{
        current: page,
        pageSize,
        total,
        showTotal: (t) => `共 ${t} 条`,
        showSizeChanger: true,
        pageSizeOptions: ['20', '50', '100'],
        showQuickJumper: total > pageSize,
        onChange: (nextPage, nextPageSize) => loadContracts(lastFilter, nextPage, nextPageSize),
      }}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={columns.length}>
            <span style={{ fontWeight: 600 }}>
              当前筛选合计：合同金额 {fmtMoney(summary.contractAmountTotal)}，变更金额 {fmtMoney(summary.changedAmountTotal)}，合同已收金额 {fmtMoney(summary.receivedAmountTotal)}，合同未收金额 {fmtMoney(summary.unreceivedAmountTotal)}，整体回款进度 {formatProgress(summary.receiptProgress)}；筛选结果共 {total} 条
            </span>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
      scroll={{ x: 1180 }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无销售合同"
            desc={getLedgerEmptyText('销售合同', '新增合同')}
            action={
              <Button type="primary" onClick={openCreateModal}>
                新增合同
              </Button>
            }
          />
        ),
      }}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="销售合同"
        desc="管理项目收入合同，实时跟踪收款进度"
        createLabel="新增合同"
        onCreate={openCreateModal}
        total={total}
        filterBar={filterBar}
        table={table}
      />

      <Modal
        title={editingId ? '编辑合同' : '新增合同'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields() }}
        okText="保存" cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}>
            <Input placeholder="请输入合同名称" />
          </Form.Item>
          <Form.Item name="projectId" label="所属项目" rules={[{ required: true, message: '请选择项目' }]} extra={selectedProject ? `客户：${selectedProject.customerName}` : '选择项目后自动带出客户信息'}>
            <Select
              placeholder="请选择项目"
              showSearch
              optionFilterProp="label"
              options={projects.map((p) => ({ label: `${p.name}（${p.code}）`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="contractAmount" label="合同金额（元）" rules={positiveAmountRules('合同金额')}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} prefix="¥"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v?.replace(/,/g, '') as any}
            />
          </Form.Item>
          <Form.Item name="signDate" label="签订日期" rules={[requiredDateRule('签订日期')]}>
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="startDate" label="履约开始">
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="endDate" label="履约结束" dependencies={['startDate']} rules={[endDateAfterStartRule(() => startDateValue, '履约开始日期')]}>
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="status" label="合同状态">
            <Select
              placeholder="请选择合同状态"
              options={Object.entries(CONTRACT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
            />
          </Form.Item>
          <Form.Item name="contractType" label="合同类型">
            <Input placeholder="例如：总价合同 / 框架合同" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="收款方式">
            <Input placeholder="例如：转账 / 分期回款" />
          </Form.Item>
          <Form.Item name="hasRetention" label="是否质保" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item name="retentionRate" label="质保比例（%）">
            <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} />
          </Form.Item>
          <Form.Item name="retentionAmount" label="质保金额（元）">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="attachmentUrl" label="合同附件">
            <AttachmentField />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      <DetailModal
        title={detailData ? `销售合同详情 · ${detailData.code}` : '销售合同详情'}
        open={detailOpen}
        loading={detailLoading}
        onClose={() => { setDetailOpen(false); setDetailData(null) }}
        toolbar={(
          <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              {globalPosition > 0 ? `${contextSummary} · 第 ${globalPosition} 条 / 共 ${total} 条 · 当前切换与导出均基于这组筛选结果` : '当前记录不在本次筛选结果中'}
            </span>
            <Space size="small">
              <Button size="small" onClick={() => { void handleDetailNavigate('prev') }} disabled={!canPrevDetail}>上一条</Button>
              <Button size="small" onClick={() => { void handleDetailNavigate('next') }} disabled={!canNextDetail}>下一条</Button>
            </Space>
          </Space>
        )}
        items={[
          { key: 'name', label: '合同名称', value: getDisplayText(detailData?.name) },
          { key: 'code', label: '合同编号', value: getDisplayText(detailData?.code) },
          { key: 'project', label: '所属项目', value: getDisplayText(detailData?.project?.name || detailData?.projectName) },
          { key: 'customer', label: '客户', value: getDisplayText(detailData?.project?.customer?.name) },
          { key: 'amount', label: '合同金额', value: detailData ? fmtMoney(detailData.contractAmount) : getDisplayText() },
          { key: 'changed', label: '变更金额', value: detailData ? fmtMoney(detailData.changedAmount) : getDisplayText() },
          { key: 'receivable', label: '合同应收金额', value: detailData ? fmtMoney(detailData.receivableAmount) : getDisplayText() },
          { key: 'received', label: '合同已收金额', value: detailData ? fmtMoney(detailData.receivedAmount) : getDisplayText() },
          { key: 'unreceived', label: '合同未收金额', value: detailData ? fmtMoney(detailData.unreceivedAmount) : getDisplayText() },
          { key: 'status', label: '合同执行状态', value: detailData?.status ? (CONTRACT_STATUS[detailData.status as keyof typeof CONTRACT_STATUS]?.label || getBusinessStatusLabel(detailData.status)) : getDisplayText() },
          { key: 'sign', label: '签订日期', value: fmtDate(detailData?.signDate || null) },
          { key: 'start', label: '履约开始', value: fmtDate(detailData?.startDate || null) },
          { key: 'end', label: '履约结束', value: fmtDate(detailData?.endDate || null) },
          { key: 'type', label: '合同类型', value: getDisplayText(detailData?.contractType) },
          { key: 'paymentMethod', label: '收款方式', value: getDisplayText(detailData?.paymentMethod) },
          { key: 'retention', label: '质保信息', value: detailData?.hasRetention ? `是 / ${detailData.retentionRate ?? 0}% / ${fmtMoney(detailData.retentionAmount ?? 0)}` : '否' },
          { key: 'attachment', label: '合同附件', value: <AttachmentLink url={detailData?.attachmentUrl} /> },
          { key: 'createdAt', label: '登记时间', value: fmtDate(detailData?.createdAt || null) },
          { key: 'updatedAt', label: '最近更新时间', value: fmtDate(detailData?.updatedAt || null) },
          { key: 'remark', label: '备注', value: getDisplayText(detailData?.remark), span: 2 },
        ]}
        extra={detailData ? (
          <LedgerDetailExtra
            summaryItems={[
              { key: 'summary-contractAmount', label: '合同金额', value: fmtMoney(detailData.contractAmount) },
              { key: 'summary-changedAmount', label: '变更金额', value: fmtMoney(detailData.changedAmount) },
              { key: 'summary-receivableAmount', label: '合同应收', value: fmtMoney(detailData.receivableAmount) },
              {
                key: 'summary-receivedAmount',
                label: '合同已收',
                value: (
                  <Space size={4} wrap>
                    <span>{fmtMoney(detailData.receivedAmount)}</span>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => window.open(buildLedgerRouteHref('/contract-receipts', {
                        contractId: detailData.id,
                        projectId: detailData.projectId,
                      }), '_blank')}
                    >
                      查看收款台账
                    </Button>
                  </Space>
                ),
              },
              {
                key: 'summary-unreceivedAmount',
                label: '合同未收',
                value: (
                  <Space size={4} wrap>
                    <span>{fmtMoney(detailData.unreceivedAmount)}</span>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => window.open(buildLedgerRouteHref('/contract-receipts', {
                        contractId: detailData.id,
                        projectId: detailData.projectId,
                      }), '_blank')}
                    >
                      查看收款台账
                    </Button>
                  </Space>
                ),
              },
              { key: 'summary-progress', label: '回款进度', value: getProgressText(detailData.receivedAmount, detailData.receivableAmount) },
            ]}
            summaryHint={joinDetailHints(
              getContractChangeHint(detailData.changedAmount),
              getExecutionStatusHint(detailData.status),
              '下一步可先看收款台账核对回款，再看最近收款流水和合同变更记录',
            )}
            actionBar={(
              <Space size="small" wrap>
                {detailData.recentFlows?.[0]?.id ? (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => { window.location.href = buildLedgerRouteHref('/contract-receipts', {
                      contractId: detailData.id,
                      projectId: detailData.projectId,
                      detailId: detailData.recentFlows?.[0]?.id,
                      returnPath: buildLedgerRouteHref('/project-contracts', {
                        projectId: lastFilter.projectId as string | undefined,
                        keyword: lastFilter.keyword as string | undefined,
                        status: lastFilter.status as string | undefined,
                        startDate: lastFilter.dateRange?.[0] ? formatFilterDate(lastFilter.dateRange[0]) : undefined,
                        endDate: lastFilter.dateRange?.[1] ? formatFilterDate(lastFilter.dateRange[1]) : undefined,
                        detailId: detailData.id,
                      }),
                    }) }}
                  >
                    进入最新收款详情
                  </Button>
                ) : null}
                <Button
                  size="small"
                  type="link"
                onClick={() => window.open(buildLedgerRouteHref('/contract-receipts', {
                  contractId: detailData.id,
                  projectId: detailData.projectId,
                }), '_blank')}
                >
                  查看关联收款台账
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => { void handleViewClick(detailData.id) }}
                >
                  刷新详情
                </Button>
              </Space>
            )}
            changeTitle="合同变更记录"
            changes={detailData.changeRecords}
            changeEmptyText="当前合同暂无独立变更记录"
            flowTitle="最近收款流水"
            flows={detailData.recentFlows}
            activeFlowId={detailData.id}
            flowEmptyText="当前合同暂无收款流水"
            onFlowClick={(flow) => {
              if (flow.id) {
                window.location.href = buildLedgerRouteHref('/contract-receipts', {
                  contractId: detailData.id,
                  projectId: detailData.projectId,
                  detailId: flow.id,
                  returnPath: buildLedgerRouteHref('/project-contracts', {
                    projectId: lastFilter.projectId as string | undefined,
                    keyword: lastFilter.keyword as string | undefined,
                    status: lastFilter.status as string | undefined,
                    startDate: lastFilter.dateRange?.[0] ? formatFilterDate(lastFilter.dateRange[0]) : undefined,
                    endDate: lastFilter.dateRange?.[1] ? formatFilterDate(lastFilter.dateRange[1]) : undefined,
                    detailId: detailData.id,
                  }),
                })
              }
            }}
          />
        ) : null}
      />
    </>
  )
}
