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

interface OtherPayment {
  id: string
  projectId?: string | null
  projectName?: string | null
  submitterName?: string | null
  supplierId?: string | null
  supplierName?: string | null
  contact?: string | null
  accountName?: string | null
  bankAccount?: string | null
  bankName?: string | null
  paymentType: string
  paymentAmount: number
  paymentDate: string
  attachmentUrl?: string
  approvalStatus: string
  approvedAt?: string | null
  remark?: string
}

interface SupplierOption {
  id: string
  name: string
  contact?: string | null
  bankAccount?: string | null
  bankName?: string | null
}

function applyClientFilters(data: OtherPayment[], filters: FilterValues) {
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

export default function OtherPaymentsPage() {
  const [data, setData] = useState<OtherPayment[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OtherPayment | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const isMobile = useMobile()
  const selectedSupplierId = Form.useWatch('supplierId', form)

  useEffect(() => {
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [data.length, mobilePage])

  const loadSuppliers = async () => {
    setSuppliersLoading(true)
    const result = await requestApi<SupplierOption[]>('/api/suppliers', {
      credentials: 'include',
      fallbackError: '加载供应商列表失败',
    })
    if (result.success) setSuppliers(result.data || [])
    else setSuppliers([])
    setSuppliersLoading(false)
  }

  const load = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const keyword = (filters.keyword as string)?.trim()
    if (keyword) params.set('submitter', keyword)
    const url = `/api/other-payments${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<OtherPayment[]>(url, {
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
    loadSuppliers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedSupplierId) {
      if (!editing) {
        form.setFieldsValue({
          contact: undefined,
          accountName: undefined,
          bankAccount: undefined,
          bankName: undefined,
        })
      }
      return
    }

    const supplier = suppliers.find((item) => item.id === selectedSupplierId)
    if (!supplier) return
    form.setFieldsValue({
      contact: supplier.contact || undefined,
      accountName: supplier.name || undefined,
      bankAccount: supplier.bankAccount || undefined,
      bankName: supplier.bankName || undefined,
    })
  }, [selectedSupplierId, suppliers, form, editing])

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

  const handleOpen = (record?: OtherPayment) => {
    setEditing(record || null)
    form.resetFields()

    if (record) {
      form.setFieldsValue({
        supplierId: record.supplierId || undefined,
        contact: record.contact || undefined,
        accountName: record.accountName || undefined,
        bankAccount: record.bankAccount || undefined,
        bankName: record.bankName || undefined,
        paymentType: record.paymentType,
        paymentAmount: record.paymentAmount,
        paymentDate: dayjs(record.paymentDate),
        attachmentUrl: record.attachmentUrl,
        remark: record.remark,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      paymentDate: values.paymentDate?.format('YYYY-MM-DD'),
    }

    const url = editing ? `/api/other-payments/${editing.id}` : '/api/other-payments'
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
    const result = await requestApi(`/api/other-payments/${id}`, {
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
    () => data.reduce((sum, record) => sum + Number(record.paymentAmount || 0), 0),
    [data]
  )

  const summaryCards = (
    <AmountSummaryCards
      isMobile={isMobile}
      items={[{ label: '总金额', value: fmtMoney(total), color: '#ff4d4f' }]}
    />
  )

  const columns: ColumnsType<OtherPayment> = [
    { title: '付款事由', dataIndex: 'paymentType', width: 180 },
    {
      title: '金额',
      dataIndex: 'paymentAmount',
      width: 120,
      align: 'right',
      render: (value) => <Text strong style={{ color: '#ff4d4f' }}>{fmtMoney(Number(value))}</Text>,
    },
    { title: '供应商', dataIndex: 'supplierName', width: 140, render: (value) => value || '-' },
    { title: '日期', dataIndex: 'paymentDate', width: 110, render: (v) => fmtDate(v) },
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
            <ViewRecordButton resource="other-payments" id={record.id} />
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
              resource="other-payments"
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
            const params = new URLSearchParams({ resourceType: 'other-payments' })
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
    <Table<OtherPayment>
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
            title="暂无其他付款数据"
            desc="新增其他付款后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增付款</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<OtherPayment>
        data={data.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.paymentType || '其他付款'}
        getDescription={(item) => `日期：${fmtDate(item.paymentDate)}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          { key: 'paymentAmount', label: '金额', render: (item) => <Text strong style={{ color: '#ff4d4f' }}>{fmtMoney(Number(item.paymentAmount))}</Text>, fullWidth: true },
          { key: 'supplierName', label: '供应商', render: (item) => item.supplierName || '-' },
          { key: 'submitterName', label: '填报人', render: (item) => item.submitterName || '-' },
          { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        ]}
        actions={(record) => {
          const locked = isApprovalLocked(record)
          return (
            <Space size="small" wrap>
              <ViewRecordButton resource="other-payments" id={record.id} />
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
                resource="other-payments"
                onSuccess={() => load(lastFilter)}
              />
            </Space>
          )
        }}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无其他付款数据"
            desc="新增其他付款后，可在此管理审批进度。"
            action={<Button type="primary" onClick={() => handleOpen()}>新增付款</Button>}
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
        title="其他付款"
        desc="管理项目无关或非合同的其他付款记录"
        createLabel="新增付款"
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
        title={editing ? '编辑其他付款' : '新增其他付款'}
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
          <Form.Item label="供应商" name="supplierId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={suppliersLoading}
              placeholder="请选择供应商档案"
              options={suppliers.map((supplier) => ({
                label: supplier.name,
                value: supplier.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="联系人" name="contact">
            <Input placeholder="选择供应商后自动带出，可手动调整" />
          </Form.Item>

          <Form.Item label="户名" name="accountName">
            <Input placeholder="选择供应商后自动带出，可手动调整" />
          </Form.Item>

          <Form.Item label="银行卡号" name="bankAccount">
            <Input placeholder="选择供应商后自动带出，可手动调整" />
          </Form.Item>

          <Form.Item label="开户银行" name="bankName">
            <Input placeholder="选择供应商后自动带出，可手动调整" />
          </Form.Item>

          <Form.Item label="付款事由" name="paymentType" rules={[{ required: true, message: '请填写付款事由' }]}>
            <Input placeholder="请输入付款事由" />
          </Form.Item>

          <Form.Item label="金额" name="paymentAmount" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0.01} placeholder="请输入金额" />
          </Form.Item>

          <Form.Item label="日期" name="paymentDate" rules={[{ required: true, message: '请选择日期' }]}>
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
