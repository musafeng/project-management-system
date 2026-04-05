'use client'

import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import DynamicForm from '@/components/DynamicForm'
import type { FormFieldConfig } from '@/components/DynamicForm'
import { watchCurrentAuthUser } from '@/lib/auth-client'
import { requestAction, requestApi } from '@/lib/client-api'
import { formatDateOnly } from '@/lib/date-only'
import { normalizeExpenseItems } from '@/lib/expense-items'
import { loadFormFields } from '@/lib/form-config-client'
import { buildListFilters, buildListQueryString } from '@/lib/list-filter-query'
import { ensureProjectOption, loadProjectOptions, type ProjectOption } from '@/lib/project-options-client'

type UserRole = 'ADMIN' | 'FINANCE' | 'PURCHASE' | 'PROJECT_MANAGER' | 'STAFF'

type AnyRecord = Record<string, any>

interface ExpenseItem { type?: string; amount?: number | null }
interface Expense {
  id: string
  projectId?: string
  projectName?: string
  submitter: string
  totalAmount: number
  expenseItems: ExpenseItem[]
  expenseDate: string
  attachmentUrl?: string
  approvalStatus: string
  remark?: string
  [key: string]: any
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已拒绝', color: 'red' },
}

const EXPENSE_TYPES = ['职工薪酬', '办公费', '交通费', '员工福利', '其他']
const EMPTY_EXPENSE_ITEM: ExpenseItem = { type: '', amount: null }

function fmt(v: number) {
  return `¥${Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function fmtDate(s: string) {
  return formatDateOnly(s) || s
}

function canWrite(role?: UserRole) {
  return !!role
}

function buildPayloadFromFormData(formData: AnyRecord, fields: FormFieldConfig[]) {
  const fieldKeys = fields.map((f) => f.fieldKey)
  const payload: AnyRecord = {}
  for (const key of fieldKeys) {
    payload[key] = formData[key]
  }

  const dateFieldMap: Record<string, string> = {
    expenseDate: 'YYYY-MM-DD',
  }

  for (const [k, fmt] of Object.entries(dateFieldMap)) {
    if (payload[k]?.format) payload[k] = payload[k].format(fmt)
  }

  return payload
}

function buildFormDataFromRecord(record: AnyRecord, fields: FormFieldConfig[]) {
  const formData: AnyRecord = {}
  for (const field of fields) {
    const key = field.fieldKey
    const value = record[key]
    if (field.componentType === 'date' && value) {
      formData[key] = dayjs(formatDateOnly(value))
    } else {
      formData[key] = value
    }
  }
  return formData
}

export default function ManagementExpensesPage() {
  const [data, setData] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [reloadAfterClose, setReloadAfterClose] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([EMPTY_EXPENSE_ITEM])
  const [form] = Form.useForm()
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([])
  const [formConfigStatus, setFormConfigStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [formConfigMessage, setFormConfigMessage] = useState('表单配置加载中...')
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [projectOptionsStatus, setProjectOptionsStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [projectOptionsMessage, setProjectOptionsMessage] = useState('项目选项加载中...')
  const [permissionsReady, setPermissionsReady] = useState(false)
  const [permissions, setPermissions] = useState({ create: false, edit: false, delete: false, export: false })
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState<any>(null)

  const normalizedExpenseItems = useMemo(() => normalizeExpenseItems(items), [items])
  const totalAmount = normalizedExpenseItems.totalAmount
  const listTotal = useMemo(() => data.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0), [data])
  const hasProjectField = useMemo(() => formFields.some((field) => field.fieldKey === 'projectId'), [formFields])
  const modalProjectOptions = useMemo(
    () => ensureProjectOption(projectOptions, editing?.projectId, editing?.projectName),
    [editing?.projectId, editing?.projectName, projectOptions]
  )
  const getCurrentFilters = (overrides?: { keyword?: string; startDate?: string; endDate?: string }) =>
    buildListFilters({
      keyword: overrides?.keyword ?? keyword,
      startDate: overrides?.startDate ?? dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: overrides?.endDate ?? dateRange?.[1]?.format('YYYY-MM-DD'),
    })

  const load = async (params?: { keyword?: string; startDate?: string; endDate?: string }) => {
    setLoading(true)
    try {
      const filters = getCurrentFilters(params)
      const queryString = buildListQueryString(filters)
      const url = queryString ? `/api/management-expenses?${queryString}` : '/api/management-expenses'
      const result = await requestApi<Expense[]>(url, undefined, '加载管理费用报销失败')
      if (result.success) {
        setData(result.data)
      } else {
        message.error(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const applyPermissions = (role?: UserRole) => {
    const allow = canWrite(role)
    setPermissions({ create: allow, edit: allow, delete: allow, export: allow })
  }

  const loadProjects = async () => {
    const result = await loadProjectOptions()
    setProjectOptions(result.options)
    setProjectOptionsStatus(result.status)
    setProjectOptionsMessage(result.message || '项目选项加载中...')
  }

  useEffect(() => {
    load()
    loadProjects()
    const stopWatchingAuth = watchCurrentAuthUser((user) => {
      applyPermissions(user?.systemRole as UserRole | undefined)
      setPermissionsReady(true)
      void loadProjects()
    })
    loadFormFields('management-expenses').then((result) => {
      setFormFields(result.fields)
      setFormConfigStatus(result.status)
      setFormConfigMessage(result.message || '表单配置加载中...')
      if (result.status !== 'ready') {
        message.error(result.message)
      }
    })

    return stopWatchingAuth
  }, [])

  const handleSearch = () => {
    load()
  }

  const handleReset = () => {
    setKeyword('')
    setDateRange(null)
    load({ keyword: '', startDate: '', endDate: '' })
  }

  const handleOpen = (record?: Expense) => {
    if (submitting) return
    if (!permissionsReady) {
      message.warning('权限加载中，请稍后再试')
      return
    }
    if (!permissions.create && !record) return
    if (!permissions.edit && record) return
    if (formConfigStatus === 'loading') {
      message.warning('表单配置加载中，请稍后再试')
      return
    }
    if (formConfigStatus !== 'ready') {
      message.error(formConfigMessage)
      return
    }
    setEditing(record || null)
    const currentItems = record?.expenseItems?.length ? record.expenseItems : [EMPTY_EXPENSE_ITEM]
    setItems(currentItems)
    if (record?.projectId) {
      setProjectOptions((current) => ensureProjectOption(current, record.projectId, record.projectName))
    }
    form.resetFields()
    if (record) {
      form.setFieldsValue({
        formData: buildFormDataFromRecord(record, formFields),
      })
    }
    setModalOpen(true)
  }

  const handleCloseModal = (shouldReload = false) => {
    if (submitting && !shouldReload) return
    setReloadAfterClose(shouldReload)
    setModalOpen(false)
  }

  const handleModalAfterClose = () => {
    setEditing(null)
    form.resetFields()
    setItems([EMPTY_EXPENSE_ITEM])
    if (reloadAfterClose) {
      setReloadAfterClose(false)
      void load()
    }
  }

  const handleSubmit = async (values: any) => {
    if (submitting) return
    const formData = values.formData || {}
    if (normalizedExpenseItems.error) {
      message.error(normalizedExpenseItems.error)
      return
    }

    setSubmitting(true)
    const payload = {
      ...buildPayloadFromFormData(formData, formFields),
      expenseItems: normalizedExpenseItems.items,
      totalAmount: normalizedExpenseItems.totalAmount,
      projectId: formData.projectId || null,
    }

    const url = editing ? `/api/management-expenses/${editing.id}` : '/api/management-expenses'
    const method = editing ? 'PUT' : 'POST'
    try {
      const result = await requestAction(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, editing ? '更新失败' : '创建失败')
      if (result.success) {
        message.success(editing ? '更新成功' : '创建成功')
        handleCloseModal(true)
      } else {
        message.error(result.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingIds.includes(id)) return
    setDeletingIds((current) => [...current, id])
    try {
      const result = await requestAction(`/api/management-expenses/${id}`, { method: 'DELETE' }, '删除失败')
      if (result.success) {
        message.success('已删除')
        load()
      } else {
        message.error(result.error)
      }
    } finally {
      setDeletingIds((current) => current.filter((item) => item !== id))
    }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const queryString = buildListQueryString(getCurrentFilters())
      const exportUrl = queryString ? `/api/management-expenses/export?${queryString}` : '/api/management-expenses/export'
      const res = await fetch(exportUrl)
      if (!res.ok) {
        const result = await requestApi(exportUrl, undefined, '导出失败')
        throw new Error(result.success ? '导出失败' : result.error)
      }
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `管理费用报销_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      message.success('导出成功')
    } catch (e: any) {
      message.error(e?.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnsType<Expense> = [
    { title: '报销人', dataIndex: 'submitter', width: 100 },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: v => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{fmt(v)}</span>,
    },
    { title: '日期', dataIndex: 'expenseDate', width: 110, render: fmtDate },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          {permissionsReady && permissions.edit && <Button size="small" icon={<EditOutlined />} onClick={() => handleOpen(r)} disabled={submitting || deletingIds.includes(r.id)}>编辑</Button>}
          {permissionsReady && permissions.delete && (
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="是" cancelText="否">
              <Button size="small" danger icon={<DeleteOutlined />} loading={deletingIds.includes(r.id)} disabled={submitting || deletingIds.includes(r.id)}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>管理费用报销</h2>
        <Space>
          {permissionsReady && permissions.export && <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting} disabled={exporting || submitting}>导出</Button>}
          {permissionsReady && permissions.create && <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()} disabled={submitting}>新增</Button>}
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Space wrap>
          <Input
            placeholder="关键字（报销人/备注）"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </Space>
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>费用合计：{fmt(listTotal)}</span>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 700 }} size="small" />

      <Modal title={editing ? '编辑管理费用报销' : '新增管理费用报销'} open={modalOpen} onOk={() => form.submit()} onCancel={() => handleCloseModal(false)} afterClose={handleModalAfterClose} confirmLoading={submitting} okButtonProps={{ disabled: submitting }} cancelButtonProps={{ disabled: submitting }} width={580} okText="确定" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          {hasProjectField && projectOptionsStatus !== 'ready' && (
            <div style={{ color: projectOptionsStatus === 'error' ? '#ff4d4f' : '#999', padding: '0 0 8px' }}>
              {projectOptionsMessage}
            </div>
          )}
          {formConfigStatus === 'ready' ? (
            <DynamicForm
              fields={formFields}
              form={form}
              disabled={false}
              validationScope="management-expenses"
              onLoadOptions={async (table) => {
                if (table === 'projects') {
                  return modalProjectOptions
                }
                return []
              }}
            />
          ) : (
            <div style={{ color: formConfigStatus === 'error' ? '#ff4d4f' : '#999', padding: '8px 0' }}>{formConfigMessage}</div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              费用明细 <span style={{ color: '#1677ff' }}>合计：{fmt(totalAmount)}</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <Select value={item.type} allowClear onChange={v => setItems(its => its.map((x, i) => i === idx ? { ...x, type: v || '' } : x))} options={EXPENSE_TYPES.map(t => ({ label: t, value: t }))} style={{ width: 130 }} />
                <InputNumber value={item.amount ?? null} onChange={v => setItems(its => its.map((x, i) => i === idx ? { ...x, amount: typeof v === 'number' ? v : null } : x))} placeholder="金额" precision={2} min={0} style={{ flex: 1 }} />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setItems(its => its.filter((_, i) => i !== idx))} />
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setItems(its => [...its, { ...EMPTY_EXPENSE_ITEM }])}>添加明细</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
