'use client'

import { DeleteOutlined, DownloadOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
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
import { getIssuanceDisplayStatus, isApprovalLocked } from '@/lib/approval-status'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { isSystemManagerClientUser } from '@/lib/system-manager'
import { EmptyHint, FilterBar, LedgerPageLayout, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { requestApi } from '@/lib/client-request'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

interface PettyCash {
  id: string
  projectId?: string | null
  projectName?: string | null
  holder: string
  applyReason?: string
  issuedAmount: number
  returnedAmount: number
  issueDate: string
  returnDate?: string
  status: string
  attachmentUrl?: string
  approvalStatus: string
  approvedAt?: string | null
  remark?: string
}

const CASH_STATUS: Record<string, { label: string; color: string }> = {
  PENDING_ISSUE: { label: '待发放', color: 'orange' },
  ISSUED: { label: '已发放', color: 'blue' },
  RETURNED: { label: '已退回', color: 'green' },
  PARTIAL: { label: '部分退回', color: 'orange' },
}

function applyClientFilters(data: PettyCash[], filters: FilterValues) {
  let filtered = data
  if (filters.dateRange && Array.isArray(filters.dateRange)) {
    const [start, end] = filters.dateRange as [string, string]
    if (start && end) {
      const startDate = dayjs(start)
      const endDate = dayjs(end)
      filtered = filtered.filter((item) => {
        if (!item.issueDate) return false
        const d = dayjs(item.issueDate)
        return d.isValid() && !d.isBefore(startDate, 'day') && !d.isAfter(endDate, 'day')
      })
    }
  }
  return filtered
}

export default function PettyCashesPage() {
  const [data, setData] = useState<PettyCash[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PettyCash | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const isMobile = useMobile()

  useEffect(() => {
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [data.length, mobilePage])

  const load = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const keyword = (filters.keyword as string)?.trim()
    if (keyword) params.set('holder', keyword)
    const url = `/api/petty-cashes${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<PettyCash[]>(url, {
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

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const handleOpen = (record?: PettyCash) => {
    setEditing(record || null)
    form.resetFields()

    if (record) {
      form.setFieldsValue({
        holder: record.holder,
        applyReason: record.applyReason,
        issuedAmount: record.issuedAmount,
        issueDate: dayjs(record.issueDate),
        attachmentUrl: record.attachmentUrl,
        remark: record.remark,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      issueDate: values.issueDate?.format('YYYY-MM-DD'),
    }

    const url = editing ? `/api/petty-cashes/${editing.id}` : '/api/petty-cashes'
    const method = editing ? 'PUT' : 'POST'
    const result = await requestApi(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      fallbackError: '操作失败，请稍后重试',
    })

    if (result.success) {
      message.success(editing ? '更新成功' : '创建成功')
      setModalOpen(false)
      load(lastFilter)
    } else {
      message.error(result.error || '操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/petty-cashes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      fallbackError: '删除失败，请稍后重试',
    })

    if (result.success) {
      message.success('已删除')
      load(lastFilter)
    } else {
      message.error(result.error || '删除失败')
    }
  }

  const total = useMemo(
    () => data.reduce((sum, record) => sum + Number(record.issuedAmount || 0), 0),
    [data]
  )

  const summaryCards = (
    <AmountSummaryCards
      isMobile={isMobile}
      items={[{ label: '申请总金额', value: fmtMoney(total), color: '#fa8c16' }]}
    />
  )

  const renderStatusTag = (record: PettyCash) => {
    const displayStatus = getIssuanceDisplayStatus(record.status, record)
    const meta = CASH_STATUS[displayStatus]
    return <Tag color={meta?.color}>{meta?.label || displayStatus}</Tag>
  }

  const columns: ColumnsType<PettyCash> = [
    { title: '申请人', dataIndex: 'holder', width: 100 },
    { title: '申请事由', dataIndex: 'applyReason', width: 180, render: (value) => value || '-' },
    {
      title: '申请金额',
      dataIndex: 'issuedAmount',
      width: 120,
      align: 'right',
      render: (value) => <Text strong style={{ color: '#fa8c16' }}>{fmtMoney(Number(value))}</Text>,
    },
    {
      title: '已退回',
      dataIndex: 'returnedAmount',
      width: 110,
      align: 'right',
      render: (value) => fmtMoney(Number(value)),
    },
    { title: '日期', dataIndex: 'issueDate', width: 110, render: (v) => fmtDate(v) },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => renderStatusTag(record),
    },
    {
      title: '审批',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (value, record) => <ApprovalStatusTag status={value || 'DRAFT'} approvedAt={record.approvedAt} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      render: (_, record) => {
        const locked = isApprovalLocked(record)
        return (
          <Space size="small" wrap>
            <ViewRecordButton resource="petty-cashes" id={record.id} />
            <Button size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>
              编辑
            </Button>
            {canDelete ? (
              <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
                <Button size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
            <ApprovalActions
              id={record.id}
              approvalStatus={record.approvalStatus || 'DRAFT'}
              approvedAt={record.approvedAt}
              resource="petty-cashes"
              onSuccess={() => load(lastFilter)}
            />
          </Space>
        )
      },
    },
  ]

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'input', key: 'keyword', placeholder: '搜索申请人' },
        { type: 'dateRange', key: 'dateRange', placeholder: ['申请开始', '申请结束'] },
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
            const params = new URLSearchParams({ resourceType: 'petty-cashes' })
            const keyword = (lastFilter.keyword as string)?.trim()
            if (keyword) params.set('holder', keyword)
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
    <Table<PettyCash>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      size="small"
      scroll={{ x: 1000 }}
      pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无备用金申请数据"
            desc="新增备用金申请后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增申请</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<PettyCash>
        data={data.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.holder || '备用金申请'}
        getDescription={(item) => `日期：${fmtDate(item.issueDate)}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          { key: 'issuedAmount', label: '申请金额', render: (item) => <Text strong style={{ color: '#fa8c16' }}>{fmtMoney(Number(item.issuedAmount))}</Text> },
          { key: 'returnedAmount', label: '已退回', render: (item) => fmtMoney(Number(item.returnedAmount)) },
          { key: 'applyReason', label: '申请事由', render: (item) => item.applyReason || '-', fullWidth: true },
          { key: 'status', label: '发放状态', render: (item) => renderStatusTag(item) },
        ]}
        actions={(record) => {
          const locked = isApprovalLocked(record)
          return (
            <Space size="small" wrap>
              <ViewRecordButton resource="petty-cashes" id={record.id} />
              <Button type="link" size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>编辑</Button>
              {canDelete ? (
                <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={locked}>删除</Button>
                </Popconfirm>
              ) : null}
              <ApprovalActions
                id={record.id}
                approvalStatus={record.approvalStatus || 'DRAFT'}
                approvedAt={record.approvedAt}
                resource="petty-cashes"
                onSuccess={() => load(lastFilter)}
              />
            </Space>
          )
        }}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无备用金申请数据"
            desc="新增备用金申请后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增申请</Button>}
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
        title="备用金申请"
        desc="跟踪备用金的发放与退回进度"
        createLabel="新增申请"
        onCreate={() => handleOpen()}
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
        title={editing ? '编辑备用金申请' : '新增备用金申请'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        width={520}
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
          <Form.Item label="申请人" name="holder" rules={[{ required: true, message: '请填写申请人' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="申请事由" name="applyReason" rules={[{ required: true, message: '请填写申请事由' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="金额" name="issuedAmount" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0.01} />
          </Form.Item>

          <Form.Item label="日期" name="issueDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="附件" name="attachmentUrl">
            <AttachmentUploadField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </ResponsiveModalDrawer>
    </>
  )
}
