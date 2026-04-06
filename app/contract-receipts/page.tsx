'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Table,
  Button,
  Select,
  Space,
  Modal,
  Form,
  message,
  ConfigProvider,
  Popconfirm,
  DatePicker,
  InputNumber,
  Input,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import AttachmentField from '@/components/AttachmentField'
import AttachmentLink from '@/components/AttachmentLink'
import DetailModal from '@/components/DetailModal'
import LedgerDetailExtra, { type LedgerApprovalTrailRecord, type LedgerFlowRecord } from '@/components/LedgerDetailExtra'
import { ApprovalStatusTag, ApprovalActions } from '@/components/ApprovalActions'
import { APPROVAL_STATUS_OPTIONS, getApprovalBatchActionHint, isApprovalReadonly } from '@/lib/approval-ui'
import { downloadExportFile } from '@/lib/export-client'
import { positiveAmountRules, requiredDateRule } from '@/lib/form-rules'
import {
  getApprovalActionBoundaryHint,
  getApprovalStatusHint,
  getBusinessStatusLabel,
  getDeleteConfirmDescription,
  getDeleteConfirmTitle,
  getDeleteSuccessMessage,
  getDisplayText,
  getExecutionStatusHint,
  getLedgerEmptyText,
  getProgressText,
  getSaveSuccessMessage,
  joinDetailHints,
  READONLY_ACTION_HINT,
} from '@/lib/ledger-ui'
import { appendPaginationParams, getPageAfterDelete, normalizePaginatedList } from '@/lib/list-pagination'
import { buildApprovalDetailPath, buildApprovalFilterSummary, buildApprovalPositionSummary, readApprovalRouteContext, type ApprovalRouteContext } from '@/lib/approval-context'
import { buildLedgerFilterSummary, buildLedgerRouteHref, readLedgerRouteContext } from '@/lib/ledger-context'
import { fmtDate, fmtMoney } from '@/lib/utils/format'

/**
 * 合同收款数据类型
 */
interface ContractReceipt {
  id: string
  contractId: string
  contractCode: string
  contractName?: string
  projectName: string
  customerName?: string
  amount: number
  receiptDate: string
  receiptMethod?: string | null
  receiptNumber?: string | null
  status?: string
  approvalStatus?: string
  attachmentUrl?: string | null
  remark: string | null
  createdAt: string
}

interface ContractReceiptDetail extends ContractReceipt {
  projectId?: string
  contractStatus?: string
  receivableAmount?: number
  receivedAmount?: number
  unreceivedAmount?: number
  receiptMethod?: string | null
  receiptNumber?: string | null
  status?: string
  updatedAt?: string
  relatedFlows?: LedgerFlowRecord[]
  approvalTrail?: LedgerApprovalTrailRecord[]
}

/**
 * 项目合同数据类型
 */
interface ProjectContract {
  id: string
  code: string
  name: string
  projectId: string
  projectName: string
  customerName: string
  contractAmount: number
  changedAmount: number
  receivableAmount: number
  receivedAmount: number
  unreceivedAmount: number
  signDate: string | null
  status: string
  createdAt: string
}

/**
 * API 响应类型
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const DEFAULT_PAGE_SIZE = 20
const EMPTY_SUMMARY = {
  receiptAmountTotal: 0,
  relatedReceivableAmountTotal: 0,
  relatedReceivedAmountTotal: 0,
  relatedUnreceivedAmountTotal: 0,
  receiptProgress: 0,
  relatedContractCount: 0,
  resultCount: 0,
}

export default function ContractReceiptsPage() {
  const [receipts, setReceipts] = useState<ContractReceipt[]>([])
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [contractId, setContractId] = useState<string | undefined>(undefined)
  const [approvalStatus, setApprovalStatus] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<any>(null)
  const [modalProjectId, setModalProjectId] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<ContractReceiptDetail | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [returnPath, setReturnPath] = useState<string | undefined>(undefined)
  const [approvalReturnPath, setApprovalReturnPath] = useState<string | undefined>(undefined)
  const [approvalPrevPath, setApprovalPrevPath] = useState<string | undefined>(undefined)
  const [approvalNextPath, setApprovalNextPath] = useState<string | undefined>(undefined)
  const [approvalContextHint, setApprovalContextHint] = useState<string | undefined>(undefined)
  const detailCacheRef = useRef<Record<string, ContractReceiptDetail>>({})
  const pageCacheRef = useRef<Record<number, ContractReceipt[]>>({})
  const approvalContextRef = useRef<ApprovalRouteContext>({})
  const [form] = Form.useForm()
  const formContractId = Form.useWatch('contractId', form)
  const selectedContract = contracts.find((contract) => contract.id === formContractId)
  const modalContracts = contracts.filter((contract) => !modalProjectId || contract.projectId === modalProjectId)
  const formatProgress = (value?: number) => `${Number(value || 0).toFixed(1)}%`

  const clearPrefetchCache = () => {
    detailCacheRef.current = {}
    pageCacheRef.current = {}
  }

  const buildListParams = (
    searchContractId?: string,
    searchProjectId?: string,
    searchKeyword?: string,
    searchApprovalStatus?: string,
    searchDateRange?: [any, any] | null,
    nextPage = page,
    nextPageSize = pageSize,
  ) => {
    const params = new URLSearchParams()
    if (searchContractId) params.append('contractId', searchContractId)
    if (searchProjectId) params.append('projectId', searchProjectId)
    if (searchKeyword?.trim()) params.append('keyword', searchKeyword.trim())
    if (searchApprovalStatus) params.append('approvalStatus', searchApprovalStatus)
    if (searchDateRange?.[0]) params.append('startDate', searchDateRange[0].format('YYYY-MM-DD'))
    if (searchDateRange?.[1]) params.append('endDate', searchDateRange[1].format('YYYY-MM-DD'))
    appendPaginationParams(params, nextPage, nextPageSize)
    return params
  }

  const fetchReceiptDetail = async (id: string) => {
    const cached = detailCacheRef.current[id]
    if (cached) return cached
    const response = await fetch(`/api/contract-receipts/${id}`)
    const result: ApiResponse<ContractReceiptDetail> = await response.json()
    if (!result.success || !result.data) {
      throw new Error(result.error || '获取收款信息失败')
    }
    detailCacheRef.current[id] = result.data
    return result.data
  }

  const loadApprovalWorkflowContext = async (resourceId: string) => {
    const context = approvalContextRef.current
    if (!context.approvalTab) {
      setApprovalContextHint(undefined)
      setApprovalPrevPath(undefined)
      setApprovalNextPath(undefined)
      return
    }
    try {
      const params = new URLSearchParams({ tab: context.approvalTab })
      if (context.approvalResourceType) params.set('resourceType', context.approvalResourceType)
      if (context.approvalKeyword) params.set('keyword', context.approvalKeyword)
      if (context.approvalTaskId) params.set('focusTaskId', context.approvalTaskId)
      if (resourceId) params.set('focusResourceId', resourceId)
      const response = await fetch(`/api/approval?${params.toString()}`, { credentials: 'include' })
      const result = await response.json()
      if (!result.success) return
      const navigation = result.data?.navigation
      setApprovalPrevPath(navigation?.prev ? buildApprovalDetailPath(navigation.prev, {
        ...context,
        approvalPage: navigation.prev.page || context.approvalPage,
      }) || undefined : undefined)
      setApprovalNextPath(navigation?.next ? buildApprovalDetailPath(navigation.next, {
        ...context,
        approvalPage: navigation.next.page || context.approvalPage,
      }) || undefined : undefined)
      setApprovalContextHint(buildApprovalPositionSummary(context, navigation))
    } catch {}
  }

  const handleApprovalActionSuccess = async (recordId: string) => {
    const hasNext = Boolean(approvalNextPath)
    await refreshReceiptContext(recordId)
    if (approvalContextRef.current.approvalTab) {
      const summary = buildApprovalFilterSummary(approvalContextRef.current)
      setApprovalContextHint(`${summary} · ${getApprovalBatchActionHint(hasNext)}`)
    }
  }

  /**
   * 加载合同列表
   */
  const loadContracts = async () => {
    try {
      setContractsLoading(true)
      const response = await fetch('/api/project-contracts')
      const result: ApiResponse<ProjectContract[]> = await response.json()

      if (result.success && result.data) {
        setContracts(result.data)
      } else {
        console.error('加载合同列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载合同列表失败:', err)
    } finally {
      setContractsLoading(false)
    }
  }

  /**
   * 加载收款记录列表
   */
  const loadReceipts = async (
    searchContractId?: string,
    searchProjectId?: string,
    searchKeyword?: string,
    searchApprovalStatus?: string,
    searchDateRange?: [any, any] | null,
    nextPage = page,
    nextPageSize = pageSize,
  ) => {
    try {
      setLoading(true)
      const params = buildListParams(searchContractId, searchProjectId, searchKeyword, searchApprovalStatus, searchDateRange, nextPage, nextPageSize)

      const url = `/api/contract-receipts${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<any> = await response.json()

      if (result.success && result.data) {
        const normalized = normalizePaginatedList<ContractReceipt>(result.data, nextPage, nextPageSize)
        pageCacheRef.current[nextPage] = normalized.items
        setReceipts(normalized.items)
        setPage(normalized.page)
        setPageSize(normalized.pageSize)
        setTotal(normalized.total)
        setSummary(result.data?.summary || { ...EMPTY_SUMMARY, resultCount: normalized.total })
        return normalized.items
      } else {
        message.error(result.error || '数据加载失败')
        setReceipts([])
        setTotal(0)
        setSummary(EMPTY_SUMMARY)
        return []
      }
    } catch (err) {
      console.error('加载收款记录列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setReceipts([])
      setSummary(EMPTY_SUMMARY)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初次加载数据
   */
  useEffect(() => {
    const context = readLedgerRouteContext()
    const approvalContext = readApprovalRouteContext()
    approvalContextRef.current = approvalContext
    const initialDateRange = context.startDate && context.endDate ? [dayjs(context.startDate), dayjs(context.endDate)] as any : null
    setKeyword(context.keyword || '')
    setProjectId(context.projectId)
    setContractId(context.contractId)
    setApprovalStatus(context.approvalStatus)
    setDateRange(initialDateRange)
    if (context.returnPath?.includes('/approval')) {
      setApprovalReturnPath(context.returnPath)
      setReturnPath(undefined)
    } else {
      setReturnPath(context.returnPath)
      setApprovalReturnPath(undefined)
    }
    clearPrefetchCache()
    loadContracts()
    loadReceipts(context.contractId, context.projectId, context.keyword || '', context.approvalStatus, initialDateRange, 1, pageSize)
      .then(async () => {
        if (context.detailId) {
          await loadReceiptDetail(context.detailId, true)
          await loadApprovalWorkflowContext(context.detailId)
        }
      })
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    clearPrefetchCache()
    loadReceipts(contractId, projectId, keyword, approvalStatus, dateRange, 1, pageSize)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    clearPrefetchCache()
    setKeyword('')
    setProjectId(undefined)
    setContractId(undefined)
    setApprovalStatus(undefined)
    setDateRange(null)
    loadReceipts(undefined, undefined, '', undefined, null, 1, pageSize)
  }

  /**
   * 打开新增弹窗
   */
  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ receiptDate: dayjs() })
    setModalProjectId(undefined)
    setIsModalVisible(true)
  }

  const handleEditClick = async (id: string) => {
    try {
      const response = await fetch(`/api/contract-receipts/${id}`)
      const result: ApiResponse<ContractReceiptDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        const currentContract = contracts.find((contract) => contract.id === result.data?.contractId)
        setModalProjectId(currentContract?.projectId)
        form.setFieldsValue({
          contractId: result.data.contractId,
          amount: result.data.amount,
          receiptDate: result.data.receiptDate ? dayjs(result.data.receiptDate) : undefined,
          receiptMethod: result.data.receiptMethod || undefined,
          receiptNumber: result.data.receiptNumber || undefined,
          attachmentUrl: result.data.attachmentUrl || undefined,
          remark: result.data.remark || undefined,
        })
        setIsModalVisible(true)
      } else {
        message.error(result.error || '获取收款信息失败')
      }
    } catch (err) {
      console.error('获取收款信息失败:', err)
      message.error('获取收款信息失败')
    }
  }

  const loadReceiptDetail = async (id: string, openModal = false) => {
    if (openModal) setDetailOpen(true)
    try {
      const cached = detailCacheRef.current[id]
      if (cached) {
        setDetailData(cached)
        setDetailLoading(false)
      } else {
        setDetailLoading(true)
      }
      const detail = await fetchReceiptDetail(id)
      setDetailData(detail)
      await loadApprovalWorkflowContext(id)
    } catch (err) {
      console.error('获取收款信息失败:', err)
      message.error('获取收款信息失败')
      if (openModal) setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewClick = async (id: string) => {
    await loadReceiptDetail(id, true)
  }

  const refreshReceiptContext = async (recordId?: string, targetPage = page) => {
    await loadReceipts(contractId, projectId, keyword, approvalStatus, dateRange, targetPage, pageSize)
    if (recordId && detailOpen && detailData?.id === recordId) {
      await loadReceiptDetail(recordId)
    }
  }

  const detailIndex = detailData ? receipts.findIndex((item) => item.id === detailData.id) : -1
  const globalPosition = detailIndex >= 0 ? (page - 1) * pageSize + detailIndex + 1 : 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrevDetail = globalPosition > 1
  const canNextDetail = globalPosition > 0 && globalPosition < total
  const contextSummary = buildLedgerFilterSummary({
    projectName: contracts.find((item) => item.projectId === projectId)?.projectName,
    contractName: contracts.find((item) => item.id === contractId)?.name,
    keyword,
    statusLabel: APPROVAL_STATUS_OPTIONS.find((item) => item.value === approvalStatus)?.label,
    startDate: dateRange?.[0]?.format?.('YYYY-MM-DD'),
    endDate: dateRange?.[1]?.format?.('YYYY-MM-DD'),
  })
  const detailToolbarText = approvalContextHint || (globalPosition > 0 ? `${contextSummary} · 第 ${globalPosition} 条 / 共 ${total} 条 · 当前切换与导出均基于这组筛选结果` : '当前记录不在本次筛选结果中')

  const prefetchReceiptPage = async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || pageCacheRef.current[targetPage]) return
    try {
      const params = buildListParams(contractId, projectId, keyword, approvalStatus, dateRange, targetPage, pageSize)
      const response = await fetch(`/api/contract-receipts?${params.toString()}`)
      const result: ApiResponse<any> = await response.json()
      if (result.success && result.data) {
        const normalized = normalizePaginatedList<ContractReceipt>(result.data, targetPage, pageSize)
        pageCacheRef.current[targetPage] = normalized.items
      }
    } catch {}
  }

  const prefetchReceiptDetail = async (id?: string | null) => {
    if (!id || detailCacheRef.current[id]) return
    try {
      const detail = await fetchReceiptDetail(id)
      detailCacheRef.current[id] = detail
    } catch {}
  }

  useEffect(() => {
    if (!detailOpen || !detailData) return
    const currentIndex = receipts.findIndex((item) => item.id === detailData.id)
    if (currentIndex > 0) void prefetchReceiptDetail(receipts[currentIndex - 1]?.id)
    if (currentIndex >= 0 && currentIndex < receipts.length - 1) void prefetchReceiptDetail(receipts[currentIndex + 1]?.id)
    if (canPrevDetail && currentIndex <= 0) {
      void prefetchReceiptPage(page - 1).then(() => {
        const items = pageCacheRef.current[page - 1]
        if (items?.length) void prefetchReceiptDetail(items[items.length - 1]?.id)
      })
    }
    if (canNextDetail && currentIndex === receipts.length - 1) {
      void prefetchReceiptPage(page + 1).then(() => {
        const items = pageCacheRef.current[page + 1]
        if (items?.length) void prefetchReceiptDetail(items[0]?.id)
      })
    }
  }, [detailOpen, detailData?.id, page, pageSize, total, receipts])

  const handleDetailNavigate = async (direction: 'prev' | 'next') => {
    if (!detailData) return
    const currentIndex = receipts.findIndex((item) => item.id === detailData.id)
    if (currentIndex < 0) return
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (receipts[targetIndex]) {
      await loadReceiptDetail(receipts[targetIndex].id, false)
      return
    }
    const targetPage = direction === 'next' ? page + 1 : page - 1
    if (targetPage < 1 || targetPage > totalPages) return
    const targetItems = pageCacheRef.current[targetPage] || await loadReceipts(contractId, projectId, keyword, approvalStatus, dateRange, targetPage, pageSize)
    const targetId = direction === 'next' ? targetItems[0]?.id : targetItems[targetItems.length - 1]?.id
    if (targetId) {
      await loadReceiptDetail(targetId, false)
    }
  }

  /**
   * 删除收款记录
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/contract-receipts/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(getDeleteSuccessMessage('收款记录'))
        await refreshReceiptContext(id, getPageAfterDelete(page, receipts.length))
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除收款记录失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        contractId: values.contractId,
        amount: values.amount,
        receiptDate: values.receiptDate ? values.receiptDate.format('YYYY-MM-DD') : null,
        receiptMethod: values.receiptMethod || null,
        receiptNumber: values.receiptNumber || null,
        attachmentUrl: values.attachmentUrl || null,
        remark: values.remark || null,
      }

      const response = await fetch(editingId ? `/api/contract-receipts/${editingId}` : '/api/contract-receipts', {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(editingId ? getSaveSuccessMessage('收款记录', true) : '收款记录已创建并提交审批')
        setIsModalVisible(false)
        setEditingId(null)
        form.resetFields()
        setModalProjectId(undefined)
        await refreshReceiptContext(editingId || result.data?.id)
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (err) {
      console.error('提交表单失败:', err)
      message.error('操作失败，请检查网络连接')
    }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (contractId) params.set('contractId', contractId)
      if (projectId) params.set('projectId', projectId)
      if (keyword.trim()) params.set('keyword', keyword.trim())
      if (approvalStatus) params.set('approvalStatus', approvalStatus)
      if (dateRange?.[0]) params.set('startDate', dateRange[0].format('YYYY-MM-DD'))
      if (dateRange?.[1]) params.set('endDate', dateRange[1].format('YYYY-MM-DD'))
      const exportUrl = params.toString() ? `/api/contract-receipts/export?${params.toString()}` : '/api/contract-receipts/export'
      await downloadExportFile(exportUrl, `合同收款台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`, '导出失败')
      message.success('导出成功')
    } catch (error: any) {
      message.error(error?.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  /**
   * 表格列定义
   */
  const columns: ColumnsType<ContractReceipt> = [
    {
      title: '合同编号',
      dataIndex: 'contractCode',
      key: 'contractCode',
      width: 130,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '合同名称',
      dataIndex: 'contractName',
      key: 'contractName',
      width: 180,
      ellipsis: true,
      render: (text?: string) => getDisplayText(text),
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 140,
      render: (text?: string) => getDisplayText(text),
    },
    {
      title: '收款金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmtMoney(value)}</span>,
    },
    {
      title: '收款日期',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 120,
      render: fmtDate,
    },
    {
      title: '收款方式',
      dataIndex: 'receiptMethod',
      key: 'receiptMethod',
      width: 120,
      render: (text?: string | null) => getDisplayText(text),
    },
    {
      title: '收款编号',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      width: 150,
      render: (text?: string | null) => getDisplayText(text),
    },
    {
      title: '收款状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value?: string) => getBusinessStatusLabel(value),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      render: (text: string | null) => getDisplayText(text),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: fmtDate,
    },
    {
      title: '附件',
      dataIndex: 'attachmentUrl',
      key: 'attachmentUrl',
      width: 100,
      render: (value: string | null | undefined) => <AttachmentLink url={value} />,
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (value?: string) => value ? <ApprovalStatusTag status={value} /> : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right',
      render: (_, record) => {
        const readonly = isApprovalReadonly(record.approvalStatus)
        return (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewClick(record.id)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} disabled={readonly} title={readonly ? READONLY_ACTION_HINT : ''} onClick={() => handleEditClick(record.id)}>
            编辑
          </Button>
          <Popconfirm
            title={getDeleteConfirmTitle('收款记录')}
            description={getDeleteConfirmDescription('收款记录')}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={readonly}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={readonly} title={readonly ? READONLY_ACTION_HINT : ''}>
              删除
            </Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus || 'PENDING'}
            resource="contract-receipts"
            enableCancel
            onSuccess={({ action }) => refreshReceiptContext(action ? record.id : undefined)}
          />
        </Space>
      )},
    },
  ]

  const projectOptions = Array.from(
    new Map(
      contracts.map((contract) => [
        contract.projectId,
        { label: contract.projectName, value: contract.projectId },
      ])
    ).values()
  )

  const filteredContracts = contracts.filter((contract) => !projectId || contract.projectId === projectId)

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontSize: 14,
        },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            margin: '0 auto',
            background: '#fff',
            borderRadius: 8,
            padding: '20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          {/* 标题 */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: '#1d1d1f',
              }}
            >
              合同收款管理
            </h1>
          </div>

          {/* 查询区 */}
          <div
            style={{
              marginBottom: 20,
              padding: '12px',
              background: '#fafafa',
              borderRadius: 6,
              border: '1px solid #f0f0f0',
            }}
          >
            <Space wrap style={{ width: '100%' }}>
              <Input
                placeholder="搜索合同名称 / 编号 / 项目 / 客户 / 收款编号"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 280 }}
                onPressEnter={handleSearch}
              />

              <Select
                placeholder="选择项目"
                value={projectId || undefined}
                onChange={(value) => {
                  setProjectId(value)
                  setContractId(undefined)
                }}
                allowClear
                style={{ width: 180 }}
                options={projectOptions}
              />

              <Select
                placeholder="审批状态"
                value={approvalStatus || undefined}
                onChange={setApprovalStatus}
                allowClear
                style={{ width: 140 }}
                options={APPROVAL_STATUS_OPTIONS}
              />

              <DatePicker.RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: 260 }}
                placeholder={['收款开始', '收款结束']}
              />

              <Select
                placeholder="选择合同"
                value={contractId || undefined}
                onChange={setContractId}
                allowClear
                style={{ width: 250 }}
                loading={contractsLoading}
                options={filteredContracts.map((contract) => ({
                  label: `${contract.code} - ${contract.name}`,
                  value: contract.id,
                }))}
              />

              <Button
                type="primary"
                onClick={handleSearch}
                loading={loading}
              >
                查询
              </Button>

              <Button onClick={handleReset} loading={loading}>
                重置
              </Button>

              <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
                导出
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddClick}
                style={{ marginLeft: 'auto' }}
              >
                新增收款
              </Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table<ContractReceipt>
            rowKey="id"
            columns={columns}
            dataSource={receipts}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showTotal: (count) => `共 ${count} 条`,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showQuickJumper: total > pageSize,
              onChange: (nextPage, nextPageSize) => loadReceipts(contractId, projectId, keyword, approvalStatus, dateRange, nextPage, nextPageSize),
            }}
            scroll={{ x: 1460 }}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={columns.length}>
                  <span style={{ fontWeight: 600 }}>
                    当前筛选合计：收款金额 {fmtMoney(summary.receiptAmountTotal)}；关联合同已收金额 {fmtMoney(summary.relatedReceivedAmountTotal)}，关联合同未收金额 {fmtMoney(summary.relatedUnreceivedAmountTotal)}，整体回款进度 {formatProgress(summary.receiptProgress)}；筛选结果共 {total} 条
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            locale={{
              emptyText: getLedgerEmptyText('收款记录', '新增收款'),
            }}
          />
        </div>
      </div>

      {/* 新增/编辑收款弹窗 */}
      <Modal
        title={editingId ? '编辑收款' : '新增收款'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingId(null)
          form.resetFields()
          setModalProjectId(undefined)
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item label="所属项目">
            <Select
              placeholder="可先按项目筛选合同"
              value={modalProjectId || undefined}
              onChange={(value) => {
                setModalProjectId(value)
                form.setFieldValue('contractId', undefined)
              }}
              allowClear
              showSearch
              optionFilterProp="label"
              options={projectOptions}
            />
          </Form.Item>

          <Form.Item
            label="合同"
            name="contractId"
            rules={[{ required: true, message: '请选择合同' }]}
          >
            <Select
              placeholder="请选择合同"
              loading={contractsLoading}
              showSearch
              optionFilterProp="label"
              options={modalContracts.map((contract) => ({
                label: `${contract.code} - ${contract.name}`,
                value: contract.id,
              }))}
            />
          </Form.Item>

          {selectedContract ? (
            <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, color: '#595959' }}>
              项目：{selectedContract.projectName}；客户：{selectedContract.customerName}；合同名称：{selectedContract.name}；未收金额：{fmtMoney(selectedContract.unreceivedAmount)}
            </div>
          ) : null}

          <Form.Item
            label="收款金额"
            name="amount"
            rules={positiveAmountRules('收款金额')}
          >
            <InputNumber
              placeholder="请输入收款金额"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="收款日期" name="receiptDate" rules={[requiredDateRule('收款日期')]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="收款方式" name="receiptMethod">
            <Input placeholder="请输入收款方式" />
          </Form.Item>

          <Form.Item label="收款编号" name="receiptNumber">
            <Input placeholder="请输入收款编号" />
          </Form.Item>

          <Form.Item label="附件" name="attachmentUrl">
            <AttachmentField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <DetailModal
        title={detailData ? `收款详情 · ${detailData.receiptNumber || detailData.contractCode}` : '收款详情'}
        open={detailOpen}
        loading={detailLoading}
        onClose={() => { setDetailOpen(false); setDetailData(null) }}
        toolbar={(
          <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              {detailToolbarText}
            </span>
            <Space size="small">
              <Button size="small" onClick={() => { void handleDetailNavigate('prev') }} disabled={!canPrevDetail}>上一条</Button>
              <Button size="small" onClick={() => { void handleDetailNavigate('next') }} disabled={!canNextDetail}>下一条</Button>
            </Space>
          </Space>
        )}
        items={[
          { key: 'contractCode', label: '合同编号', value: getDisplayText(detailData?.contractCode) },
          { key: 'contractName', label: '合同名称', value: getDisplayText(detailData?.contractName) },
          { key: 'projectName', label: '项目名称', value: getDisplayText(detailData?.projectName) },
          { key: 'customerName', label: '客户名称', value: getDisplayText(detailData?.customerName) },
          { key: 'amount', label: '收款金额', value: detailData ? fmtMoney(detailData.amount) : getDisplayText() },
          { key: 'status', label: '收款状态', value: getBusinessStatusLabel(detailData?.status) },
          { key: 'contractStatus', label: '关联合同状态', value: getBusinessStatusLabel(detailData?.contractStatus) },
          { key: 'receivableAmount', label: '合同应收金额', value: detailData ? fmtMoney(detailData.receivableAmount) : getDisplayText() },
          { key: 'receivedAmount', label: '合同已收金额', value: detailData ? fmtMoney(detailData.receivedAmount) : getDisplayText() },
          { key: 'unreceivedAmount', label: '合同未收金额', value: detailData ? fmtMoney(detailData.unreceivedAmount) : getDisplayText() },
          { key: 'receiptDate', label: '收款日期', value: fmtDate(detailData?.receiptDate) },
          { key: 'receiptMethod', label: '收款方式', value: getDisplayText(detailData?.receiptMethod) },
          { key: 'receiptNumber', label: '收款编号', value: getDisplayText(detailData?.receiptNumber) },
          { key: 'approvalStatus', label: '审批状态', value: detailData?.approvalStatus ? <ApprovalStatusTag status={detailData.approvalStatus} /> : '-' },
          { key: 'attachmentUrl', label: '附件', value: <AttachmentLink url={detailData?.attachmentUrl} /> },
          { key: 'createdAt', label: '登记时间', value: fmtDate(detailData?.createdAt) },
          { key: 'updatedAt', label: '最近更新时间', value: fmtDate(detailData?.updatedAt) },
          { key: 'remark', label: '备注', value: getDisplayText(detailData?.remark), span: 2 },
        ]}
        extra={detailData ? (
          <LedgerDetailExtra
            summaryItems={[
              { key: 'summary-amount', label: '本次收款', value: fmtMoney(detailData.amount) },
              { key: 'summary-receivable', label: '合同应收', value: fmtMoney(detailData.receivableAmount ?? 0) },
              { key: 'summary-received', label: '合同累计已收', value: fmtMoney(detailData.receivedAmount ?? 0) },
              { key: 'summary-unreceived', label: '合同剩余未收', value: fmtMoney(detailData.unreceivedAmount ?? 0) },
              { key: 'summary-approvalStatus', label: '当前审批状态', value: detailData.approvalStatus ? <ApprovalStatusTag status={detailData.approvalStatus} /> : '-' },
              { key: 'summary-progress', label: '回款进度', value: getProgressText(detailData.receivedAmount, detailData.receivableAmount) },
            ]}
            summaryHint={joinDetailHints(
              getExecutionStatusHint(detailData.contractStatus),
              getApprovalStatusHint(detailData.approvalStatus),
              getApprovalActionBoundaryHint(detailData.approvalStatus, '收款记录'),
              '可在当前窗口继续切换同合同收款流水，也可直接查看关联合同台账',
            )}
            actionBar={(
              <Space size="small" wrap>
                <Button
                  size="small"
                  type="link"
                  onClick={() => window.open(buildLedgerRouteHref('/project-contracts', {
                    projectId: detailData.projectId,
                    keyword: detailData.contractCode,
                    detailId: detailData.contractId,
                  }), '_blank')}
                >
                  查看关联合同台账
                </Button>
                {approvalReturnPath ? (
                  <Button size="small" type="link" onClick={() => { window.location.href = approvalReturnPath }}>
                    返回审批列表
                  </Button>
                ) : null}
                {approvalPrevPath ? (
                  <Button size="small" type="link" onClick={() => { window.location.href = approvalPrevPath }}>
                    上一条待办
                  </Button>
                ) : null}
                {approvalNextPath ? (
                  <Button size="small" type="link" onClick={() => { window.location.href = approvalNextPath }}>
                    继续处理下一条待办
                  </Button>
                ) : null}
                {returnPath ? (
                  <Button size="small" type="link" onClick={() => { window.location.href = returnPath }}>
                    返回来源合同
                  </Button>
                ) : null}
                <Button
                  size="small"
                  type="link"
                  onClick={() => { void loadReceiptDetail(detailData.id, false) }}
                >
                  刷新详情
                </Button>
                <ApprovalActions
                  id={detailData.id}
                  approvalStatus={detailData.approvalStatus || 'PENDING'}
                  resource="contract-receipts"
                  enableCancel
                  onSuccess={() => handleApprovalActionSuccess(detailData.id)}
                />
              </Space>
            )}
            flowTitle="同合同最近收款流水"
            flows={detailData.relatedFlows}
            activeFlowId={detailData.id}
            flowEmptyText="当前合同暂无更多收款流水"
            onFlowClick={(flow) => {
              if (flow.id) {
                void loadReceiptDetail(flow.id, true)
              }
            }}
            approvalTitle="审批处理轨迹"
            approvalTrails={detailData.approvalTrail}
            approvalEmptyText="当前收款记录暂无审批轨迹"
          />
        ) : null}
      />
    </ConfigProvider>
  )
}
