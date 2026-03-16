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
 * 项目合同数据类型
 */
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
  status: string
  createdAt: string
}

/**
 * 项目合同详情类型
 */
interface ProjectContractDetail extends ProjectContract {
  project?: { id: string; name: string; customer: { id: string; name: string } }
  customerId?: string
  startDate?: string | null
  endDate?: string | null
  remark?: string | null
  updatedAt?: string
}

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
 * 合同状态映射表
 */
const CONTRACT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审批', color: 'processing' },
  APPROVED: { label: '已批准', color: 'processing' },
  EXECUTING: { label: '执行中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'success' },
  TERMINATED: { label: '已终止', color: 'error' },
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
 * 获取合同状态标签
 */
function getStatusTag(status: string) {
  const statusInfo = CONTRACT_STATUS_MAP[status]
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
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function ProjectContractsPage() {
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  /**
   * 加载项目列表
   */
  const loadProjects = async () => {
    try {
      setProjectsLoading(true)
      const response = await fetch('/api/projects')
      const result: ApiResponse<Project[]> = await response.json()

      if (result.success && result.data) {
        setProjects(result.data)
      } else {
        console.error('加载项目列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载项目列表失败:', err)
    } finally {
      setProjectsLoading(false)
    }
  }

  /**
   * 加载合同列表
   */
  const loadContracts = async (searchKeyword?: string, searchProjectId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchKeyword) params.append('keyword', searchKeyword)
      if (searchProjectId) params.append('projectId', searchProjectId)

      const url = `/api/project-contracts${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<ProjectContract[]> = await response.json()

      if (result.success && result.data) {
        setContracts(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setContracts([])
      }
    } catch (err) {
      console.error('加载合同列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初次加载数据
   */
  useEffect(() => {
    loadProjects()
    loadContracts()
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    loadContracts(keyword, projectId)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    setKeyword('')
    setProjectId(undefined)
    loadContracts('', undefined)
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
      const response = await fetch(`/api/project-contracts/${id}`)
      const result: ApiResponse<ProjectContractDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        form.setFieldsValue({
          name: result.data.name,
          projectId: result.data.projectId,
          contractAmount: result.data.contractAmount,
          signDate: result.data.signDate ? dayjs(result.data.signDate) : undefined,
          remark: result.data.remark || undefined,
        })
        setIsModalVisible(true)
      } else {
        message.error(result.error || '获取合同信息失败')
      }
    } catch (err) {
      console.error('获取合同信息失败:', err)
      message.error('获取合同信息失败')
    }
  }

  /**
   * 删除合同
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/project-contracts/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('合同已删除')
        loadContracts(keyword, projectId)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除合同失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      const url = editingId ? `/api/project-contracts/${editingId}` : '/api/project-contracts'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        name: values.name,
        projectId: values.projectId,
        contractAmount: values.contractAmount,
        signDate: values.signDate ? values.signDate.format('YYYY-MM-DD') : null,
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
        message.success(editingId ? '合同已更新' : '合同已创建')
        setIsModalVisible(false)
        form.resetFields()
        loadContracts(keyword, projectId)
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
  const columns: ColumnsType<ProjectContract> = [
    {
      title: '合同编码',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 130,
    },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '变更金额',
      dataIndex: 'changedAmount',
      key: 'changedAmount',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '应收金额',
      dataIndex: 'receivableAmount',
      key: 'receivableAmount',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '已收金额',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span>,
    },
    {
      title: '未收金额',
      dataIndex: 'unreceivedAmount',
      key: 'unreceivedAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#f5222d' }}>{formatCurrency(value)}</span>,
    },
    {
      title: '合同状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
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
            title="删除合同"
            description="确定删除该合同吗？"
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
              项目合同管理
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
                placeholder="输入合同名称搜索"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 200 }}
                onPressEnter={handleSearch}
              />

              <Select
                placeholder="选择项目"
                value={projectId || undefined}
                onChange={setProjectId}
                allowClear
                style={{ width: 200 }}
                loading={projectsLoading}
                options={projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
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
                新增合同
              </Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table<ProjectContract>
            rowKey="id"
            columns={columns}
            dataSource={contracts}
            loading={loading}
            pagination={false}
            scroll={{ x: 1800 }}
            size="small"
            locale={{
              emptyText: '暂无合同数据',
            }}
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑合同' : '新增合同'}
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
            label="合同名称"
            name="name"
            rules={[{ required: true, message: '请输入合同名称' }]}
          >
            <Input placeholder="请输入合同名称" />
          </Form.Item>

          <Form.Item
            label="项目"
            name="projectId"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select
              placeholder="请选择项目"
              loading={projectsLoading}
              options={projects.map((project) => ({
                label: project.name,
                value: project.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="合同金额"
            name="contractAmount"
            rules={[
              { required: true, message: '请输入合同金额' },
              { type: 'number', min: 0, message: '合同金额必须大于 0' },
            ]}
          >
            <InputNumber
              placeholder="请输入合同金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="签订日期" name="signDate">
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

