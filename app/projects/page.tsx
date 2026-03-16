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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

/**
 * 项目数据类型
 */
interface Project {
  id: string
  code: string
  name: string
  customerId: string
  customerName: string
  status: string
  startDate: string | null
  endDate: string | null
  budget?: number
  createdAt: string
}

/**
 * 项目详情类型
 */
interface ProjectDetail extends Project {
  customer?: { id: string; name: string }
  remark?: string | null
  updatedAt?: string
}

/**
 * 客户数据类型
 */
interface Customer {
  id: string
  code: string
  name: string
  contact: string | null
  phone: string | null
  createdAt: string
}

/**
 * API 响应类型
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 项目状态映射表
 */
const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNING: { label: '规划中', color: 'default' },
  APPROVED: { label: '已批准', color: 'processing' },
  IN_PROGRESS: { label: '进行中', color: 'processing' },
  SUSPENDED: { label: '暂停', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
}

/**
 * 格式化日期
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

/**
 * 获取项目状态标签
 */
function getStatusTag(status: string) {
  const statusInfo = PROJECT_STATUS_MAP[status]
  if (statusInfo) {
    return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
  }
  return <Tag>{status}</Tag>
}

/**
 * 格式化金额
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `¥${value.toLocaleString('zh-CN')}`
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

  /**
   * 加载客户列表
   */
  const loadCustomers = async () => {
    try {
      setCustomersLoading(true)
      const response = await fetch('/api/customers')
      const result: ApiResponse<Customer[]> = await response.json()

      if (result.success && result.data) {
        setCustomers(result.data)
      } else {
        console.error('加载客户列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载客户列表失败:', err)
    } finally {
      setCustomersLoading(false)
    }
  }

  /**
   * 加载项目列表
   */
  const loadProjects = async (searchKeyword?: string, searchStatus?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchKeyword) params.append('keyword', searchKeyword)
      if (searchStatus) params.append('status', searchStatus)

      const url = `/api/projects${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<Project[]> = await response.json()

      if (result.success && result.data) {
        setProjects(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setProjects([])
      }
    } catch (err) {
      console.error('加载项目列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初次加载数据
   */
  useEffect(() => {
    loadCustomers()
    loadProjects()
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    loadProjects(keyword, status)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    loadProjects('', undefined)
  }

  /**
   * 打开新增弹窗
   */
  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  /**
   * 打开编辑弹窗
   */
  const handleEditClick = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      const result: ApiResponse<ProjectDetail> = await response.json()

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
        message.error(result.error || '获取项目信息失败')
      }
    } catch (err) {
      console.error('获取项目信息失败:', err)
      message.error('获取项目信息失败')
    }
  }

  /**
   * 删除项目
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('项目已删除')
        loadProjects(keyword, status)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除项目失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(editingId ? '项目已更新' : '项目已创建')
        setIsModalVisible(false)
        form.resetFields()
        loadProjects(keyword, status)
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (err) {
      console.error('提交表单失败:', err)
      message.error('操作失败，请检查网络连接')
    }
  }

  /**
   * 表格列定义
   */
  const columns: ColumnsType<Project> = [
    {
      title: '项目编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
    },
    {
      title: '项目状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      align: 'right',
      render: (value: number | undefined) => formatCurrency(value),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除项目"
            description="确定删除该项目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontSize: 14,
        },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            margin: '0 auto',
            background: '#fff',
            borderRadius: 8,
            padding: '20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          {/* 标题 */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: '#1d1d1f',
              }}
            >
              项目管理
            </h1>
          </div>

          {/* 查询区 */}
          <div
            style={{
              marginBottom: 20,
              padding: '12px',
              background: '#fafafa',
              borderRadius: 6,
              border: '1px solid #f0f0f0',
            }}
          >
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

              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                查询
              </Button>

              <Button onClick={handleReset} loading={loading}>
                重置
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddClick}
                style={{ marginLeft: 'auto' }}
              >
                新增项目
              </Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table<Project>
            rowKey="id"
            columns={columns}
            dataSource={projects}
            loading={loading}
            pagination={false}
            scroll={{ x: 1200 }}
            size="small"
            locale={{
              emptyText: '暂无项目数据',
            }}
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑项目' : '新增项目'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="项目名称"
            name="name"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item
            label="客户"
            name="customerId"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              placeholder="请选择客户"
              loading={customersLoading}
              options={customers.map((customer) => ({
                label: customer.name,
                value: customer.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="预算" name="budget">
            <InputNumber
              placeholder="请输入预算"
              style={{ width: '100%' }}
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="开始日期" name="startDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="结束日期" name="endDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}

