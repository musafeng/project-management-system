'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Select,
  Space,
  Modal,
  Form,
  message,
  ConfigProvider,
  Popconfirm,
  DatePicker,
  InputNumber,
  Input,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ApprovalStatusTag, ApprovalActions } from '@/components/ApprovalActions'
import { getCurrentAuthUser } from '@/lib/auth-client'
import DynamicForm from '@/components/DynamicForm'
import type { FormFieldConfig } from '@/components/DynamicForm'
import { EmptyHint, MobileCardList } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { canUseAsApprovedUpstream, getApprovalLockReason, isApprovalLocked } from '@/lib/approval-status'

/**
 * 施工立项数据类型
 */
interface ConstructionApproval {
  id: string
  code: string
  projectName: string
  contractCode: string
  name: string
  budgetAmount: number
  startDate: string | null
  approvalStatus: string
  approvedAt?: string | null
  createdAt: string
}

/**
 * 施工立项详情类型
 */
interface ConstructionApprovalDetail extends ConstructionApproval {
  projectId?: string
  contractId?: string
  status?: string
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
  approvalStatus?: string | null
  approvedAt?: string | null
  createdAt: string
}

/**
 * 项目合同数据类型
 */
interface ProjectContract {
  id: string
  code: string
  name: string
  projectId: string
  customerId: string
  contractAmount: number
  status: string
  approvalStatus?: string | null
  approvedAt?: string | null
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

export default function ConstructionApprovalsPage() {
  const [approvals, setApprovals] = useState<ConstructionApproval[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [contractId, setContractId] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dynamicFields, setDynamicFields] = useState<FormFieldConfig[]>([])
  const [form] = Form.useForm()
  const isMobile = useMobile()

  useEffect(() => {
    getCurrentAuthUser().then((u) => setIsAdmin(u?.systemRole === 'ADMIN'))
  }, [])

  /**
   * 加载动态表单配置
   */
  const loadFormDefinition = async () => {
    try {
      const res = await fetch('/api/form-definitions?code=construction-approvals')
      const result = await res.json()
      if (result.success && result.data?.fields) {
        setDynamicFields(result.data.fields)
      }
    } catch (err) {
      console.error('加载表单配置失败:', err)
    }
  }

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
   * 加载项目合同列表
   */
  const loadContracts = async () => {
    try {
      setContractsLoading(true)
      const response = await fetch('/api/project-contracts')
      const result: ApiResponse<ProjectContract[]> = await response.json()

      if (result.success && result.data) {
        setContracts(result.data)
      } else {
        console.error('加载项目合同列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载项目合同列表失败:', err)
    } finally {
      setContractsLoading(false)
    }
  }

  /**
   * 加载施工立项列表
   */
  const loadApprovals = async (searchProjectId?: string, searchContractId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchProjectId) params.append('projectId', searchProjectId)
      if (searchContractId) params.append('contractId', searchContractId)

      const url = `/api/construction-approvals${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<ConstructionApproval[]> = await response.json()

      if (result.success && result.data) {
        setApprovals(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setApprovals([])
      }
    } catch (err) {
      console.error('加载施工立项列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setApprovals([])
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
    loadApprovals()
    loadFormDefinition()
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    loadApprovals(projectId, contractId)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    setProjectId(undefined)
    setContractId(undefined)
    loadApprovals(undefined, undefined)
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
      const response = await fetch(`/api/construction-approvals/${id}`)
      const result: ApiResponse<ConstructionApprovalDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        form.setFieldsValue({
          projectId: result.data.projectId,
          contractId: result.data.contractId,
          name: result.data.name,
          budgetAmount: result.data.budgetAmount,
          startDate: result.data.startDate ? dayjs(result.data.startDate) : undefined,
          remark: result.data.remark || undefined,
        })
        setIsModalVisible(true)
      } else {
        message.error(result.error || '获取立项信息失败')
      }
    } catch (err) {
      console.error('获取立项信息失败:', err)
      message.error('获取立项信息失败')
    }
  }

  /**
   * 删除施工立项
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/construction-approvals/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('施工立项已删除')
        loadApprovals(projectId, contractId)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除施工立项失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      const url = editingId ? `/api/construction-approvals/${editingId}` : '/api/construction-approvals'
      const method = editingId ? 'PUT' : 'POST'

      const { formData, ...restValues } = values
      const payload = {
        projectId: restValues.projectId,
        contractId: restValues.contractId,
        name: restValues.name,
        budgetAmount: restValues.budgetAmount || 0,
        startDate: restValues.startDate ? restValues.startDate.format('YYYY-MM-DD') : null,
        remark: restValues.remark || null,
        formDataJson: formData ? JSON.stringify(formData) : null,
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
        message.success(editingId ? '施工立项已更新' : '施工立项已创建')
        setIsModalVisible(false)
        form.resetFields()
        loadApprovals(projectId, contractId)
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
  const columns: ColumnsType<ConstructionApproval> = [
    {
      title: '立项编号',
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
      title: '合同编号',
      dataIndex: 'contractCode',
      key: 'contractCode',
      width: 130,
    },
    {
      title: '立项名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '预算金额',
      dataIndex: 'budgetAmount',
      key: 'budgetAmount',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
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
      render: (_: string, record) => <ApprovalStatusTag status={record.approvalStatus} approvedAt={record.approvedAt} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const locked = isApprovalLocked(record)
        const lockReason = getApprovalLockReason(record) ?? ''

        return (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            disabled={locked}
            title={lockReason}
            onClick={() => handleEditClick(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除施工立项"
            description="确定删除该施工立项吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={locked}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={locked}>
              删除
            </Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            approvedAt={record.approvedAt}
            resource="construction-approvals"
            isAdmin={isAdmin}
            onSuccess={() => loadApprovals(projectId, contractId)}
          />
        </Space>
      )},
    },
  ]

  const mobileCards = (
    <MobileCardList<ConstructionApproval>
      data={approvals}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      getDescription={(item) => `立项编号：${item.code}`}
      getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus} approvedAt={item.approvedAt} />}
      fields={[
        { key: 'projectName', label: '项目名称', render: (item) => item.projectName || '-' },
        { key: 'contractCode', label: '合同编号', render: (item) => item.contractCode || '-' },
        { key: 'budgetAmount', label: '预算金额', render: (item) => formatCurrency(item.budgetAmount) },
        { key: 'startDate', label: '开始日期', render: (item) => formatDate(item.startDate) },
      ]}
      actions={(record) => {
        const locked = isApprovalLocked(record)
        const lockReason = getApprovalLockReason(record) ?? ''

        return (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            disabled={locked}
            title={lockReason}
            onClick={() => handleEditClick(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除施工立项"
            description="确定删除该施工立项吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={locked}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={locked}>
              删除
            </Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            approvedAt={record.approvedAt}
            resource="construction-approvals"
            isAdmin={isAdmin}
            onSuccess={() => loadApprovals(projectId, contractId)}
          />
        </Space>
      )}}
      empty={(
        <EmptyHint
          title="暂无施工立项数据"
          desc="新增施工立项后，可在此查看预算、开始日期和审批状态。"
          action={<Button type="primary" onClick={handleAddClick}>新增立项</Button>}
        />
      )}
    />
  )

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
          padding: isMobile ? '12px' : '16px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: isMobile ? 10 : 8,
            padding: isMobile ? '14px' : '20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          {/* 标题 */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? 18 : 20,
                fontWeight: 600,
                color: '#1d1d1f',
              }}
            >
              施工立项管理
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
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: 8,
                width: '100%',
              }}
            >
              <Select
                placeholder="选择项目"
                value={projectId || undefined}
                onChange={setProjectId}
                allowClear
                style={{ width: isMobile ? '100%' : 200 }}
                loading={projectsLoading}
            options={projects.filter((project) => canUseAsApprovedUpstream(project)).map((project) => ({
              label: project.name,
              value: project.id,
            }))}
              />

              <Select
                placeholder="选择合同"
                value={contractId || undefined}
                onChange={setContractId}
                allowClear
                style={{ width: isMobile ? '100%' : 200 }}
                loading={contractsLoading}
            options={contracts.filter((contract) => canUseAsApprovedUpstream(contract)).map((contract) => ({
              label: `${contract.code} - ${contract.name}`,
              value: contract.id,
            }))}
              />

              <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={loading}
                  style={{ flex: isMobile ? 1 : undefined }}
                >
                  查询
                </Button>

                <Button onClick={handleReset} loading={loading} style={{ flex: isMobile ? 1 : undefined }}>
                  重置
                </Button>
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddClick}
                style={{
                  marginLeft: isMobile ? 0 : 'auto',
                  width: isMobile ? '100%' : undefined,
                }}
              >
                新增立项
              </Button>
            </div>
          </div>

          {/* 表格 */}
          {isMobile ? (
            mobileCards
          ) : (
            <Table<ConstructionApproval>
              rowKey="id"
              columns={columns}
              dataSource={approvals}
              loading={loading}
              pagination={false}
              scroll={{ x: 1200 }}
              size="small"
              locale={{
                emptyText: '暂无施工立项数据',
              }}
            />
          )}
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑施工立项' : '新增施工立项'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        width={isMobile ? '95vw' : 600}
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
              options={projects.filter((project) => canUseAsApprovedUpstream(project)).map((project) => ({
                label: project.name,
                value: project.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="合同"
            name="contractId"
            rules={[{ required: true, message: '请选择合同' }]}
          >
            <Select
              placeholder="请选择合同"
              loading={contractsLoading}
              options={contracts.filter((contract) => canUseAsApprovedUpstream(contract)).map((contract) => ({
                label: `${contract.code} - ${contract.name}`,
                value: contract.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="立项名称"
            name="name"
            rules={[{ required: true, message: '请输入立项名称' }]}
          >
            <Input placeholder="请输入立项名称" />
          </Form.Item>

          <Form.Item label="预算金额" name="budgetAmount">
            <InputNumber
              placeholder="请输入预算金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="开始日期" name="startDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>

          {dynamicFields.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid #f0f0f0', margin: '8px 0 16px', paddingTop: 16, color: '#666', fontSize: 13 }}>
                扩展信息
              </div>
              <DynamicForm fields={dynamicFields} form={form} />
            </>
          )}
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
