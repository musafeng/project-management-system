'use client'

import { DeleteOutlined, DownloadOutlined, EditOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'
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

interface ExpenseItem {
  type: string
  amount: number
  remark?: string | null
  attachmentUrl?: string | null
}

interface Expense {
  id: string
  projectId?: string | null
  projectName?: string | null
  submitter: string
  totalAmount: number
  expenseItems: ExpenseItem[]
  expenseDate: string
  attachmentUrl?: string
  approvalStatus: string
  approvedAt?: string | null
  remark?: string
}

const EXPENSE_TYPES = ['烟酒费', '餐费', '饭局', '其他']

function applyClientFilters(data: Expense[], filters: FilterValues) {
  let filtered = data
  if (filters.dateRange && Array.isArray(filters.dateRange)) {
    const [start, end] = filters.dateRange as [string, string]
    if (start && end) {
      const startDate = dayjs(start)
      const endDate = dayjs(end)
      filtered = filtered.filter((item) => {
        if (!item.expenseDate) return false
        const d = dayjs(item.expenseDate)
        return d.isValid() && !d.isBefore(startDate, 'day') && !d.isAfter(endDate, 'day')
      })
    }
  }
  return filtered
}

export default function SalesExpensesPage() {
  const [data, setData] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [items, setItems] = useState<ExpenseItem[]>([{ type: '餐费', amount: 0 }])
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
    const url = `/api/sales-expenses${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<Expense[]>(url, {
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

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const handleOpen = (record?: Expense) => {
    setEditing(record || null)
    const nextItems = record?.expenseItems?.length ? record.expenseItems : [{ type: '餐费', amount: 0 }]
    setItems(nextItems)
    form.resetFields()

    if (record) {
      form.setFieldsValue({
        submitter: record.submitter,
        expenseDate: dayjs(record.expenseDate),
        attachmentUrl: record.attachmentUrl,
        remark: record.remark,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    if (items.length === 0 || totalAmount <= 0) {
      message.error('请至少填写一条有效费用明细')
      return
    }

    const payload = {
      ...values,
      expenseDate: values.expenseDate?.format('YYYY-MM-DD'),
      expenseItems: items,
    }

    const url = editing ? `/api/sales-expenses/${editing.id}` : '/api/sales-expenses'
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
    const result = await requestApi(`/api/sales-expenses/${id}`, {
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

  const summary = useMemo(
    () => ({
      count: data.length,
      total: data.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
    }),
    [data]
  )

  const summaryCards = (
    <AmountSummaryCards
      isMobile={isMobile}
      items={[
        { label: '报销单数', value: `${summary.count} 单`, color: '#8c8c8c' },
        { label: '报销总金额', value: fmtMoney(summary.total), color: '#ff4d4f' },
      ]}
    />
  )

  const columns: ColumnsType<Expense> = [
    { title: '报销人', dataIndex: 'submitter', width: 120 },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value) => <Text strong style={{ color: '#ff4d4f' }}>{fmtMoney(Number(value))}</Text>,
    },
    { title: '日期', dataIndex: 'expenseDate', width: 120, render: (v) => fmtDate(v) },
    {
      title: '审批状态',
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
            <ViewRecordButton resource="sales-expenses" id={record.id} />
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
              resource="sales-expenses"
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
        { type: 'input', key: 'keyword', placeholder: '搜索报销人' },
        { type: 'dateRange', key: 'dateRange', placeholder: ['报销开始', '报销结束'] },
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
            const params = new URLSearchParams({ resourceType: 'sales-expenses' })
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
    <Table<Expense>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      size="small"
      scroll={{ x: 800 }}
      pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无销售费用报销数据"
            desc="新增销售费用报销后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增报销</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<Expense>
        data={data.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.submitter || '销售费用报销'}
        getDescription={(item) => `日期：${fmtDate(item.expenseDate)}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          { key: 'totalAmount', label: '总金额', render: (item) => <Text strong style={{ color: '#ff4d4f' }}>{fmtMoney(Number(item.totalAmount))}</Text>, fullWidth: true },
          { key: 'projectName', label: '项目', render: (item) => item.projectName || '-' },
          { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        ]}
        actions={(record) => {
          const locked = isApprovalLocked(record)
          return (
            <Space size="small" wrap>
              <ViewRecordButton resource="sales-expenses" id={record.id} />
              <Button type="link" size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>编辑</Button>
              {canDelete ? (
                <Popconfirm title="删除销售费用报销" description="确定删除该报销记录吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" disabled={locked}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={locked}>删除</Button>
                </Popconfirm>
              ) : null}
              <ApprovalActions
                id={record.id}
                approvalStatus={record.approvalStatus || 'DRAFT'}
                approvedAt={record.approvedAt}
                resource="sales-expenses"
                onSuccess={() => load(lastFilter)}
              />
            </Space>
          )
        }}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无销售费用报销数据"
            desc="新增销售费用报销后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增报销</Button>}
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
        title="销售费用报销"
        desc="提交并跟踪销售费用报销的审批进度"
        createLabel="新增报销"
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
        title={editing ? '编辑销售费用报销' : '新增销售费用报销'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        width={620}
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
          <Form.Item label="报销人" name="submitter" rules={[{ required: true, message: '请填写报销人' }]}>
            <Input />
          </Form.Item>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              费用明细 <span style={{ color: '#1677ff' }}>合计：{fmtMoney(totalAmount)}</span>
            </div>
            {items.map((item, index) => (
              <div key={index} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Select
                    value={item.type}
                    onChange={(value) =>
                      setItems((current) =>
                        current.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, type: value } : currentItem
                        )
                      )
                    }
                    options={EXPENSE_TYPES.map((type) => ({ label: type, value: type }))}
                    style={{ width: 120 }}
                  />
                  <InputNumber
                    value={item.amount}
                    onChange={(value) =>
                      setItems((current) =>
                        current.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, amount: Number(value) || 0 } : currentItem
                        )
                      )
                    }
                    placeholder="金额"
                    precision={2}
                    min={0}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  />
                </div>
                <Input
                  value={item.remark || ''}
                  onChange={(e) =>
                    setItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, remark: e.target.value } : currentItem
                      )
                    )
                  }
                  placeholder="明细备注"
                  style={{ marginBottom: 8 }}
                />
                <AttachmentUploadField
                  value={item.attachmentUrl || null}
                  onChange={(value) =>
                    setItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, attachmentUrl: value } : currentItem
                      )
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setItems((current) => [...current, { type: '餐费', amount: 0, remark: '', attachmentUrl: null }])}
            >
              添加明细
            </Button>
          </div>

          <Form.Item label="日期" name="expenseDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="整单附件" name="attachmentUrl">
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
