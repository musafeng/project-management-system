'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  ConfigProvider,
  Popconfirm,
  Tag,
  DatePicker,
  InputNumber,
  Card,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { requestApi } from '@/lib/client-request'
import { useMobile } from '@/hooks/useMobile'
import { ApprovalActions } from '@/components/ApprovalActions'
import { getApprovalStatusMeta, isApprovalLocked as isApprovalRecordLocked } from '@/lib/approval-status'

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

const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNING: { label: '规划中', color: 'default' },
  APPROVED: { label: '已批准', color: 'processing' },
  IN_PROGRESS: { label: '进行中', color: 'processing' },
  SUSPENDED: { label: '暂停', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

function getStatusTag(status: string) {
  const statusInfo = PROJECT_STATUS_MAP[status]
  if (statusInfo) return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
  return <Tag>{status}</Tag>
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `¥${value.toLocaleString('zh-CN')}`
}

function getApprovalTag(project: Pick<Project, 'approvalStatus' | 'approvedAt'>) {
  const statusMeta = getApprovalStatusMeta(project)
  return <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
}

function isApprovalLocked(project: Pick<Project, 'approvalStatus' | 'approvedAt'>) {
  return isApprovalRecordLocked(project)
}

// 移动端单项目卡片
function MobileProjectCard({
  item,
  onEdit,
  onDelete,
  onRefresh,
}: {
  item: Project
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}) {
  const locked = isApprovalLocked(item)

  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</span>
          <Space size={4}>
            {getStatusTag(item.status)}
            {getApprovalTag(item)}
          </Space>
        </div>
      }
      extra={
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => window.location.href = `/projects/${item.id}`}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} disabled={locked} onClick={() => onEdit(item.id)}>编辑</Button>
          <ApprovalActions
            id={item.id}
            approvalStatus={item.approvalStatus}
            approvedAt={item.approvedAt}
            resource="projects"
            onSuccess={onRefresh}
          />
          <Popconfirm
            title="确定删除该项目吗？"
            onConfirm={() => onDelete(item.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={locked}>删除</Button>
          </Popconfirm>
        </Space>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13, color: '#595959' }}>
        <div><span style={{ color: '#999' }}>编码：</span>{item.code}</div>
        <div><span style={{ color: '#999' }}>客户：</span>{item.customerName}</div>
        <div><span style={{ color: '#999' }}>预算：</span>{formatCurrency(item.budget)}</div>
        <div><span style={{ color: '#999' }}>创建：</span>{formatDate(item.createdAt)}</div>
      </div>
    </Card>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const loadProjects = async (searchKeyword?: string, searchStatus?: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchKeyword) params.append('keyword', searchKeyword)
    if (searchStatus) params.append('status', searchStatus)
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
  }, [])

  const handleSearch = () => loadProjects(keyword, status)
  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    loadProjects('', undefined)
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
      loadProjects(keyword, status)
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
      loadProjects(keyword, status)
    } else {
      message.error(result.error || (editingId ? '更新项目失败，请稍后重试' : '创建项目失败，请稍后重试'))
    }
  }

  const columns: ColumnsType<Project> = [
    { title: '项目编码', dataIndex: 'code', key: 'code', width: 120, render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span> },
    { title: '项目名称', dataIndex: 'name', key: 'name', width: 180 },
    { title: '客户名称', dataIndex: 'customerName', key: 'customerName', width: 150 },
    { title: '项目状态', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => getStatusTag(s) },
    { title: '审批状态', key: 'approvalStatus', width: 100, render: (_, record) => getApprovalTag(record) },
    { title: '预算', dataIndex: 'budget', key: 'budget', width: 120, align: 'right', render: (v: number | undefined) => formatCurrency(v) },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (text: string) => formatDate(text) },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => {
        const locked = isApprovalLocked(record)
        return (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => window.location.href = `/projects/${record.id}`}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleEditClick(record.id)}>编辑</Button>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            approvedAt={record.approvedAt}
            resource="projects"
            onSuccess={() => loadProjects(keyword, status)}
          />
          <Popconfirm title="删除项目" description="确定删除该项目吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={locked}>删除</Button>
          </Popconfirm>
        </Space>
        )
      },
    },
  ]

  // 新增/编辑弹窗（移动端桌面端共用）
  const formModal = (
    <Modal
      title={editingId ? '编辑项目' : '新增项目'}
      open={isModalVisible}
      onOk={() => form.submit()}
      onCancel={() => { setIsModalVisible(false); form.resetFields() }}
      width={isMobile ? '95vw' : 600}
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
    </Modal>
  )

  // ── 移动端布局 ──
  if (isMobile) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14 } }}>
        <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '12px' }}>
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1d1d1f' }}>项目管理</h1>
          </div>

          {/* 筛选区 */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Input
              placeholder="输入项目名称搜索"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              size="large"
              style={{ marginBottom: 10 }}
            />
            <Select
              placeholder="选择项目状态"
              value={status || undefined}
              onChange={setStatus}
              allowClear
              size="large"
              style={{ width: '100%', marginBottom: 10 }}
              options={[
                { label: '规划中', value: 'PLANNING' },
                { label: '已批准', value: 'APPROVED' },
                { label: '进行中', value: 'IN_PROGRESS' },
                { label: '暂停', value: 'SUSPENDED' },
                { label: '已完成', value: 'COMPLETED' },
                { label: '已取消', value: 'CANCELLED' },
              ]}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading} size="large" block>查询</Button>
              <Button onClick={handleReset} loading={loading} size="large" block>重置</Button>
            </div>
          </div>

          {/* 新增按钮 */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddClick}
            size="large"
            block
            style={{ marginBottom: 12 }}
          >
            新增项目
          </Button>

          {/* 卡片列表 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb' }}>加载中...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#bbb', padding: '40px 0', fontSize: 15 }}>暂无项目数据</div>
          ) : (
            projects.map((item) => (
              <MobileProjectCard
                key={item.id}
                item={item}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                onRefresh={() => loadProjects(keyword, status)}
              />
            ))
          )}
        </div>
        {formModal}
      </ConfigProvider>
    )
  }

  // ── 桌面端布局（完全不变）──
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14 } }}>
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '16px' }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', background: '#fff', borderRadius: 8, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1d1d1f' }}>项目管理</h1>
          </div>

          <div style={{ marginBottom: 20, padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
            <Space wrap style={{ width: '100%' }}>
              <Input
                placeholder="输入项目名称搜索"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 200 }}
                onPressEnter={handleSearch}
              />
              <Select
                placeholder="选择项目状态"
                value={status || undefined}
                onChange={setStatus}
                allowClear
                style={{ width: 150 }}
                options={[
                  { label: '规划中', value: 'PLANNING' },
                  { label: '已批准', value: 'APPROVED' },
                  { label: '进行中', value: 'IN_PROGRESS' },
                  { label: '暂停', value: 'SUSPENDED' },
                  { label: '已完成', value: 'COMPLETED' },
                  { label: '已取消', value: 'CANCELLED' },
                ]}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>查询</Button>
              <Button onClick={handleReset} loading={loading}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick} style={{ marginLeft: 'auto' }}>新增项目</Button>
            </Space>
          </div>

          <Table<Project>
            rowKey="id"
            columns={columns}
            dataSource={projects}
            loading={loading}
            pagination={false}
            scroll={{ x: 1200 }}
            size="small"
            locale={{ emptyText: '暂无项目数据' }}
          />
        </div>
      </div>
      {formModal}
    </ConfigProvider>
  )
} 
