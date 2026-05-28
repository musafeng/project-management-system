'use client'

import { DeleteOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { ApprovalActions, ApprovalStatusTag } from '@/components/ApprovalActions'
import AmountSummaryCards from '@/components/AmountSummaryCards'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import ViewRecordButton from '@/components/ViewRecordButton'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { canUseAsApprovedUpstream } from '@/lib/approval-status'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { isSystemManagerClientUser } from '@/lib/system-manager'
import { EmptyHint, FilterBar, LedgerPageLayout, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { requestApi } from '@/lib/client-request'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

interface SubcontractPayment {
  id: string
  contractId: string
  workerId?: string | null
  contractCode: string
  contractName: string
  constructionName?: string
  projectName: string
  subcontractWorkerName: string
  subcontractWorkerPhone?: string | null
  subcontractWorkerIdNumber?: string | null
  subcontractWorkerBankAccount?: string | null
  subcontractWorkerBankName?: string | null
  amount: number
  paymentDate: string
  attachmentUrl?: string | null
  approvalStatus: string
  approvedAt?: string | null
  remark: string | null
  createdAt: string
}

interface SubcontractContract {
  id: string
  code: string
  name: string
  projectId: string
  projectName: string
  constructionName: string
  subcontractWorkerName: string
  subcontractWorkerPhone?: string | null
  subcontractWorkerIdNumber?: string | null
  subcontractWorkerBankAccount?: string | null
  subcontractWorkerBankName?: string | null
  contractAmount: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  signDate: string | null
  approvalStatus?: string | null
  approvedAt?: string | null
  createdAt: string
}

function applyClientFilters(data: SubcontractPayment[], filters: FilterValues) {
  let filtered = data
  if (filters.dateRange && Array.isArray(filters.dateRange)) {
    const [start, end] = filters.dateRange as [string, string]
    if (start && end) {
      const startDate = dayjs(start)
      const endDate = dayjs(end)
      filtered = filtered.filter((item) => {
        if (!item.paymentDate) return false
        const d = dayjs(item.paymentDate)
        return d.isValid() && !d.isBefore(startDate, 'day') && !d.isAfter(endDate, 'day')
      })
    }
  }
  return filtered
}

export default function SubcontractPaymentsPage() {
  const [data, setData] = useState<SubcontractPayment[]>([])
  const [contracts, setContracts] = useState<SubcontractContract[]>([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const selectedContractId = Form.useWatch('contractId', form)
  const selectedContract = contracts.find((item) => item.id === selectedContractId)
  const isMobile = useMobile()

  useEffect(() => {
    getCurrentAuthUser().then((user) => setIsAdmin(isSystemManagerClientUser(user)))
  }, [])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [data.length, mobilePage])

  const loadContracts = async () => {
    setContractsLoading(true)
    const result = await requestApi<SubcontractContract[]>('/api/subcontract-contracts', {
      credentials: 'include',
      fallbackError: '加载分包合同列表失败',
    })
    if (result.success) setContracts(result.data || [])
    else setContracts([])
    setContractsLoading(false)
  }

  const load = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const projectId = (filters.projectId as string) || ''
    const contractId = (filters.contractId as string) || ''
    if (projectId) params.set('projectId', projectId)
    if (contractId) params.set('contractId', contractId)
    const url = `/api/subcontract-payments${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<SubcontractPayment[]>(url, {
      credentials: 'include',
      fallbackError: '数据加载失败，请稍后重试',
    })
    if (result.success) {
      setData(applyClientFilters(result.data || [], filters))
    } else {
      setData([])
      message.error(result.error || '数据加载失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadContracts()
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setMobilePage(1)
    setLastFilter(filters)
    load(filters)
  }

  const handleReset = () => {
    setMobilePage(1)
    setLastFilter({})
    load({})
  }

  const handleOpen = () => {
    form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = {
      contractId: values.contractId,
      amount: values.amount,
      paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : null,
      attachmentUrl: values.attachmentUrl || null,
      remark: values.remark || null,
    }

    const result = await requestApi('/api/subcontract-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      fallbackError: '操作失败，请稍后重试',
    })

    if (result.success) {
      message.success('分包付款记录已创建')
      setModalOpen(false)
      form.resetFields()
      load(lastFilter)
    } else {
      message.error(result.error || '操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/subcontract-payments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      fallbackError: '删除失败，请稍后重试',
    })

    if (result.success) {
      message.success('分包付款记录已删除')
      load(lastFilter)
    } else {
      message.error(result.error || '删除失败')
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const projectOptions = useMemo(
    () =>
      Array.from(
        new Map(contracts.map((contract) => [contract.projectId, contract.projectName])).entries()
      )
        .filter(([value]) => Boolean(value))
        .map(([value, label]) => ({ value, label: label || value })),
    [contracts]
  )

  const filterContractOptions = useMemo(
    () =>
      contracts
        .filter((contract) => canUseAsApprovedUpstream(contract))
        .map((contract) => ({
          label: `${contract.code} - ${contract.projectName}`,
          value: contract.id,
        })),
    [contracts]
  )

  const formContractOptions = useMemo(
    () =>
      contracts
        .filter((contract) => canUseAsApprovedUpstream(contract))
        .map((contract) => ({
          label: `${contract.code} - ${contract.name}`,
          value: contract.id,
        })),
    [contracts]
  )

  const summaryItems = useMemo(() => {
    const filterContractId = (lastFilter.contractId as string) || ''
    const filterProjectId = (lastFilter.projectId as string) || ''
    const filterDateRange = lastFilter.dateRange as [string, string] | undefined
    const paymentContractIds = new Set(data.map((p) => p.contractId))
    const summaryContracts = contracts.filter((contract) => {
      if (filterContractId) return contract.id === filterContractId
      if (filterProjectId) return contract.projectId === filterProjectId
      if (filterDateRange) return paymentContractIds.has(contract.id)
      return true
    })

    return [
      {
        label: '合同总金额',
        value: fmtMoney(summaryContracts.reduce((sum, c) => sum + Number(c.contractAmount || 0), 0)),
        color: '#1677ff',
      },
      {
        label: '已付款总金额',
        value: fmtMoney(data.reduce((sum, p) => sum + Number(p.amount || 0), 0)),
        color: '#52c41a',
      },
      {
        label: '未付款总金额',
        value: fmtMoney(summaryContracts.reduce((sum, c) => sum + Number(c.unpaidAmount || 0), 0)),
        color: '#f5222d',
      },
    ]
  }, [contracts, data, lastFilter])

  const summaryCards = <AmountSummaryCards items={summaryItems} isMobile={isMobile} />

  const columns: ColumnsType<SubcontractPayment> = [
    {
      title: '合同编号',
      dataIndex: 'contractCode',
      width: 130,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    { title: '合同名称', dataIndex: 'contractName', width: 180 },
    { title: '项目名称', dataIndex: 'projectName', width: 150 },
    { title: '分包人员', dataIndex: 'subcontractWorkerName', width: 130, render: (v) => v || '-' },
    {
      title: '付款金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => (
        <Text strong style={{ color: '#ff7a45' }}>
          {fmtMoney(Number(value))}
        </Text>
      ),
    },
    { title: '付款日期', dataIndex: 'paymentDate', width: 120, render: (v) => fmtDate(v) },
    { title: '备注', dataIndex: 'remark', width: 180, render: (v) => v || '-' },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v) => fmtDate(v) },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (value, record) => <ApprovalStatusTag status={value || 'DRAFT'} approvedAt={record.approvedAt} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <ViewRecordButton resource="subcontract-payments" id={record.id} />
          <Popconfirm
            title="删除分包付款"
            description="确定删除该分包付款记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            approvedAt={record.approvedAt}
            resource="subcontract-payments"
            isAdmin={isAdmin}
            onSuccess={() => load(lastFilter)}
          />
        </Space>
      ),
    },
  ]

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'select', key: 'projectId', placeholder: '选择项目', options: projectOptions, width: 200 },
        { type: 'select', key: 'contractId', placeholder: '选择合同', options: filterContractOptions, width: 250 },
        { type: 'dateRange', key: 'dateRange', placeholder: ['付款开始', '付款结束'] },
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
            const params = new URLSearchParams({ resourceType: 'subcontract-payments' })
            const pId = (lastFilter.projectId as string) || ''
            const cId = (lastFilter.contractId as string) || ''
            if (pId) params.set('projectId', pId)
            if (cId) params.set('contractId', cId)
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
    <Table<SubcontractPayment>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      size="small"
      scroll={{ x: 1200 }}
      pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无分包付款数据"
            desc="新增付款后，可在此查看分包付款明细。"
            action={
              <Button type="primary" onClick={handleOpen}>
                新增付款
              </Button>
            }
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<SubcontractPayment>
        data={data.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.contractName || '分包付款'}
        getDescription={(item) => `合同编号：${item.contractCode || '-'}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          {
            key: 'amount',
            label: '付款金额',
            render: (item) => (
              <Text strong style={{ color: '#ff7a45' }}>
                {fmtMoney(Number(item.amount))}
              </Text>
            ),
            fullWidth: true,
          },
          { key: 'projectName', label: '项目', render: (item) => item.projectName || '-' },
          { key: 'subcontractWorkerName', label: '分包人员', render: (item) => item.subcontractWorkerName || '-' },
          { key: 'paymentDate', label: '付款日期', render: (item) => fmtDate(item.paymentDate) },
          { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        ]}
        actions={(record) => (
          <Space size="small" wrap>
            <ViewRecordButton resource="subcontract-payments" id={record.id} />
            <Popconfirm
              title="删除分包付款"
              description="确定删除该分包付款记录吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <ApprovalActions
              id={record.id}
              approvalStatus={record.approvalStatus}
              approvedAt={record.approvedAt}
              resource="subcontract-payments"
              isAdmin={isAdmin}
              onSuccess={() => load(lastFilter)}
            />
          </Space>
        )}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无分包付款数据"
            desc="新增付款后，可在此查看分包付款明细。"
            action={
              <Button type="primary" onClick={handleOpen}>
                新增付款
              </Button>
            }
          />
        }
      />
      {data.length > MOBILE_PAGE_SIZE && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={mobilePage}
            pageSize={MOBILE_PAGE_SIZE}
            total={data.length}
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
        title="分包付款管理"
        desc="管理分包合同的付款进度和审批流转"
        createLabel="新增付款"
        onCreate={handleOpen}
        total={data.length}
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
        title="新增分包付款"
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalOpen(false)
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
          onFinishFailed={handleFinishFailed}
          validateMessages={DEFAULT_FORM_VALIDATE_MESSAGES}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="合同" name="contractId" rules={[{ required: true, message: '请选择合同' }]}>
            <Select placeholder="请选择合同" loading={contractsLoading} options={formContractOptions} />
          </Form.Item>

          {selectedContract && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                lineHeight: 1.8,
                color: '#595959',
              }}
            >
              <div style={{ marginBottom: 6, fontWeight: 500, color: '#1d1d1f' }}>合同联动信息</div>
              <div>合同名称：{selectedContract.name}</div>
              <div>施工立项：{selectedContract.constructionName || '-'}</div>
              <div>项目名称：{selectedContract.projectName}</div>
              <div>分包人员：{selectedContract.subcontractWorkerName}</div>
              <div>联系电话：{selectedContract.subcontractWorkerPhone || '-'}</div>
              <div>身份证号：{selectedContract.subcontractWorkerIdNumber || '-'}</div>
              <div>银行卡：{selectedContract.subcontractWorkerBankAccount || '-'}</div>
              <div>开户行：{selectedContract.subcontractWorkerBankName || '-'}</div>
            </div>
          )}

          <Form.Item
            label="付款金额"
            name="amount"
            rules={[
              { required: true, message: '请输入付款金额' },
              { type: 'number', min: 0, message: '付款金额必须大于 0' },
            ]}
          >
            <InputNumber placeholder="请输入付款金额" style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>

          <Form.Item label="付款日期" name="paymentDate">
            <DatePicker style={{ width: '100%' }} />
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
