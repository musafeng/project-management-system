'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Descriptions, Divider, Spin, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FileTextOutlined } from '@ant-design/icons'
import { parseAttachmentUrls } from '@/lib/attachments'
import { requestApi } from '@/lib/client-request'
import { fmtDate, fmtMoney } from '@/lib/utils/format'
import AttachmentPreviewLinks from './AttachmentPreviewLinks'
import ResponsiveModalDrawer from './ResponsiveModalDrawer'

const { Text } = Typography

type DetailRecord = Record<string, any>

interface FormFieldDefinition {
  id: string
  fieldKey: string
  label: string
  componentType: string
  sortOrder: number
  optionsJson?: string | null
  tableColumnsJson?: string | null
}

interface BusinessRecordDetailModalProps {
  open: boolean
  resource: string | null
  id: string | null
  onClose: () => void
}

const formFieldsCache = new Map<string, Promise<FormFieldDefinition[]>>()

const RESOURCE_LABELS: Record<string, string> = {
  projects: '项目新增',
  'project-contracts': '项目合同',
  'construction-approvals': '施工立项',
  'project-contract-changes': '项目合同变更',
  'contract-receipts': '项目合同收款',
  'procurement-contracts': '采购合同',
  'procurement-payments': '采购付款',
  'labor-contracts': '劳务合同',
  'labor-payments': '劳务付款',
  'subcontract-contracts': '分包合同',
  'subcontract-payments': '分包付款',
  'other-receipts': '其他收款',
  'other-payments': '其他付款',
  'project-expenses': '项目费用报销',
  'management-expenses': '管理费用报销',
  'sales-expenses': '销售费用报销',
  'petty-cashes': '备用金申请',
}

const FIELD_LABELS: Record<string, string> = {
  code: '编号',
  name: '名称',
  projectName: '项目',
  projectCode: '项目编号',
  contractCode: '合同编号',
  contractName: '合同名称',
  constructionName: '施工立项',
  customerName: '客户',
  supplierName: '供应商',
  laborWorkerName: '劳务班组',
  subcontractWorkerName: '分包人员',
  workerName: '人员',
  submitter: '报销人',
  submitterName: '提交人',
  holder: '申请人',
  receiptType: '收款事由',
  paymentType: '付款事由',
  applyReason: '申请事由',
  contractType: '合同类型',
  paymentMethod: '付款方式',
  receiptMethod: '收款方式',
  paymentNumber: '付款编号',
  receiptNumber: '收款编号',
  contact: '联系人',
  accountName: '户名',
  bankAccount: '银行卡号',
  bankName: '开户银行',
  hasRetention: '是否有质保金',
  retentionRate: '质保金比例',
  contractAmount: '合同金额',
  changedAmount: '变更金额',
  receivableAmount: '应收金额',
  receivedAmount: '已收金额',
  unreceivedAmount: '未收金额',
  payableAmount: '应付金额',
  paidAmount: '已付金额',
  unpaidAmount: '未付金额',
  receiptAmount: '收款金额',
  actualReceivedAmount: '实际到账',
  paymentAmount: '付款金额',
  totalAmount: '总金额',
  expenseAmount: '费用金额',
  budgetAmount: '预算金额',
  budget: '预算金额',
  issuedAmount: '发放金额',
  returnedAmount: '归还金额',
  retentionAmount: '质保金金额',
  signDate: '签订日期',
  startDate: '开始日期',
  endDate: '结束日期',
  receiptDate: '收款日期',
  paymentDate: '付款日期',
  expenseDate: '报销日期',
  issueDate: '发放日期',
  returnDate: '归还日期',
  status: '业务状态',
  approvalStatus: '审批状态',
  submittedAt: '提交时间',
  approvedAt: '审批通过时间',
  rejectedAt: '驳回时间',
  rejectedReason: '驳回原因',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  remark: '备注',
}

const FIELD_ORDER = [
  'code',
  'name',
  'projectName',
  'projectCode',
  'contractCode',
  'contractName',
  'constructionName',
  'customerName',
  'supplierName',
  'laborWorkerName',
  'subcontractWorkerName',
  'workerName',
  'submitter',
  'submitterName',
  'holder',
  'receiptType',
  'paymentType',
  'applyReason',
  'contractType',
  'paymentMethod',
  'receiptMethod',
  'paymentNumber',
  'receiptNumber',
  'contact',
  'accountName',
  'bankAccount',
  'bankName',
  'hasRetention',
  'retentionRate',
  'contractAmount',
  'changedAmount',
  'receivableAmount',
  'receivedAmount',
  'unreceivedAmount',
  'payableAmount',
  'paidAmount',
  'unpaidAmount',
  'receiptAmount',
  'actualReceivedAmount',
  'paymentAmount',
  'totalAmount',
  'expenseAmount',
  'budgetAmount',
  'budget',
  'issuedAmount',
  'returnedAmount',
  'retentionAmount',
  'signDate',
  'startDate',
  'endDate',
  'receiptDate',
  'paymentDate',
  'expenseDate',
  'issueDate',
  'returnDate',
  'status',
  'approvalStatus',
  'submittedAt',
  'approvedAt',
  'rejectedAt',
  'rejectedReason',
  'createdAt',
  'updatedAt',
  'remark',
]

const SKIP_FIELDS = new Set([
  'id',
  'projectId',
  'contractId',
  'constructionId',
  'customerId',
  'supplierId',
  'workerId',
  'laborWorkerId',
  'regionId',
  'attachmentUrl',
  'formDataJson',
  'expenseItems',
  'deductionItems',
  'Project',
  'ProjectContract',
  'ConstructionApproval',
  'Region',
  'createdBy',
  'updatedBy',
])

const APPROVAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '待提交', color: 'default' },
  PENDING: { label: '审批中', color: 'processing' },
  APPROVED: { label: '已通过', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
  CANCELLED: { label: '已撤销', color: 'default' },
}

function getLabel(key: string) {
  return FIELD_LABELS[key] || key
}

function parseJsonValue(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (!['{', '['].includes(trimmed[0])) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function parseFormData(record: DetailRecord | null) {
  if (!record?.formDataJson) return null
  const parsed = parseJsonValue(record.formDataJson)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, any>
    : null
}

function isDateField(key: string) {
  return /Date$|At$/.test(key)
}

function isValidDateValue(value: unknown) {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value !== 'string' && typeof value !== 'number') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function isMoneyField(key: string) {
  return /(Amount|budget|paid|payable|receipt|payment|expense|issued|returned|receivable|unreceived|unpaid|changed)$/i.test(key) &&
    !/Rate$/i.test(key)
}

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === ''
}

function renderStatus(key: string, value: string) {
  if (key === 'approvalStatus') {
    const item = APPROVAL_STATUS_LABELS[value] || { label: value, color: 'default' }
    return <Tag color={item.color}>{item.label}</Tag>
  }
  return <Tag>{value}</Tag>
}

function renderValue(key: string, value: unknown) {
  if (isEmpty(value)) return <Text type="secondary">-</Text>
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'string' && key.toLowerCase().includes('status')) return renderStatus(key, value)
  if (isDateField(key)) return isValidDateValue(value) ? fmtDate(String(value)) : <Text type="secondary">-</Text>
  if (isMoneyField(key)) return fmtMoney(Number(value))
  if (key === 'retentionRate') return `${Number(value)}%`
  if (Array.isArray(value)) return `${value.length} 条`
  if (typeof value === 'object') {
    try {
      return <Text code>{JSON.stringify(value)}</Text>
    } catch {
      return <Text type="secondary">[复杂对象]</Text>
    }
  }
  return String(value)
}

function buildDisplayEntries(record: DetailRecord | null) {
  if (!record) return []
  const keys = Object.keys(record).filter((key) => !SKIP_FIELDS.has(key))
  const orderedKeys = [
    ...FIELD_ORDER.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !FIELD_ORDER.includes(key)),
  ]

  return orderedKeys
    .map((key) => ({ key, label: getLabel(key), value: record[key] }))
    .filter((item) => !isEmpty(item.value))
}

function collectAttachmentUrls(record: DetailRecord | null, formData: Record<string, any> | null) {
  const urls: string[] = []
  const add = (value: unknown) => {
    for (const url of parseAttachmentUrls(typeof value === 'string' ? value : null)) {
      urls.push(url)
    }
  }

  add(record?.attachmentUrl)
  for (const value of Object.values(formData || {})) add(value)

  for (const item of [...normalizeItems(record?.expenseItems), ...normalizeItems(record?.deductionItems)]) {
    add(item.attachmentUrl)
  }

  return Array.from(new Set(urls))
}

function normalizeItems(value: unknown): Array<Record<string, any>> {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : []
}

function getItemColumns(items: Array<Record<string, any>>): ColumnsType<Record<string, any>> {
  const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item))))
  return keys.map((key) => ({
    title: getLabel(key),
    dataIndex: key,
    key,
    render: (value) => key === 'attachmentUrl'
      ? <AttachmentLinks urls={parseAttachmentUrls(value)} />
      : renderValue(key, value),
  }))
}

function AttachmentLinks({ urls }: { urls: string[] }) {
  return <AttachmentPreviewLinks urls={urls} />
}

async function loadFormFields(resource: string): Promise<FormFieldDefinition[]> {
  if (!formFieldsCache.has(resource)) {
    formFieldsCache.set(
      resource,
      requestApi<any>(`/api/form-definitions?code=${resource}`, {
        credentials: 'include',
        fallbackError: '加载表单配置失败',
      }).then((result) => {
        if (result.success && result.data?.FormField) return result.data.FormField
        if (!result.success) console.warn('加载表单配置失败:', result.error)
        return []
      })
    )
  }

  return formFieldsCache.get(resource)!
}

function getModalTitle(resource: string | null, record: DetailRecord | null) {
  const label = resource ? RESOURCE_LABELS[resource] || resource : '单据'
  const title = record?.code || record?.name || record?.paymentNumber || record?.receiptNumber || record?.id
  return title ? `${label}详情：${title}` : `${label}详情`
}

export default function BusinessRecordDetailModal({
  open,
  resource,
  id,
  onClose,
}: BusinessRecordDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<DetailRecord | null>(null)
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !resource || !id) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setRecord(null)
      setFormFields([])
      setLoadError(null)
      const [detailResult, nextFormFields] = await Promise.all([
        requestApi<DetailRecord>(`/api/${resource}/${id}`, {
          credentials: 'include',
          fallbackError: '加载单据详情失败，请稍后重试',
        }),
        loadFormFields(resource),
      ])

      if (cancelled) return
      if (detailResult.success && detailResult.data) {
        setRecord(detailResult.data)
      } else {
        const nextError = detailResult.error || '加载单据详情失败，请稍后重试'
        setLoadError(nextError)
        message.error(nextError)
      }

      setFormFields(nextFormFields)
      setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [open, resource, id])

  const formData = useMemo(() => parseFormData(record), [record])
  const entries = useMemo(() => buildDisplayEntries(record), [record])
  const attachments = useMemo(() => collectAttachmentUrls(record, formData), [record, formData])
  const expenseItems = useMemo(() => normalizeItems(record?.expenseItems), [record])
  const deductionItems = useMemo(() => normalizeItems(record?.deductionItems), [record])

  return (
    <ResponsiveModalDrawer
      title={getModalTitle(resource, record)}
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {!loading && !record ? (
          <Alert type="warning" showIcon message={loadError || '未加载到单据详情'} />
        ) : (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
              {entries.map((item) => (
                <Descriptions.Item key={item.key} label={item.label}>
                  {renderValue(item.key, item.value)}
                </Descriptions.Item>
              ))}
            </Descriptions>

            <Divider orientation="left">附件</Divider>
            <AttachmentLinks urls={attachments} />

            {formData && formFields.length > 0 ? (
              <>
                <Divider orientation="left">扩展信息</Divider>
                <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
                  {formFields
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((field) => (
                      <Descriptions.Item key={field.id} label={field.label}>
                        {field.componentType === 'file'
                          ? <AttachmentLinks urls={parseAttachmentUrls(formData[field.fieldKey])} />
                          : renderValue(field.fieldKey, formData[field.fieldKey])}
                      </Descriptions.Item>
                    ))}
                </Descriptions>
              </>
            ) : null}

            {expenseItems.length > 0 ? (
              <>
                <Divider orientation="left">费用明细</Divider>
                <Table
                  rowKey={(_, index) => String(index)}
                  size="small"
                  pagination={false}
                  dataSource={expenseItems}
                  columns={getItemColumns(expenseItems)}
                  scroll={{ x: true }}
                />
              </>
            ) : null}

            {deductionItems.length > 0 ? (
              <>
                <Divider orientation="left">扣款明细</Divider>
                <Table
                  rowKey={(_, index) => String(index)}
                  size="small"
                  pagination={false}
                  dataSource={deductionItems}
                  columns={getItemColumns(deductionItems)}
                  scroll={{ x: true }}
                />
              </>
            ) : null}

            {!record && !loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                <FileTextOutlined style={{ fontSize: 28 }} />
                <div style={{ marginTop: 8 }}>暂无详情</div>
              </div>
            ) : null}
          </>
        )}
      </Spin>
    </ResponsiveModalDrawer>
  )
}
