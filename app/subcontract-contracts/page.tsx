'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ApprovalStatusTag, ApprovalActions } from '@/components/ApprovalActions'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { isSystemManagerClientUser } from '@/lib/system-manager'
import AmountSummaryCards from '@/components/AmountSummaryCards'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import ViewRecordButton from '@/components/ViewRecordButton'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { LedgerPageLayout, FilterBar, EmptyHint, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { requestApi } from '@/lib/client-request'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { canUseAsApprovedUpstream, getApprovalLockReason, isApprovalLocked } from '@/lib/approval-status'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

interface SubcontractContract {
  id: string
  code: string
  name: string
  projectName: string
  constructionName: string
  subcontractWorkerName: string
  contractAmount: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  signDate: string | null
  approvalStatus: string
  approvedAt?: string | null
  createdAt: string
}

interface SubcontractContractDetail extends SubcontractContract {
  projectId?: string
  constructionId?: string
  workerId?: string
  changedAmount?: number
  status?: string
  startDate?: string | null
  endDate?: string | null
  attachmentUrl?: string | null
  subcontractType?: string | null
  remark?: string | null
  updatedAt?: string
}

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

interface ConstructionApproval {
  id: string
  code: string
  name: string
  projectId: string
  budget: number
  status: string
  approvalStatus?: string | null
  approvedAt?: string | null
  createdAt: string
}

interface SubcontractWorker {
  id: string
  code: string
  name: string
  phone: string | null
  idNumber?: string | null
  bankAccount?: string | null
  bankName?: string | null
  createdAt: string
}

function applyClientFilters(data: SubcontractContract[], filters: FilterValues) {
  let filtered = data
  const keyword = (filters.keyword as string)?.trim()
  if (keyword) {
    const lower = keyword.toLowerCase()
    filtered = filtered.filter(
      (contract) =>
        contract.code.toLowerCase().includes(lower) ||
        contract.name.toLowerCase().includes(lower) ||
        (contract.subcontractWorkerName || '').toLowerCase().includes(lower) ||
        (contract.projectName || '').toLowerCase().includes(lower)
    )
  }
  if (filters.dateRange && Array.isArray(filters.dateRange)) {
    const [start, end] = filters.dateRange as [string, string]
    if (start && end) {
      const startDate = dayjs(start)
      const endDate = dayjs(end)
      filtered = filtered.filter((contract) => {
        if (!contract.signDate) return false
        const sign = dayjs(contract.signDate)
        return sign.isValid() && !sign.isBefore(startDate, 'day') && !sign.isAfter(endDate, 'day')
      })
    }
  }
  return filtered
}

export default function SubcontractContractsPage() {
  const [contracts, setContracts] = useState<SubcontractContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [constructions, setConstructions] = useState<ConstructionApproval[]>([])
  const [vendors, setVendors] = useState<SubcontractWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [constructionsLoading, setConstructionsLoading] = useState(true)
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const selectedProjectId = Form.useWatch('projectId', form)
  const watchedContractAmount = Form.useWatch('contractAmount', form)
  const watchedPaidAmount = Form.useWatch('paidAmount', form)
  const isMobile = useMobile()

  useEffect(() => {
    getCurrentAuthUser().then((u) => setCanDelete(isSystemManagerClientUser(u)))
  }, [])

  useEffect(() => {
    const contractAmount = Number(watchedContractAmount || 0)
    const paidAmount = Number(watchedPaidAmount || 0)
    form.setFieldValue('unpaidAmount', Number((contractAmount - paidAmount).toFixed(2)))
  }, [watchedContractAmount, watchedPaidAmount, form])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(contracts.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [contracts.length, mobilePage])

  const loadProjects = async () => {
    setProjectsLoading(true)
    const result = await requestApi<Project[]>('/api/projects', {
      credentials: 'include',
      fallbackError: '加载项目列表失败，请稍后重试',
    })
    if (result.success) setProjects(result.data || [])
    else setProjects([])
    setProjectsLoading(false)
  }

  const loadConstructions = async () => {
    setConstructionsLoading(true)
    const result = await requestApi<ConstructionApproval[]>('/api/construction-approvals', {
      credentials: 'include',
      fallbackError: '加载施工立项列表失败，请稍后重试',
    })
    if (result.success) setConstructions(result.data || [])
    else setConstructions([])
    setConstructionsLoading(false)
  }

  const loadVendors = async () => {
    setVendorsLoading(true)
    const result = await requestApi<SubcontractWorker[]>('/api/labor-workers', {
      credentials: 'include',
      fallbackError: '加载分包人员列表失败，请稍后重试',
    })
    if (result.success) setVendors(result.data || [])
    else setVendors([])
    setVendorsLoading(false)
  }

  const loadContracts = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.projectId) params.set('projectId', filters.projectId as string)
    const url = `/api/subcontract-contracts${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<SubcontractContract[]>(url, {
      credentials: 'include',
      fallbackError: '数据加载失败，请稍后重试',
    })
    if (result.success) {
      setContracts(applyClientFilters(result.data || [], filters))
    } else {
      setContracts([])
      message.error(result.error || '数据加载失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
    loadConstructions()
    loadVendors()
    loadContracts()
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setMobilePage(1)
    setLastFilter(filters)
    loadContracts(filters)
  }

  const handleReset = () => {
    setMobilePage(1)
    setLastFilter({})
    loadContracts({})
  }

  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEditClick = async (id: string) => {
    const result = await requestApi<SubcontractContractDetail>(`/api/subcontract-contracts/${id}`, {
      credentials: 'include',
      fallbackError: '获取合同信息失败',
    })
    if (result.success && result.data) {
      setEditingId(id)
      form.setFieldsValue({
        name: result.data.name,
        projectId: result.data.projectId,
        constructionId: result.data.constructionId,
        workerId: result.data.workerId,
        contractAmount: result.data.contractAmount,
        paidAmount: result.data.paidAmount ?? 0,
        unpaidAmount: result.data.unpaidAmount ?? 0,
        signDate: result.data.signDate ? dayjs(result.data.signDate) : undefined,
        attachmentUrl: result.data.attachmentUrl || undefined,
        remark: result.data.remark || undefined,
      })
      setModalOpen(true)
    } else {
      message.error(result.error || '获取合同信息失败')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/subcontract-contracts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      fallbackError: '删除失败，请稍后重试',
    })
    if (result.success) {
      message.success('分包合同已删除')
      loadContracts(lastFilter)
    } else {
      message.error(result.error || '删除失败，请稍后重试')
    }
  }

  const handleSubmit = async (values: any) => {
    const url = editingId ? `/api/subcontract-contracts/${editingId}` : '/api/subcontract-contracts'
    const payload = {
      name: values.name,
      projectId: values.projectId,
      constructionId: values.constructionId,
      workerId: values.workerId,
      contractAmount: values.contractAmount,
      signDate: values.signDate ? values.signDate.format('YYYY-MM-DD') : null,
      attachmentUrl: values.attachmentUrl || null,
      remark: values.remark || null,
    }
    const result = await requestApi(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      fallbackError: '操作失败，请稍后重试',
    })
    if (result.success) {
      message.success(editingId ? '分包合同已更新' : '分包合同已创建')
      setModalOpen(false)
      form.resetFields()
      loadContracts(lastFilter)
    } else {
      message.error(result.error || '操作失败，请稍后重试')
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const columns: ColumnsType<SubcontractContract> = [
    {
      title: '合同编号',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (text: string) => <Text code style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, row) => (
        <Tooltip title="点击查看详情">
          <ViewRecordButton
            resource="subcontract-contracts"
            id={row.id}
            label={text}
            type="link"
            icon={null}
            style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}
          />
        </Tooltip>
      ),
    },
    { title: '项目名称', dataIndex: 'projectName', key: 'projectName', width: 150, ellipsis: true },
    { title: '施工立项', dataIndex: 'constructionName', key: 'constructionName', width: 150, ellipsis: true },
    { title: '分包人员', dataIndex: 'subcontractWorkerName', key: 'subcontractWorkerName', width: 130, ellipsis: true },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <Text strong style={{ color: '#1677ff' }}>{fmtMoney(value)}</Text>,
    },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      key: 'payableAmount',
      width: 120,
      align: 'right',
      render: (value: number) => fmtMoney(value),
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <Text style={{ color: '#52c41a' }}>{fmtMoney(value)}</Text>,
    },
    {
      title: '未付金额',
      dataIndex: 'unpaidAmount',
      key: 'unpaidAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <Text style={{ color: value > 0 ? '#fa8c16' : '#8c8c8c' }}>{fmtMoney(value)}</Text>,
    },
    { title: '签订日期', dataIndex: 'signDate', key: 'signDate', width: 110, render: (text: string | null) => fmtDate(text) },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110, render: (text: string) => fmtDate(text) },
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
      width: 240,
      fixed: 'right',
      render: (_, record) => {
        const locked = isApprovalLocked(record)
        const lockReason = getApprovalLockReason(record) ?? ''
        return (
          <Space size={2} wrap>
            <ViewRecordButton resource="subcontract-contracts" id={record.id} />
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
            <ApprovalActions
              id={record.id}
              approvalStatus={record.approvalStatus}
              approvedAt={record.approvedAt}
              resource="subcontract-contracts"
              onSuccess={() => loadContracts(lastFilter)}
            />
            {canDelete ? (
              <Popconfirm
                title="确认删除？"
                description="删除后无法恢复"
                onConfirm={() => handleDelete(record.id)}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            ) : null}
          </Space>
        )
      },
    },
  ]

  const summary = useMemo(() => {
    return contracts.reduce(
      (acc, item) => {
        acc.contractAmount += Number(item.contractAmount || 0)
        acc.paidAmount += Number(item.paidAmount || 0)
        acc.unpaidAmount += Number(item.unpaidAmount || 0)
        return acc
      },
      { contractAmount: 0, paidAmount: 0, unpaidAmount: 0 }
    )
  }, [contracts])

  const summaryCards = (
    <AmountSummaryCards
      isMobile={isMobile}
      items={[
        { label: '合同总金额', value: fmtMoney(summary.contractAmount), color: '#1677ff' },
        { label: '已付款总金额', value: fmtMoney(summary.paidAmount), color: '#52c41a' },
        { label: '未付款总金额', value: fmtMoney(summary.unpaidAmount), color: '#fa8c16' },
      ]}
    />
  )

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'input', key: 'keyword', placeholder: '搜索合同名称 / 编号 / 分包人员' },
        {
          type: 'select',
          key: 'projectId',
          placeholder: '全部项目',
          width: 180,
          options: projects
            .filter((project) => canUseAsApprovedUpstream(project))
            .map((p) => ({ label: p.name, value: p.id })),
        },
        { type: 'dateRange', key: 'dateRange', placeholder: ['签订开始', '签订结束'] },
      ]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
      extra={
        <Button
          size="small"
          icon={<DownloadOutlined />}
          type="text"
          style={{ color: '#8c8c8c' }}
          onClick={() => {
            const params = new URLSearchParams({ resourceType: 'subcontract-contracts' })
            if (lastFilter.projectId) params.set('projectId', String(lastFilter.projectId))
            if (lastFilter.dateRange && Array.isArray(lastFilter.dateRange)) {
              const [start, end] = lastFilter.dateRange as [string, string]
              if (start) params.set('startDate', start)
              if (end) params.set('endDate', end)
            }
            window.location.href = `/data-exports?${params.toString()}`
          }}
        >
          导出
        </Button>
      }
    />
  )

  const table = (
    <Table<SubcontractContract>
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
      scroll={{ x: 1600 }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无分包合同数据"
            desc="新增分包合同后，可在此查看合同金额和付款进度。"
            action={<Button type="primary" onClick={handleAddClick}>新增合同</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<SubcontractContract>
        data={contracts.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.name}
        getDescription={(item) => `合同编号：${item.code}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus} approvedAt={item.approvedAt} />}
        fields={[
          { key: 'projectName', label: '项目名称', render: (item) => item.projectName || '-' },
          { key: 'constructionName', label: '施工立项', render: (item) => item.constructionName || '-' },
          { key: 'subcontractWorkerName', label: '分包人员', render: (item) => item.subcontractWorkerName || '-' },
          { key: 'contractAmount', label: '合同金额', render: (item) => <Text strong style={{ color: '#1677ff' }}>{fmtMoney(item.contractAmount)}</Text> },
          { key: 'paidAmount', label: '已付金额', render: (item) => <Text style={{ color: '#52c41a' }}>{fmtMoney(item.paidAmount)}</Text> },
          { key: 'unpaidAmount', label: '未付金额', render: (item) => <Text style={{ color: item.unpaidAmount > 0 ? '#fa8c16' : '#8c8c8c' }}>{fmtMoney(item.unpaidAmount)}</Text> },
          { key: 'signDate', label: '签订日期', render: (item) => fmtDate(item.signDate), fullWidth: true },
        ]}
        actions={(record) => {
          const locked = isApprovalLocked(record)
          const lockReason = getApprovalLockReason(record) ?? ''
          return (
            <Space size={2} wrap>
              <ViewRecordButton resource="subcontract-contracts" id={record.id} />
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
              <ApprovalActions
                id={record.id}
                approvalStatus={record.approvalStatus}
                approvedAt={record.approvedAt}
                resource="subcontract-contracts"
                onSuccess={() => loadContracts(lastFilter)}
              />
              {canDelete ? (
                <Popconfirm
                  title="确认删除？"
                  description="删除后无法恢复"
                  onConfirm={() => handleDelete(record.id)}
                  okText="确认"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              ) : null}
            </Space>
          )
        }}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无分包合同数据"
            desc="新增分包合同后，可在此查看合同金额和付款进度。"
            action={<Button type="primary" onClick={handleAddClick}>新增合同</Button>}
          />
        }
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
        title="分包合同管理"
        desc="管理项目分包合同，跟踪付款进度"
        createLabel="新增合同"
        onCreate={handleAddClick}
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

      <ResponsiveModalDrawer
        title={editingId ? '编辑分包合同' : '新增分包合同'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        width={560}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={handleFinishFailed}
          validateMessages={DEFAULT_FORM_VALIDATE_MESSAGES}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="合同名称" name="name" rules={[{ required: true, message: '请输入合同名称' }]}>
            <Input placeholder="请输入合同名称" />
          </Form.Item>

          <Form.Item label="项目" name="projectId" rules={[{ required: true, message: '请选择项目' }]}>
            <Select
              placeholder="请选择项目"
              showSearch
              optionFilterProp="label"
              loading={projectsLoading}
              options={projects
                .filter((project) => canUseAsApprovedUpstream(project))
                .map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
            />
          </Form.Item>

          <Form.Item label="施工立项" name="constructionId" rules={[{ required: true, message: '请选择施工立项' }]}>
            <Select
              placeholder="请选择施工立项"
              showSearch
              optionFilterProp="label"
              loading={constructionsLoading}
              options={constructions
                .filter(
                  (construction) =>
                    canUseAsApprovedUpstream(construction) &&
                    (!selectedProjectId || construction.projectId === selectedProjectId)
                )
                .map((construction) => ({
                  label: construction.name,
                  value: construction.id,
                }))}
            />
          </Form.Item>

          <Form.Item label="分包人员" name="workerId" rules={[{ required: true, message: '请选择分包人员' }]}>
            <Select
              placeholder="请选择分包人员"
              showSearch
              optionFilterProp="label"
              loading={vendorsLoading}
              options={vendors.map((vendor) => ({
                label: vendor.name,
                value: vendor.id,
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
              prefix="¥"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => {
                const normalized = v?.replace(/,/g, '') || ''
                return (normalized ? Number(normalized) : undefined) as any
              }}
            />
          </Form.Item>

          <Form.Item label="签订日期" name="signDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="已付款金额" name="paidAmount">
            <InputNumber
              placeholder="请输入已付款金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => {
                const normalized = v?.replace(/,/g, '') || ''
                return (normalized ? Number(normalized) : undefined) as any
              }}
            />
          </Form.Item>

          <Form.Item label="未付款金额" name="unpaidAmount">
            <InputNumber style={{ width: '100%' }} precision={2} prefix="¥" disabled />
          </Form.Item>

          <Form.Item label="附件" name="attachmentUrl">
            <AttachmentUploadField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </ResponsiveModalDrawer>
    </>
  )
}
