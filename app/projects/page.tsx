'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Form,
  message,
  Popconfirm,
  DatePicker,
  InputNumber,
  Pagination,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { requestApi } from '@/lib/client-request'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { useMobile } from '@/hooks/useMobile'
import { ApprovalActions } from '@/components/ApprovalActions'
import ViewRecordButton from '@/components/ViewRecordButton'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import {
  LedgerPageLayout,
  FilterBar,
  StatusTag,
  EmptyHint,
  MobileCardList,
  PROJECT_STATUS,
} from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { getApprovalStatusMeta, isApprovalLocked as isApprovalRecordLocked } from '@/lib/approval-status'
import { isSystemManagerClientUser } from '@/lib/system-manager'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

interface Project {
  id: string
  code: string
  name: string
  customerId: string
  customerName: string
  status: string
  approvalStatus: string
  approvedAt?: string | null
  submittedAt?: string | null
  rejectedAt?: string | null
  startDate: string | null
  endDate: string | null
  budget?: number
  createdAt: string
}

interface ProjectDetail extends Project {
  customer?: { id: string; name: string }
  remark?: string | null
  updatedAt?: string
  rejectedReason?: string | null
}

interface Customer {
  id: string
  code: string
  name: string
  contact: string | null
  phone: string | null
  createdAt: string
}

const PROJECT_STATUS_OPTIONS = [
  { label: '规划中', value: 'PLANNING' },
  { label: '已批准', value: 'APPROVED' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '暂停中', value: 'SUSPENDED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
]

function getApprovalTag(project: Pick<Project, 'approvalStatus' | 'approvedAt'>) {
  const statusMeta = getApprovalStatusMeta(project)
  return (
    <StatusTag
      status={statusMeta.label}
      map={{ [statusMeta.label]: statusMeta }}
      size="small"
    />
  )
}

function isApprovalLocked(project: Pick<Project, 'approvalStatus' | 'approvedAt'>) {
  return isApprovalRecordLocked(project)
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const isMobile = useMobile()

  const loadCustomers = async () => {
    setCustomersLoading(true)
    const result = await requestApi<Customer[]>('/api/customers', {
      fallbackError: '加载客户列表失败，请稍后重试',
    })
    if (result.success && result.data) setCustomers(result.data)
    else {
      setCustomers([])
      message.error(result.error || '加载客户列表失败，请稍后重试')
    }
    setCustomersLoading(false)
  }

  const loadProjects = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.keyword) params.append('keyword', filters.keyword as string)
    if (filters.status) params.append('status', filters.status as string)
    const url = `/api/projects${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<Project[]>(url, {
      fallbackError: '加载项目列表失败，请稍后重试',
    })
    if (result.success && result.data) setProjects(result.data)
    else {
      message.error(result.error || '加载项目列表失败，请稍后重试')
      setProjects([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
    loadProjects()
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(projects.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [projects.length, mobilePage])

  const handleSearch = (filters: FilterValues) => {
    setMobilePage(1)
    setLastFilter(filters)
    loadProjects(filters)
  }

  const handleReset = () => {
    setMobilePage(1)
    setLastFilter({})
    loadProjects({})
  }

  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditClick = async (id: string) => {
    const result = await requestApi<ProjectDetail>(`/api/projects/${id}`, {
      fallbackError: '获取项目信息失败，请稍后重试',
    })
    if (result.success && result.data) {
      setEditingId(id)
      form.setFieldsValue({
        name: result.data.name,
        customerId: result.data.customerId,
        budget: result.data.budget || undefined,
        startDate: result.data.startDate ? dayjs(result.data.startDate) : undefined,
        endDate: result.data.endDate ? dayjs(result.data.endDate) : undefined,
        remark: result.data.remark || undefined,
      })
      setIsModalVisible(true)
    } else {
      message.error(result.error || '获取项目信息失败，请稍后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/projects/${id}`, {
      method: 'DELETE',
      fallbackError: '删除项目失败，请稍后重试',
    })
    if (result.success) {
      message.success('项目已删除')
      loadProjects(lastFilter)
    } else {
      message.error(result.error || '删除项目失败，请稍后重试')
    }
  }

  const handleSubmit = async (values: any) => {
    const url = editingId ? `/api/projects/${editingId}` : '/api/projects'
    const method = editingId ? 'PUT' : 'POST'
    const payload = {
      name: values.name,
      customerId: values.customerId,
      budget: values.budget || 0,
      startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
      endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
      remark: values.remark || null,
    }
    const result = await requestApi(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      fallbackError: editingId ? '更新项目失败，请稍后重试' : '创建项目失败，请稍后重试',
    })
    if (result.success) {
      message.success(editingId ? '项目已更新' : '项目已创建')
      setIsModalVisible(false)
      form.resetFields()
      loadProjects(lastFilter)
    } else {
      message.error(result.error || (editingId ? '更新项目失败，请稍后重试' : '创建项目失败，请稍后重试'))
    }
  }

  const renderActions = (record: Project) => {
    const locked = isApprovalLocked(record)
    return (
      <Space size={2} wrap>
        <ViewRecordButton resource="projects" id={record.id} />
        <Button
          type="link"
          size="small"
          onClick={() => { window.location.href = `/projects/${record.id}` }}
        >
          详情
        </Button>
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          disabled={locked}
          onClick={() => handleEditClick(record.id)}
        >
          编辑
        </Button>
        <ApprovalActions
          id={record.id}
          approvalStatus={record.approvalStatus}
          approvedAt={record.approvedAt}
          resource="projects"
          onSuccess={() => loadProjects(lastFilter)}
        />
        {canDelete ? (
          <Popconfirm
            title="删除项目"
            description="确定删除该项目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        ) : null}
      </Space>
    )
  }

  const columns: ColumnsType<Project> = [
    {
      title: '项目编码',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (text: string) => <Text code style={{ fontSize: 12 }}>{text}</Text>,
    },
    { title: '项目名称', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
    { title: '客户名称', dataIndex: 'customerName', key: 'customerName', width: 150, ellipsis: true },
    {
      title: '项目状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} map={PROJECT_STATUS} size="small" />,
    },
    {
      title: '审批状态',
      key: 'approvalStatus',
      width: 100,
      render: (_, record) => getApprovalTag(record),
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 130,
      align: 'right',
      render: (v: number | undefined) =>
        <Text strong style={{ color: '#1677ff' }}>{fmtMoney(v ?? null)}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (text: string) => fmtDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => renderActions(record),
    },
  ]

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'input', key: 'keyword', placeholder: '搜索项目名称 / 编码' },
        {
          type: 'select',
          key: 'status',
          placeholder: '全部状态',
          width: 140,
          options: PROJECT_STATUS_OPTIONS,
        },
      ]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
    />
  )

  const emptyHint = (
    <EmptyHint
      icon={<FolderOpenOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
      title="还没有项目"
      desc="点击右上角「新增项目」创建第一个项目，建立客户与项目的对应关系。"
      action={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick}>新增项目</Button>}
    />
  )

  const table = (
    <Table<Project>
      rowKey="id"
      columns={columns}
      dataSource={projects}
      loading={loading}
      size="small"
      pagination={{
        pageSize: 20,
        showTotal: (t) => `共 ${t} 条`,
        showSizeChanger: false,
      }}
      scroll={{ x: 1100 }}
      locale={{ emptyText: emptyHint }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<Project>
        data={projects.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.name}
        getDescription={(item) => `编码：${item.code}`}
        getStatus={(item) => (
          <Space size={4} wrap>
            <StatusTag status={item.status} map={PROJECT_STATUS} size="small" />
            {getApprovalTag(item)}
          </Space>
        )}
        fields={[
          {
            key: 'customerName',
            label: '客户',
            render: (item) => item.customerName || '-',
          },
          {
            key: 'budget',
            label: '预算',
            render: (item) => (
              <Text strong style={{ color: '#1677ff' }}>{fmtMoney(item.budget ?? null)}</Text>
            ),
          },
          {
            key: 'createdAt',
            label: '创建时间',
            render: (item) => fmtDate(item.createdAt),
          },
          {
            key: 'period',
            label: '周期',
            render: (item) => `${fmtDate(item.startDate)} ~ ${fmtDate(item.endDate)}`,
            fullWidth: true,
          },
        ]}
        actions={renderActions}
        empty={emptyHint}
      />
      {projects.length > MOBILE_PAGE_SIZE && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={mobilePage}
            pageSize={MOBILE_PAGE_SIZE}
            total={projects.length}
            onChange={setMobilePage}
            showSizeChanger={false}
            size="small"
          />
        </div>
      )}
    </>
  )

  const formModal = (
    <ResponsiveModalDrawer
      title={editingId ? '编辑项目' : '新增项目'}
      open={isModalVisible}
      onOk={() => form.submit()}
      onCancel={() => { setIsModalVisible(false); form.resetFields() }}
      width={600}
      okText="确定"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 20 }}>
        <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="请输入项目名称" size={isMobile ? 'large' : 'middle'} />
        </Form.Item>
        <Form.Item label="客户" name="customerId" rules={[{ required: true, message: '请选择客户' }]}>
          <Select
            placeholder="请选择客户"
            loading={customersLoading}
            showSearch
            optionFilterProp="label"
            size={isMobile ? 'large' : 'middle'}
            options={customers.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>
        <Form.Item label="预算" name="budget">
          <InputNumber placeholder="请输入预算" style={{ width: '100%' }} min={0} precision={2} size={isMobile ? 'large' : 'middle'} />
        </Form.Item>
        <Form.Item label="开始日期" name="startDate">
          <DatePicker style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
        </Form.Item>
        <Form.Item label="结束日期" name="endDate">
          <DatePicker style={{ width: '100%' }} size={isMobile ? 'large' : 'middle'} />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input.TextArea placeholder="请输入备注" rows={3} />
        </Form.Item>
      </Form>
    </ResponsiveModalDrawer>
  )

  return (
    <>
      <LedgerPageLayout
        title="项目管理"
        desc="管理所有项目档案、关联客户与审批状态"
        createLabel="新增项目"
        onCreate={handleAddClick}
        total={projects.length}
        filterBar={filterBar}
        table={table}
        mobileTable={mobileCards}
      />
      {formModal}
    </>
  )
}
