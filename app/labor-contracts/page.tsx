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
  DatePicker,
  InputNumber,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ApprovalStatusTag, ApprovalActions } from '@/components/ApprovalActions'
import { getCurrentAuthUser } from '@/lib/auth-client'

/**
 * 劳务合同数据类型
 */
interface LaborContract {
  id: string
  code: string
  projectName: string
  constructionName: string
  laborWorkerName: string
  contractAmount: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  signDate: string | null
  approvalStatus: string
  createdAt: string
}

/**
 * 劳务合同详情类型
 */
interface LaborContractDetail extends LaborContract {
  projectId?: string
  constructionId?: string
  workerId?: string
  changedAmount?: number
  status?: string
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
 * 施工立项数据类型
 */
interface ConstructionApproval {
  id: string
  code: string
  name: string
  projectId: string
  budget: number
  status: string
  createdAt: string
}

/**
 * 劳务人员数据类型
 */
interface LaborWorker {
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
 * 格式化金额
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function LaborContractsPage() {
  const [contracts, setContracts] = useState<LaborContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [constructions, setConstructions] = useState<ConstructionApproval[]>([])
  const [laborWorkers, setLaborWorkers] = useState<LaborWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [constructionsLoading, setConstructionsLoading] = useState(true)
  const [laborWorkersLoading, setLaborWorkersLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    getCurrentAuthUser().then((u) => setIsAdmin(u?.systemRole === 'ADMIN'))
  }, [])

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
   * 加载施工立项列表
   */
  const loadConstructions = async () => {
    try {
      setConstructionsLoading(true)
      const response = await fetch('/api/construction-approvals')
      const result: ApiResponse<ConstructionApproval[]> = await response.json()

      if (result.success && result.data) {
        setConstructions(result.data)
      } else {
        console.error('加载施工立项列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载施工立项列表失败:', err)
    } finally {
      setConstructionsLoading(false)
    }
  }

  /**
   * 加载劳务人员列表
   */
  const loadLaborWorkers = async () => {
    try {
      setLaborWorkersLoading(true)
      const response = await fetch('/api/labor-workers')
      const result: ApiResponse<LaborWorker[]> = await response.json()

      if (result.success && result.data) {
        setLaborWorkers(result.data)
      } else {
        console.error('加载劳务人员列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载劳务人员列表失败:', err)
    } finally {
      setLaborWorkersLoading(false)
    }
  }

  /**
   * 加载劳务合同列表
   */
  const loadContracts = async (searchKeyword?: string, searchProjectId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchProjectId) params.append('projectId', searchProjectId)

      const url = `/api/labor-contracts${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<LaborContract[]> = await response.json()

      if (result.success && result.data) {
        // 如果有关键词，进行客户端过滤
        let filtered = result.data
        if (searchKeyword) {
          filtered = result.data.filter(
            (contract) =>
              contract.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
              contract.projectName.toLowerCase().includes(searchKeyword.toLowerCase())
          )
        }
        setContracts(filtered)
      } else {
        message.error(result.error || '数据加载失败')
        setContracts([])
      }
    } catch (err) {
      console.error('加载劳务合同列表失败:', err)
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
    loadConstructions()
    loadLaborWorkers()
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
      const response = await fetch(`/api/labor-contracts/${id}`)
      const result: ApiResponse<LaborContractDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        form.setFieldsValue({
          projectId: result.data.projectId,
          constructionId: result.data.constructionId,
          laborWorkerId: result.data.workerId,
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
   * 删除劳务合同
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-contracts/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('劳务合同已删除')
        loadContracts(keyword, projectId)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除劳务合同失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      const url = editingId ? `/api/labor-contracts/${editingId}` : '/api/labor-contracts'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        projectId: values.projectId,
        constructionId: values.constructionId,
        laborWorkerId: values.laborWorkerId,
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
        message.success(editingId ? '劳务合同已更新' : '劳务合同已创建')
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
  const columns: ColumnsType<LaborContract> = [
    {
      title: '合同编号',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
    },
    {
      title: '施工立项',
      dataIndex: 'constructionName',
      key: 'constructionName',
      width: 150,
    },
    {
      title: '劳务班组',
      dataIndex: 'laborWorkerName',
      key: 'laborWorkerName',
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
      title: '应付金额',
      dataIndex: 'payableAmount',
      key: 'payableAmount',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{formatCurrency(value)}</span>,
    },
    {
      title: '未付金额',
      dataIndex: 'unpaidAmount',
      key: 'unpaidAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#f5222d', fontWeight: 600 }}>{formatCurrency(value)}</span>,
    },
    {
      title: '签订日期',
      dataIndex: 'signDate',
      key: 'signDate',
      width: 120,
      render: (text: string | null) => formatDate(text),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (status: string) => <ApprovalStatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} disabled={record.approvalStatus !== 'REJECTED'} title={record.approvalStatus !== 'REJECTED' ? '审批中或已通过的数据不可修改' : ''} onClick={() => handleEditClick(record.id)}>编辑</Button>
          <Popconfirm title="删除劳务合同" description="确定删除该劳务合同吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" disabled={record.approvalStatus !== 'REJECTED'}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.approvalStatus !== 'REJECTED'}>删除</Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            resource="labor-contracts"
            isAdmin={isAdmin}
            onSuccess={() => loadContracts(keyword, projectId)}
          />
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
              劳务合同管理
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
                placeholder="输入合同编号搜索"
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
          <Table<LaborContract>
            rowKey="id"
            columns={columns}
            dataSource={contracts}
            loading={loading}
            pagination={false}
            scroll={{ x: 1600 }}
            size="small"
            locale={{
              emptyText: '暂无劳务合同数据',
            }}
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑劳务合同' : '新增劳务合同'}
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
            label="施工立项"
            name="constructionId"
            rules={[{ required: true, message: '请选择施工立项' }]}
          >
            <Select
              placeholder="请选择施工立项"
              loading={constructionsLoading}
              options={constructions.map((construction) => ({
                label: construction.name,
                value: construction.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="劳务班组"
            name="laborWorkerId"
            rules={[{ required: true, message: '请选择劳务班组' }]}
          >
            <Select
              placeholder="请选择劳务班组"
              loading={laborWorkersLoading}
              options={laborWorkers.map((worker) => ({
                label: worker.name,
                value: worker.id,
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

