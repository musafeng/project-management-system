'use client'

import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, DatePicker, Select, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import DynamicForm from '@/components/DynamicForm'
import type { FormFieldConfig } from '@/components/DynamicForm'
import { watchCurrentAuthUser } from '@/lib/auth-client'
import { requestAction, requestApi } from '@/lib/client-api'
import { formatDateOnly } from '@/lib/date-only'
import { loadFormFields } from '@/lib/form-config-client'
import { buildListFilters, buildListQueryString } from '@/lib/list-filter-query'
import { ensureProjectOption, loadProjectOptions, type ProjectOption } from '@/lib/project-options-client'

type UserRole = 'ADMIN' | 'FINANCE' | 'PURCHASE' | 'PROJECT_MANAGER' | 'STAFF'

type AnyRecord = Record<string, any>

interface OtherReceipt {
  id: string
  projectId?: string
  projectName?: string
  receiptType: string
  receiptAmount: number
  receiptDate: string
  attachmentUrl?: string
  approvalStatus: string
  remark?: string
  createdAt: string
  [key: string]: any
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已拒绝', color: 'red' },
}

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
    receiptDate: 'YYYY-MM-DD',
  }

  for (const [k, fmt] of Object.entries(dateFieldMap)) {
    if (payload[k]?.format) payload[k] = payload[k].format(fmt)
  }

  payload.projectId = payload.projectId || null
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

export default function OtherReceiptsPage() {
  const [data, setData] = useState<OtherReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [reloadAfterClose, setReloadAfterClose] = useState(false)
  const [editing, setEditing] = useState<OtherReceipt | null>(null)
  const [form] = Form.useForm()
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([])
  const [formConfigStatus, setFormConfigStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [formConfigMessage, setFormConfigMessage] = useState('表单配置加载中...')
  const [permissionsReady, setPermissionsReady] = useState(false)
  const [permissions, setPermissions] = useState({ create: false, edit: false, delete: false, export: false })
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [projectOptionsStatus, setProjectOptionsStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [projectOptionsMessage, setProjectOptionsMessage] = useState('项目选项加载中...')
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState<any>(null)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)

  const total = useMemo(() => data.reduce((s, r) => s + Number(r.receiptAmount), 0), [data])
  const hasProjectField = useMemo(() => formFields.some((field) => field.fieldKey === 'projectId'), [formFields])
  const modalProjectOptions = useMemo(
    () => ensureProjectOption(projectOptions, editing?.projectId, editing?.projectName),
    [editing?.projectId, editing?.projectName, projectOptions]
  )
  const getCurrentFilters = (overrides?: { keyword?: string; startDate?: string; endDate?: string; projectId?: string }) =>
    buildListFilters({
      keyword: overrides?.keyword ?? keyword,
      startDate: overrides?.startDate ?? dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: overrides?.endDate ?? dateRange?.[1]?.format('YYYY-MM-DD'),
      projectId: overrides?.projectId ?? projectId,
    })

  const load = async (params?: { keyword?: string; startDate?: string; endDate?: string; projectId?: string }) => {
    setLoading(true)
    try {
      const filters = getCurrentFilters(params)
      const queryString = buildListQueryString(filters)
      const url = queryString ? `/api/other-receipts?${queryString}` : '/api/other-receipts'
      const result = await requestApi<OtherReceipt[]>(url, undefined, '加载其他收款失败')
      if (result.success) {
        setData(result.data)
      } else {
        message.error(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    const result = await loadProjectOptions()
    setProjectOptions(result.options)
    setProjectOptionsStatus(result.status)
    setProjectOptionsMessage(result.message || '项目选项加载中...')
  }

  const applyPermissions = (role?: UserRole) => {
    const allow = canWrite(role)
    setPermissions({ create: allow, edit: allow, delete: allow, export: allow })
  }

  useEffect(() => {
    load()
    loadProjects()
    const stopWatchingAuth = watchCurrentAuthUser((user) => {
      applyPermissions(user?.systemRole as UserRole | undefined)
      setPermissionsReady(true)
      void loadProjects()
    })
    loadFormFields('other-receipts').then((result) => {
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
    setProjectId(undefined)
    load({ keyword: '', startDate: '', endDate: '', projectId: '' })
  }

  const handleOpen = (record?: OtherReceipt) => {
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
    if (reloadAfterClose) {
      setReloadAfterClose(false)
      void load()
    }
  }

  const handleSubmit = async (values: any) => {
    if (submitting) return
    setSubmitting(true)
    const payload = buildPayloadFromFormData(values.formData || {}, formFields)

    const url = editing ? `/api/other-receipts/${editing.id}` : '/api/other-receipts'
    const method = editing ? 'PUT' : 'POST'
    try {
      const result = await requestAction(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, editing ? '更新失败' : '创建失败')
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
      const result = await requestAction(`/api/other-receipts/${id}`, { method: 'DELETE' }, '删除失败')
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
      const exportUrl = queryString ? `/api/other-receipts/export?${queryString}` : '/api/other-receipts/export'
      const res = await fetch(exportUrl)
      if (!res.ok) {
        const result = await requestApi(exportUrl, undefined, '导出失败')
        throw new Error(result.success ? '导出失败' : result.error)
      }
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `其他收款_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      message.success('导出成功')
    } catch (e: any) {
      message.error(e?.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnsType<OtherReceipt> = [
    { title: '项目', dataIndex: 'projectName', width: 150, render: v => v || '-' },
    { title: '收款事由', dataIndex: 'receiptType', width: 150 },
    { title: '金额', dataIndex: 'receiptAmount', width: 120, align: 'right', render: v => <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '日期', dataIndex: 'receiptDate', width: 110, render: fmtDate },
    { title: '审批状态', dataIndex: 'approvalStatus', width: 100, render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    { title: '备注', dataIndex: 'remark', width: 150, render: v => v || '-' },
    {
      title: '操作', key: 'action', width: 120, fixed: 'right',
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
        <h2 style={{ margin: 0 }}>其他收款</h2>
        <Space>
          {permissionsReady && permissions.export && <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting} disabled={exporting || submitting}>导出</Button>}
          {permissionsReady && permissions.create && <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()} disabled={submitting}>新增</Button>}
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Space wrap>
          <Input
            placeholder="关键字（收款类型/备注）"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
          <Select
            placeholder="选择项目"
            value={projectId}
            onChange={setProjectId}
            options={projectOptions}
            style={{ width: 200 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </Space>
        <span style={{ color: '#52c41a', fontWeight: 600 }}>金额合计：{fmt(total)}</span>
      </div>
      {projectOptionsStatus !== 'ready' && (
        <div style={{ color: projectOptionsStatus === 'error' ? '#ff4d4f' : '#999', marginBottom: 12 }}>
          {projectOptionsMessage}
        </div>
      )}

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 900 }} size="small" />
      <Modal title={editing ? '编辑其他收款' : '新增其他收款'} open={modalOpen} onOk={() => form.submit()} onCancel={() => handleCloseModal(false)} afterClose={handleModalAfterClose} confirmLoading={submitting} okButtonProps={{ disabled: submitting }} cancelButtonProps={{ disabled: submitting }} width={560} okText="确定" cancelText="取消">
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
              validationScope="other-receipts"
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
        </Form>
      </Modal>
    </div>
  )
}
