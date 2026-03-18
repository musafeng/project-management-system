'use client'

import { useEffect, useState } from 'react'
import {
  Table, Modal, Form, message, Popconfirm,
  DatePicker, InputNumber, Input, Select, Button, Space, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined, DeleteOutlined, EyeOutlined,
  SendOutlined, DownloadOutlined, FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  LedgerPageLayout, FilterBar, StatusTag, EmptyHint,
  CONTRACT_STATUS,
} from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { ApprovalActions } from '@/components/ApprovalActions'
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
  status: string
  approvalStatus: string
  createdAt: string
}

interface ProjectContractDetail extends ProjectContract {
  project?: { id: string; name: string; customer: { id: string; name: string } }
  customerId?: string
  startDate?: string | null
  endDate?: string | null
  remark?: string | null
}

interface Project {
  id: string
  name: string
  code: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

import { fmtMoney, fmtDate } from '@/lib/utils/format'

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

  const loadProjects = async () => {
    const res = await fetch('/api/projects', { credentials: 'include' })
    const j: ApiResponse<Project[]> = await res.json()
    if (j.success) setProjects(j.data || [])
  }

  const loadContracts = async (filters: FilterValues = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.keyword) params.set('keyword', filters.keyword as string)
      if (filters.projectId) params.set('projectId', filters.projectId as string)
      if (filters.status) params.set('status', filters.status as string)
      const res = await fetch(`/api/project-contracts?${params}`, { credentials: 'include' })
      const j: ApiResponse<ProjectContract[]> = await res.json()
      if (j.success) setContracts(j.data || [])
      else message.error(j.error || '加载失败')
    } catch { message.error('网络错误') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProjects(); loadContracts() }, [])

  const handleSearch = (filters: FilterValues) => {
    setLastFilter(filters)
    loadContracts(filters)
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
          remark: j.data.remark || undefined,
        })
        setModalOpen(true)
      } else { message.error(j.error || '加载失败') }
    } catch { message.error('网络错误') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/project-contracts/${id}`, { method: 'DELETE', credentials: 'include' })
      const j: ApiResponse<any> = await res.json()
      if (j.success) { message.success('合同已删除'); loadContracts(lastFilter) }
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
        }),
      })
      const j: ApiResponse<any> = await res.json()
      if (j.success) {
        message.success(editingId ? '合同已更新' : '合同已创建')
        setModalOpen(false); form.resetFields()
        loadContracts(lastFilter)
      } else { message.error(j.error || '操作失败') }
    } catch { message.error('网络错误') }
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
            approvalStatus={row.approvalStatus}
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
      onReset={() => { setLastFilter({}); loadContracts({}) }}
      loading={loading}
      extra={
        <Button size="small" icon={<DownloadOutlined />} type="text" style={{ color: '#8c8c8c' }}>
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
              <Button type="primary" onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
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
        onCreate={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}
        total={contracts.length}
        filterBar={filterBar}
        table={table}
      />

      <Modal
        title={editingId ? '编辑合同' : '新增合同'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        okText="保存" cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
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
              parser={(v) => v?.replace(/,/g, '') as any}
            />
          </Form.Item>
          <Form.Item name="signDate" label="签订日期">
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
