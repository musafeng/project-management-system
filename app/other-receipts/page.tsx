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
import { isApprovalLocked } from '@/lib/approval-status'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { isSystemManagerClientUser } from '@/lib/system-manager'
import { EmptyHint, FilterBar, LedgerPageLayout, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { requestApi } from '@/lib/client-request'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

interface OtherReceipt {
  id: string
  projectId?: string | null
  projectName?: string | null
  submitterName?: string | null
  receiptType: string
  receiptAmount: number
  receiptDate: string
  attachmentUrl?: string
  approvalStatus: string
  approvedAt?: string | null
  remark?: string
}

function applyClientFilters(data: OtherReceipt[], filters: FilterValues) {
  let filtered = data
  if (filters.dateRange && Array.isArray(filters.dateRange)) {
    const [start, end] = filters.dateRange as [string, string]
    if (start && end) {
      const startDate = dayjs(start)
      const endDate = dayjs(end)
      filtered = filtered.filter((item) => {
        if (!item.receiptDate) return false
        const d = dayjs(item.receiptDate)
        return d.isValid() && !d.isBefore(startDate, 'day') && !d.isAfter(endDate, 'day')
      })
    }
  }
  return filtered
}

export default function OtherReceiptsPage() {
  const [data, setData] = useState<OtherReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OtherReceipt | null>(null)
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
    if (keyword) params.set('submitter', keyword)
    const url = `/api/other-receipts${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<OtherReceipt[]>(url, {
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

  const handleOpen = (record?: OtherReceipt) => {
    setEditing(record || null)
    form.resetFields()

    if (record) {
      form.setFieldsValue({
        receiptType: record.receiptType,
        receiptAmount: record.receiptAmount,
        receiptDate: dayjs(record.receiptDate),
        attachmentUrl: record.attachmentUrl,
        remark: record.remark,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      receiptDate: values.receiptDate?.format('YYYY-MM-DD'),
    }

    const url = editing ? `/api/other-receipts/${editing.id}` : '/api/other-receipts'
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
    const result = await requestApi(`/api/other-receipts/${id}`, {
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
    () => data.reduce((sum, record) => sum + Number(record.receiptAmount || 0), 0),
    [data]
  )

  const summaryCards = (
    <AmountSummaryCards
      isMobile={isMobile}
      items={[{ label: '总金额', value: fmtMoney(total), color: '#52c41a' }]}
    />
  )

  const columns: ColumnsType<OtherReceipt> = [
    { title: '收款事由', dataIndex: 'receiptType', width: 180 },
    {
      title: '金额',
      dataIndex: 'receiptAmount',
      width: 120,
      align: 'right',
      render: (value) => <Text strong style={{ color: '#52c41a' }}>{fmtMoney(Number(value))}</Text>,
    },
    { title: '日期', dataIndex: 'receiptDate', width: 110, render: (v) => fmtDate(v) },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (value, record) => <ApprovalStatusTag status={value || 'DRAFT'} approvedAt={record.approvedAt} />,
    },
    { title: '填报人', dataIndex: 'submitterName', width: 100, render: (value) => value || '-' },
    { title: '备注', dataIndex: 'remark', width: 180, render: (value) => value || '-' },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      render: (_, record) => {
        const locked = isApprovalLocked(record)
        return (
          <Space size="small" wrap>
            <ViewRecordButton resource="other-receipts" id={record.id} />
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
              resource="other-receipts"
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
        { type: 'input', key: 'keyword', placeholder: '搜索填报人' },
        { type: 'dateRange', key: 'dateRange', placeholder: ['收款开始', '收款结束'] },
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
            const params = new URLSearchParams({ resourceType: 'other-receipts' })
            const keyword = (lastFilter.keyword as string)?.trim()
            if (keyword) params.set('submitter', keyword)
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
    <Table<OtherReceipt>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      size="small"
      scroll={{ x: 860 }}
      pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无其他收款数据"
            desc="新增其他收款后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增收款</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<OtherReceipt>
        data={data.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.receiptType || '其他收款'}
        getDescription={(item) => `日期：${fmtDate(item.receiptDate)}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          { key: 'receiptAmount', label: '金额', render: (item) => <Text strong style={{ color: '#52c41a' }}>{fmtMoney(Number(item.receiptAmount))}</Text>, fullWidth: true },
          { key: 'projectName', label: '项目', render: (item) => item.projectName || '-' },
          { key: 'submitterName', label: '填报人', render: (item) => item.submitterName || '-' },
          { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        ]}
        actions={(record) => {
          const locked = isApprovalLocked(record)
          return (
            <Space size="small" wrap>
              <ViewRecordButton resource="other-receipts" id={record.id} />
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
                resource="other-receipts"
                onSuccess={() => load(lastFilter)}
              />
            </Space>
          )
        }}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无其他收款数据"
            desc="新增其他收款后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增收款</Button>}
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
        title="其他收款"
        desc="管理项目无关或其他来源的收款记录"
        createLabel="新增收款"
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
        title={editing ? '编辑其他收款' : '新增其他收款'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
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
          <Form.Item label="收款事由" name="receiptType" rules={[{ required: true, message: '请填写收款事由' }]}>
            <Input placeholder="请输入收款事由" />
          </Form.Item>

          <Form.Item label="金额" name="receiptAmount" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0.01} placeholder="请输入金额" />
          </Form.Item>

          <Form.Item label="日期" name="receiptDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="附件" name="attachmentUrl">
            <AttachmentUploadField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </ResponsiveModalDrawer>
    </>
  )
}
