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
import { canUseAsApprovedUpstream, isApprovalLocked } from '@/lib/approval-status'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
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
  projectId: string
  projectName: string
  constructionId?: string | null
  constructionName?: string | null
  submitter: string
  totalAmount: number
  expenseItems: ExpenseItem[]
  expenseDate: string
  attachmentUrl?: string
  approvalStatus: string
  approvedAt?: string | null
  remark?: string
  createdAt: string
}

interface ConstructionApproval {
  id: string
  name: string
  projectName: string
  approvalStatus: string
  approvedAt?: string | null
}

const EXPENSE_TYPES = ['辅料', '人工', '材料']

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

export default function ProjectExpensesPage() {
  const [data, setData] = useState<Expense[]>([])
  const [constructions, setConstructions] = useState<ConstructionApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([{ type: '材料', amount: 0 }])
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const isMobile = useMobile()

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const selectedConstructionId = Form.useWatch('constructionId', form)
  const selectedConstruction = useMemo(
    () => constructions.find((item) => item.id === selectedConstructionId),
    [constructions, selectedConstructionId]
  )

  useEffect(() => {
    if (selectedConstruction) {
      form.setFieldValue('projectName', selectedConstruction.projectName)
    } else if (!editing) {
      form.setFieldValue('projectName', undefined)
    }
  }, [selectedConstruction, editing, form])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [data.length, mobilePage])

  const load = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const keyword = (filters.keyword as string)?.trim()
    if (keyword) params.set('submitter', keyword)
    const url = `/api/project-expenses${params.toString() ? `?${params.toString()}` : ''}`
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

  const loadConstructions = async () => {
    const result = await requestApi<ConstructionApproval[]>('/api/construction-approvals', {
      credentials: 'include',
      fallbackError: '加载施工立项列表失败',
    })
    if (result.success) {
      setConstructions(
        (result.data || []).filter((item) => canUseAsApprovedUpstream(item))
      )
    } else {
      setConstructions([])
    }
  }

  useEffect(() => {
    load()
    loadConstructions()
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

  const handleOpen = (record?: Expense) => {
    setEditing(record || null)
    const its = record?.expenseItems?.length ? record.expenseItems : [{ type: '材料', amount: 0 }]
    setItems(its)
    form.resetFields()
    if (record) {
      form.setFieldsValue({
        constructionId: record.constructionId,
        projectName: record.projectName,
        submitter: record.submitter,
        expenseDate: dayjs(record.expenseDate),
        remark: record.remark,
        attachmentUrl: record.attachmentUrl,
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
      totalAmount,
    }
    const url = editing ? `/api/project-expenses/${editing.id}` : '/api/project-expenses'
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
    const result = await requestApi(`/api/project-expenses/${id}`, {
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
    { title: '施工立项', dataIndex: 'constructionName', width: 160, render: (value) => value || '-' },
    { title: '项目', dataIndex: 'projectName', width: 150 },
    { title: '报销人', dataIndex: 'submitter', width: 100 },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {fmtMoney(Number(value))}
        </Text>
      ),
    },
    { title: '日期', dataIndex: 'expenseDate', width: 110, render: (v) => fmtDate(v) },
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
            <ViewRecordButton resource="project-expenses" id={record.id} />
            <Button size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>
              编辑
            </Button>
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
              <Button size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <ApprovalActions
              id={record.id}
              approvalStatus={record.approvalStatus || 'DRAFT'}
              approvedAt={record.approvedAt}
              resource="project-expenses"
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
            const params = new URLSearchParams({ resourceType: 'project-expenses' })
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
      scroll={{ x: 920 }}
      pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无项目费用报销数据"
            desc="新增项目费用报销后，可在此管理审批进度。"
            action={
              <Button type="primary" onClick={() => handleOpen()}>
                新增报销
              </Button>
            }
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
        getTitle={(item) => item.submitter || '项目费用报销'}
        getDescription={(item) => `日期：${fmtDate(item.expenseDate)}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          {
            key: 'totalAmount',
            label: '总金额',
            render: (item) => (
              <Text strong style={{ color: '#ff4d4f' }}>
                {fmtMoney(Number(item.totalAmount))}
              </Text>
            ),
            fullWidth: true,
          },
          { key: 'projectName', label: '项目', render: (item) => item.projectName || '-' },
          { key: 'constructionName', label: '施工立项', render: (item) => item.constructionName || '-' },
          {
            key: 'expenseTypes',
            label: '费用类型',
            render: (item) =>
              item.expenseItems?.length
                ? Array.from(new Set(item.expenseItems.map((d) => d.type))).join(' / ')
                : '-',
          },
          { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        ]}
        actions={(record) => {
          const locked = isApprovalLocked(record)
          return (
            <Space size="small" wrap>
              <ViewRecordButton resource="project-expenses" id={record.id} />
              <Button type="link" size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>
                编辑
              </Button>
              <Popconfirm
                title="删除项目费用报销"
                description="确定删除该报销记录吗？"
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
                approvalStatus={record.approvalStatus || 'DRAFT'}
                approvedAt={record.approvedAt}
                resource="project-expenses"
                onSuccess={() => load(lastFilter)}
              />
            </Space>
          )
        }}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无项目费用报销数据"
            desc="新增项目费用报销后，可在此管理审批进度。"
            action={
              <Button type="primary" onClick={() => handleOpen()}>
                新增报销
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
        title="项目费用报销"
        desc="提交并跟踪项目费用报销的审批进度"
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
        title={editing ? '编辑项目费用报销' : '新增项目费用报销'}
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
          <Form.Item label="施工立项" name="constructionId" rules={[{ required: true, message: '请选择施工立项' }]}>
            <Select
              placeholder="请选择已审批通过的施工立项"
              options={constructions.map((item) => ({
                label: `${item.name} / ${item.projectName}`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="关联项目" name="projectName">
            <Input placeholder="将根据施工立项自动带出" disabled />
          </Form.Item>
          <Form.Item label="报销人" name="submitter" rules={[{ required: true, message: '请填写报销人' }]}>
            <Input placeholder="请输入报销人" />
          </Form.Item>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              费用明细 <span style={{ color: '#1677ff' }}>合计：{fmtMoney(totalAmount)}</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Select
                    value={item.type}
                    onChange={(v) => setItems((its) => its.map((x, i) => (i === idx ? { ...x, type: v } : x)))}
                    options={EXPENSE_TYPES.map((t) => ({ label: t, value: t }))}
                    style={{ width: 120 }}
                  />
                  <InputNumber
                    value={item.amount}
                    onChange={(v) => setItems((its) => its.map((x, i) => (i === idx ? { ...x, amount: Number(v) || 0 } : x)))}
                    placeholder="金额"
                    precision={2}
                    min={0}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setItems((its) => its.filter((_, i) => i !== idx))}
                  />
                </div>
                <Input
                  value={item.remark || ''}
                  onChange={(e) => setItems((its) => its.map((x, i) => (i === idx ? { ...x, remark: e.target.value } : x)))}
                  placeholder="明细备注"
                  style={{ marginBottom: 8 }}
                />
                <AttachmentUploadField
                  value={item.attachmentUrl || null}
                  onChange={(value) => setItems((its) => its.map((x, i) => (i === idx ? { ...x, attachmentUrl: value } : x)))}
                />
              </div>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setItems((its) => [...its, { type: '材料', amount: 0, remark: '', attachmentUrl: null }])}
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
