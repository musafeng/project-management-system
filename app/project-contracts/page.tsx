'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Table, Modal, Form, message, Popconfirm, Pagination,
  DatePicker, InputNumber, Input, Select, Button, Space, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined, DeleteOutlined, EyeOutlined,
  SendOutlined, DownloadOutlined, FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  LedgerPageLayout, FilterBar, StatusTag, EmptyHint, MobileCardList,
  CONTRACT_STATUS,
} from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { ApprovalActions } from '@/components/ApprovalActions'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { requestApi } from '@/lib/client-request'
import { useMobile } from '@/hooks/useMobile'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

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
  endDate?: string | null
  status: string
  contractType?: string | null
  paymentMethod?: string | null
  hasRetention?: boolean
  retentionRate?: number | null
  retentionAmount?: number | null
  attachmentUrl?: string | null
  remark?: string | null
  createdAt: string
  updatedAt?: string
  approvalStatus?: string
}

interface ProjectContractDetail extends ProjectContract {
  project?: { id: string; name: string; customer: { id: string; name: string } }
  customerId?: string
}

interface Project {
  id: string
  name: string
  code: string
}

// ============================================================
// 主页面
// ============================================================

export default function ProjectContractsPage() {
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const watchedContractAmount = Form.useWatch('contractAmount', form)
  const watchedHasRetention = Form.useWatch('hasRetention', form)
  const watchedRetentionRate = Form.useWatch('retentionRate', form)
  const isMobile = useMobile()

  const openCreateModal = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const loadProjects = async () => {
    const result = await requestApi<Project[]>('/api/projects', {
      credentials: 'include',
      fallbackError: '加载项目列表失败，请稍后重试',
    })
    if (result.success) setProjects(result.data || [])
    else {
      setProjects([])
      message.error(result.error || '加载项目列表失败，请稍后重试')
    }
  }

  const loadContracts = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.keyword) params.set('keyword', filters.keyword as string)
    if (filters.projectId) params.set('projectId', filters.projectId as string)
    if (filters.status) params.set('status', filters.status as string)
    const result = await requestApi<ProjectContract[]>(`/api/project-contracts?${params}`, {
      credentials: 'include',
      fallbackError: '加载合同列表失败，请稍后重试',
    })
    if (result.success) setContracts(result.data || [])
    else {
      setContracts([])
      message.error(result.error || '加载合同列表失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => { loadProjects(); loadContracts() }, [])

  useEffect(() => {
    const contractAmount = Number(watchedContractAmount || 0)
    const retentionRate = Number(watchedRetentionRate || 0)
    if (!watchedHasRetention) {
      form.setFieldValue('retentionRate', null)
      form.setFieldValue('retentionAmount', null)
      return
    }
    if (contractAmount > 0 && retentionRate > 0) {
      form.setFieldValue('retentionAmount', Number((contractAmount * retentionRate / 100).toFixed(2)))
    } else {
      form.setFieldValue('retentionAmount', null)
    }
  }, [watchedContractAmount, watchedHasRetention, watchedRetentionRate, form])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(contracts.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [contracts.length, mobilePage])

  const handleSearch = (filters: FilterValues) => {
    setMobilePage(1)
    setLastFilter(filters)
    loadContracts(filters)
  }

  const handleEditClick = async (id: string) => {
    const result = await requestApi<ProjectContractDetail>(`/api/project-contracts/${id}`, {
      credentials: 'include',
      fallbackError: '加载合同详情失败，请稍后重试',
    })
    if (result.success && result.data) {
      setEditingId(id)
      form.setFieldsValue({
        name: result.data.name,
        projectId: result.data.projectId,
        contractAmount: result.data.contractAmount,
        signDate: result.data.signDate ? dayjs(result.data.signDate) : undefined,
        startDate: result.data.startDate ? dayjs(result.data.startDate) : undefined,
        endDate: result.data.endDate ? dayjs(result.data.endDate) : undefined,
        contractType: result.data.contractType || undefined,
        paymentMethod: result.data.paymentMethod || undefined,
        hasRetention: Boolean(result.data.hasRetention),
        retentionRate: result.data.retentionRate ?? undefined,
        retentionAmount: result.data.retentionAmount ?? undefined,
        attachmentUrl: result.data.attachmentUrl || null,
        remark: result.data.remark || undefined,
      })
      setModalOpen(true)
    } else { message.error(result.error || '加载合同详情失败，请稍后重试') }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/project-contracts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      fallbackError: '删除合同失败，请稍后重试',
    })
    if (result.success) { message.success('合同已删除'); loadContracts(lastFilter) }
    else message.error(result.error || '删除合同失败，请稍后重试')
  }

  const handleSubmit = async (values: any) => {
    const url = editingId ? `/api/project-contracts/${editingId}` : '/api/project-contracts'
    const result = await requestApi(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...values,
        signDate: values.signDate ? values.signDate.format('YYYY-MM-DD') : null,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
      }),
      fallbackError: editingId ? '更新合同失败，请稍后重试' : '创建合同失败，请稍后重试',
    })
    if (result.success) {
      message.success(editingId ? '合同已更新' : '合同已创建')
      setModalOpen(false); form.resetFields()
      loadContracts(lastFilter)
    } else { message.error(result.error || (editingId ? '更新合同失败，请稍后重试' : '创建合同失败，请稍后重试')) }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns: ColumnsType<ProjectContract> = [
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (v: string, row) => (
        <Tooltip title="点击查看详情">
          <a
            style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => message.info(`即将跳转到合同 ${row.code} 详情`)}
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
      title: '合同状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => <StatusTag status={v} map={CONTRACT_STATUS} size="small" />,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: unknown, row: ProjectContract) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => message.info(`查看 ${row.code}`)}
          >查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleEditClick(row.id)}
          >编辑</Button>
          <ApprovalActions
            id={row.id}
            approvalStatus={row.approvalStatus || 'PENDING'}
            resource="project-contracts"
            onSuccess={() => loadContracts(lastFilter)}
          />
          <Popconfirm
            title="确认删除？" description="删除后无法恢复"
            onConfirm={() => handleDelete(row.id)}
            okText="确认" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
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
      onReset={() => { setMobilePage(1); setLastFilter({}); loadContracts({}) }}
      loading={loading}
      extra={
        <Button
          size="small"
          icon={<DownloadOutlined />}
          type="text"
          style={{ color: '#8c8c8c' }}
          onClick={() => {
            const params = new URLSearchParams({ resourceType: 'project-contracts' })
            if (lastFilter.projectId) params.set('projectId', String(lastFilter.projectId))
            if (lastFilter.dateRange && Array.isArray(lastFilter.dateRange)) {
              const [start, end] = lastFilter.dateRange as any[]
              if (start?.format) params.set('startDate', start.format('YYYY-MM-DD'))
              if (end?.format) params.set('endDate', end.format('YYYY-MM-DD'))
            }
            window.location.href = `/data-exports?${params.toString()}`
          }}
        >
          导出
        </Button>
      }
    />
  )

  const summary = useMemo(() => {
    return contracts.reduce(
      (acc, item) => {
        acc.contractAmount += Number(item.contractAmount || 0)
        acc.receivableAmount += Number(item.receivableAmount || 0)
        acc.receivedAmount += Number(item.receivedAmount || 0)
        acc.unreceivedAmount += Number(item.unreceivedAmount || 0)
        return acc
      },
      { contractAmount: 0, receivableAmount: 0, receivedAmount: 0, unreceivedAmount: 0 }
    )
  }, [contracts])

  const table = (
    <Table<ProjectContract>
      rowKey="id"
      columns={columns}
      dataSource={contracts}
      loading={loading}
      size="small"
      pagination={{
        pageSize: 20,
        showTotal: (t) => `共 ${t} 条`,
        showSizeChanger: false,
      }}
      scroll={{ x: 1100 }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="还没有合同"
            desc="新增合同后，可在此查看全部合同及收款进度。建议先选择好项目再新增。"
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

  const summaryCards = (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
      {[
        { label: '合同总金额', value: summary.contractAmount, color: '#1677ff' },
        { label: '应收金额', value: summary.receivableAmount, color: '#722ed1' },
        { label: '已收金额', value: summary.receivedAmount, color: '#52c41a' },
        { label: '未收金额', value: summary.unreceivedAmount, color: '#fa8c16' },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            minWidth: isMobile ? 'calc(50% - 6px)' : 160,
            flex: isMobile ? '1 1 calc(50% - 6px)' : '0 0 auto',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>{item.label}</div>
          <div style={{ color: item.color, fontWeight: 700 }}>{fmtMoney(item.value)}</div>
        </div>
      ))}
    </div>
  )

  const mobileCards = (
    <>
      <MobileCardList<ProjectContract>
        data={contracts.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.name}
        getDescription={(item) => `合同编号：${item.code}`}
        getStatus={(item) => <StatusTag status={item.status} map={CONTRACT_STATUS} size="small" />}
        fields={[
          { key: 'projectName', label: '所属项目', render: (item) => item.projectName || '-' },
          { key: 'customerName', label: '客户', render: (item) => item.customerName || '-' },
          { key: 'contractAmount', label: '合同金额', render: (item) => <Text strong style={{ color: '#1677ff' }}>{fmtMoney(item.contractAmount)}</Text> },
          { key: 'receivedAmount', label: '已收款', render: (item) => <Text style={{ color: '#52c41a' }}>{fmtMoney(item.receivedAmount)}</Text> },
          { key: 'unreceivedAmount', label: '未收款', render: (item) => <Text style={{ color: item.unreceivedAmount > 0 ? '#fa8c16' : '#8c8c8c' }}>{fmtMoney(item.unreceivedAmount)}</Text> },
          { key: 'signDate', label: '签订日期', render: (item) => fmtDate(item.signDate), fullWidth: true },
        ]}
        actions={(item) => (
          <Space size={2} wrap>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => message.info(`查看 ${item.code}`)}>
              查看
            </Button>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(item.id)}>
              编辑
            </Button>
            <ApprovalActions
              id={item.id}
              approvalStatus={item.approvalStatus || 'PENDING'}
              resource="project-contracts"
              onSuccess={() => loadContracts(lastFilter)}
            />
            <Popconfirm
              title="确认删除？"
              description="删除后无法恢复"
              onConfirm={() => handleDelete(item.id)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )}
        empty={(
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="还没有合同"
            desc="新增合同后，可在此查看全部合同及收款进度。建议先选择好项目再新增。"
            action={<Button type="primary" onClick={openCreateModal}>新增合同</Button>}
          />
        )}
      />
      {contracts.length > MOBILE_PAGE_SIZE && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={mobilePage}
            pageSize={MOBILE_PAGE_SIZE}
            total={contracts.length}
            onChange={setMobilePage}
            showSizeChanger={false}
            size="small"
          />
        </div>
      )}
    </>
  )

  return (
    <>
      <LedgerPageLayout
        title="销售合同"
        desc="管理项目收入合同，实时跟踪收款进度"
        createLabel="新增合同"
        onCreate={openCreateModal}
        total={contracts.length}
        filterBar={filterBar}
        table={
          <>
            {summaryCards}
            {table}
          </>
        }
        mobileTable={
          <>
            {summaryCards}
            {mobileCards}
          </>
        }
      />

      <Modal
        title={editingId ? '编辑合同' : '新增合同'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        okText="保存" cancelText="取消"
        width={isMobile ? '95vw' : 560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={handleFinishFailed}
          validateMessages={DEFAULT_FORM_VALIDATE_MESSAGES}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}>
            <Input placeholder="请输入合同名称" />
          </Form.Item>
          <Form.Item name="projectId" label="所属项目" rules={[{ required: true, message: '请选择项目' }]}>
            <Select
              placeholder="请选择项目"
              showSearch
              optionFilterProp="label"
              options={projects.map((p) => ({ label: `${p.name}（${p.code}）`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="contractAmount" label="合同金额（元）" rules={[{ required: true, message: '请输入合同金额' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => {
                const normalized = v?.replace(/,/g, '') || ''
                return (normalized ? Number(normalized) : undefined) as any
              }}
            />
          </Form.Item>
          <Form.Item name="contractType" label="合同类型" rules={[{ required: true, message: '请选择合同类型' }]}>
            <Select
              placeholder="请选择合同类型"
              options={['固定总价', '固定单价', '可变总价', '可变单价'].map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item name="signDate" label="签订日期">
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="startDate" label="开工日期" rules={[{ required: true, message: '请选择开工日期' }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="endDate" label="竣工日期">
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="付款方式" rules={[{ required: true, message: '请选择付款方式' }]}>
            <Select
              placeholder="请选择付款方式"
              options={['按进度', '按合同', '其他'].map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item
            name="hasRetention"
            label="有无质保金"
            initialValue={false}
            rules={[
              {
                validator: async (_, value) => {
                  if (typeof value === 'boolean') return
                  throw new Error('请选择是否有质保金')
                },
              },
            ]}
          >
            <Select
              placeholder="请选择"
              options={[
                { label: '有', value: true },
                { label: '无', value: false },
              ]}
            />
          </Form.Item>
          {watchedHasRetention ? (
            <>
              <Form.Item name="retentionRate" label="质保金比例(%)" rules={[{ required: true, message: '请输入质保金比例' }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} />
              </Form.Item>
              <Form.Item name="retentionAmount" label="质保金金额">
                <InputNumber style={{ width: '100%' }} precision={2} disabled />
              </Form.Item>
            </>
          ) : null}
          <Form.Item name="attachmentUrl" label="合同附件">
            <AttachmentUploadField />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
