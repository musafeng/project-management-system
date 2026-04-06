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
import { ApprovalStatusTag, ApprovalActions } from '@/components/ApprovalActions'
import DetailModal from '@/components/DetailModal'
import LedgerDetailExtra, { type LedgerApprovalTrailRecord, type LedgerFlowRecord } from '@/components/LedgerDetailExtra'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { APPROVAL_STATUS_OPTIONS, getApprovalBatchActionHint, getApprovalStatusLabel, isApprovalReadonly } from '@/lib/approval-ui'
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
 * 劳务付款数据类型
 */
interface LaborPayment {
  id: string
  contractId?: string
  contractCode: string
  contractName?: string
  projectName: string
  laborWorkerName: string
  amount: number
  paymentDate: string
  paymentMethod?: string | null
  paymentNumber?: string | null
  status?: string
  approvalStatus: string
  remark: string | null
  createdAt: string
}

interface LaborPaymentDetail extends LaborPayment {
  projectId?: string
  workerId?: string
  paymentMethod?: string | null
  paymentNumber?: string | null
  contractStatus?: string
  payableAmount?: number
  paidAmount?: number
  unpaidAmount?: number
  status?: string
  updatedAt?: string
  relatedFlows?: LedgerFlowRecord[]
  approvalTrail?: LedgerApprovalTrailRecord[]
}

/**
 * 劳务合同数据类型
 */
interface LaborContract {
  id: string
  code: string
  name?: string
  projectId: string
  projectName: string
  constructionName: string
  laborWorkerName: string
  contractAmount: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  signDate: string | null
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
  paymentAmountTotal: 0,
  relatedPayableAmountTotal: 0,
  relatedPaidAmountTotal: 0,
  relatedUnpaidAmountTotal: 0,
  paymentProgress: 0,
  relatedContractCount: 0,
  resultCount: 0,
}

export default function LaborPaymentsPage() {
  const [payments, setPayments] = useState<LaborPayment[]>([])
  const [contracts, setContracts] = useState<LaborContract[]>([])
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
  const [detailData, setDetailData] = useState<LaborPaymentDetail | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [returnPath, setReturnPath] = useState<string | undefined>(undefined)
  const [approvalReturnPath, setApprovalReturnPath] = useState<string | undefined>(undefined)
  const [approvalPrevPath, setApprovalPrevPath] = useState<string | undefined>(undefined)
  const [approvalNextPath, setApprovalNextPath] = useState<string | undefined>(undefined)
  const [approvalContextHint, setApprovalContextHint] = useState<string | undefined>(undefined)
  const detailCacheRef = useRef<Record<string, LaborPaymentDetail>>({})
  const pageCacheRef = useRef<Record<number, LaborPayment[]>>({})
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

  useEffect(() => {
    getCurrentAuthUser().then((u) => setIsAdmin(u?.systemRole === 'ADMIN'))
  }, [])

  /**
   * 加载劳务合同列表
   */
  const loadContracts = async () => {
    try {
      setContractsLoading(true)
      const response = await fetch('/api/labor-contracts')
      const result: ApiResponse<LaborContract[]> = await response.json()

      if (result.success && result.data) {
        setContracts(result.data)
      } else {
        console.error('加载劳务合同列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载劳务合同列表失败:', err)
    } finally {
      setContractsLoading(false)
    }
  }

  /**
   * 加载劳务付款列表
   */
  const loadPayments = async (
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

      const url = `/api/labor-payments${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<any> = await response.json()

      if (result.success && result.data) {
        const normalized = normalizePaginatedList<LaborPayment>(result.data, nextPage, nextPageSize)
        pageCacheRef.current[nextPage] = normalized.items
        setPayments(normalized.items)
        setPage(normalized.page)
        setPageSize(normalized.pageSize)
        setTotal(normalized.total)
        setSummary(result.data?.summary || { ...EMPTY_SUMMARY, resultCount: normalized.total })
        return normalized.items
      } else {
        message.error(result.error || '数据加载失败')
        setPayments([])
        setTotal(0)
        setSummary(EMPTY_SUMMARY)
        return []
      }
    } catch (err) {
      console.error('加载劳务付款列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setPayments([])
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
    loadPayments(context.contractId, context.projectId, context.keyword || '', context.approvalStatus, initialDateRange, 1, pageSize)
      .then(async () => {
        if (context.detailId) {
          await loadPaymentDetail(context.detailId, true)
          await loadApprovalWorkflowContext(context.detailId)
        }
      })
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    clearPrefetchCache()
    loadPayments(contractId, projectId, keyword, approvalStatus, dateRange, 1, pageSize)
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
    loadPayments(undefined, undefined, '', undefined, null, 1, pageSize)
  }

  /**
   * 打开新增弹窗
   */
  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ paymentDate: dayjs() })
    setModalProjectId(undefined)
    setIsModalVisible(true)
  }

  const handleEditClick = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-payments/${id}`)
      const result: ApiResponse<LaborPaymentDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        const currentContract = contracts.find((contract) => contract.id === result.data?.contractId)
        setModalProjectId(currentContract?.projectId)
        form.setFieldsValue({
          contractId: result.data.contractId,
          amount: result.data.amount,
          paymentDate: result.data.paymentDate ? dayjs(result.data.paymentDate) : undefined,
          paymentMethod: result.data.paymentMethod || undefined,
          paymentNumber: result.data.paymentNumber || undefined,
          remark: result.data.remark || undefined,
        })
        setIsModalVisible(true)
      } else {
        message.error(result.error || '获取付款信息失败')
      }
    } catch (err) {
      console.error('获取付款信息失败:', err)
      message.error('获取付款信息失败')
    }
  }

  const fetchPaymentDetail = async (id: string) => {
    const cached = detailCacheRef.current[id]
    if (cached) return cached
    const response = await fetch(`/api/labor-payments/${id}`)
    const result: ApiResponse<LaborPaymentDetail> = await response.json()
    if (!result.success || !result.data) throw new Error(result.error || '获取付款信息失败')
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
    await refreshPaymentContext(recordId)
    if (approvalContextRef.current.approvalTab) {
      const summary = buildApprovalFilterSummary(approvalContextRef.current)
      setApprovalContextHint(`${summary} · ${getApprovalBatchActionHint(hasNext)}`)
    }
  }

  const loadPaymentDetail = async (id: string, openModal = false) => {
    if (openModal) setDetailOpen(true)
    try {
      const cached = detailCacheRef.current[id]
      if (cached) {
        setDetailData(cached)
        setDetailLoading(false)
      } else {
        setDetailLoading(true)
      }
      const detail = await fetchPaymentDetail(id)
      setDetailData(detail)
      await loadApprovalWorkflowContext(id)
    } catch (err) {
      console.error('获取付款信息失败:', err)
      message.error('获取付款信息失败')
      if (openModal) setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewClick = async (id: string) => {
    await loadPaymentDetail(id, true)
  }

  const refreshPaymentContext = async (recordId?: string, targetPage = page) => {
    await loadPayments(contractId, projectId, keyword, approvalStatus, dateRange, targetPage, pageSize)
    if (recordId && detailOpen && detailData?.id === recordId) {
      await loadPaymentDetail(recordId)
    }
  }

  const detailIndex = detailData ? payments.findIndex((item) => item.id === detailData.id) : -1
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

  const prefetchPaymentPage = async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || pageCacheRef.current[targetPage]) return
    try {
      const params = buildListParams(contractId, projectId, keyword, approvalStatus, dateRange, targetPage, pageSize)
      const response = await fetch(`/api/labor-payments?${params.toString()}`)
      const result: ApiResponse<any> = await response.json()
      if (result.success && result.data) {
        const normalized = normalizePaginatedList<LaborPayment>(result.data, targetPage, pageSize)
        pageCacheRef.current[targetPage] = normalized.items
      }
    } catch {}
  }

  const prefetchPaymentDetail = async (id?: string | null) => {
    if (!id || detailCacheRef.current[id]) return
    try {
      const detail = await fetchPaymentDetail(id)
      detailCacheRef.current[id] = detail
    } catch {}
  }

  useEffect(() => {
    if (!detailOpen || !detailData) return
    const currentIndex = payments.findIndex((item) => item.id === detailData.id)
    if (currentIndex > 0) void prefetchPaymentDetail(payments[currentIndex - 1]?.id)
    if (currentIndex >= 0 && currentIndex < payments.length - 1) void prefetchPaymentDetail(payments[currentIndex + 1]?.id)
    if (canPrevDetail && currentIndex <= 0) {
      void prefetchPaymentPage(page - 1).then(() => {
        const items = pageCacheRef.current[page - 1]
        if (items?.length) void prefetchPaymentDetail(items[items.length - 1]?.id)
      })
    }
    if (canNextDetail && currentIndex === payments.length - 1) {
      void prefetchPaymentPage(page + 1).then(() => {
        const items = pageCacheRef.current[page + 1]
        if (items?.length) void prefetchPaymentDetail(items[0]?.id)
      })
    }
  }, [detailOpen, detailData?.id, page, pageSize, total, payments])

  const handleDetailNavigate = async (direction: 'prev' | 'next') => {
    if (!detailData) return
    const currentIndex = payments.findIndex((item) => item.id === detailData.id)
    if (currentIndex < 0) return
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (payments[targetIndex]) {
      await loadPaymentDetail(payments[targetIndex].id, false)
      return
    }
    const targetPage = direction === 'next' ? page + 1 : page - 1
    if (targetPage < 1 || targetPage > totalPages) return
    const targetItems = pageCacheRef.current[targetPage] || await loadPayments(contractId, projectId, keyword, approvalStatus, dateRange, targetPage, pageSize)
    const targetId = direction === 'next' ? targetItems[0]?.id : targetItems[targetItems.length - 1]?.id
    if (targetId) {
      await loadPaymentDetail(targetId, false)
    }
  }

  /**
   * 删除付款记录
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-payments/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(getDeleteSuccessMessage('劳务付款'))
        await refreshPaymentContext(id, getPageAfterDelete(page, payments.length))
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除劳务付款记录失败:', err)
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
        paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : null,
        paymentMethod: values.paymentMethod || null,
        paymentNumber: values.paymentNumber || null,
        remark: values.remark || null,
      }

      const response = await fetch(editingId ? `/api/labor-payments/${editingId}` : '/api/labor-payments', {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(getSaveSuccessMessage('劳务付款', Boolean(editingId)))
        setIsModalVisible(false)
        setEditingId(null)
        form.resetFields()
        setModalProjectId(undefined)
        await refreshPaymentContext(editingId || result.data?.id)
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
      const exportUrl = params.toString() ? `/api/labor-payments/export?${params.toString()}` : '/api/labor-payments/export'
      await downloadExportFile(exportUrl, `劳务付款台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`, '导出失败')
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
  const columns: ColumnsType<LaborPayment> = [
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
      title: '劳务班组',
      dataIndex: 'laborWorkerName',
      key: 'laborWorkerName',
      width: 130,
      render: (text?: string) => getDisplayText(text),
    },
    {
      title: '付款金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (value: number) => fmtMoney(value),
    },
    {
      title: '付款日期',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      render: fmtDate,
    },
    {
      title: '付款方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (text?: string | null) => getDisplayText(text),
    },
    {
      title: '付款单号',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 150,
      render: (text?: string | null) => getDisplayText(text),
    },
    {
      title: '付款状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status?: string) => getBusinessStatusLabel(status),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
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
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (status: string) => <ApprovalStatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewClick(record.id)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} disabled={isApprovalReadonly(record.approvalStatus)} title={isApprovalReadonly(record.approvalStatus) ? READONLY_ACTION_HINT : ''} onClick={() => handleEditClick(record.id)}>
            编辑
          </Button>
          <Popconfirm title={getDeleteConfirmTitle('劳务付款')} description={getDeleteConfirmDescription('劳务付款')} onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" disabled={isApprovalReadonly(record.approvalStatus)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={isApprovalReadonly(record.approvalStatus)} title={isApprovalReadonly(record.approvalStatus) ? READONLY_ACTION_HINT : ''}>删除</Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            resource="labor-payments"
            isAdmin={isAdmin}
            onSuccess={({ action }) => refreshPaymentContext(action ? record.id : undefined)}
          />
        </Space>
      ),
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
              劳务付款管理
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
                placeholder="搜索合同名称 / 编号 / 项目 / 劳务班组 / 付款单号"
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
                placeholder={['付款开始', '付款结束']}
              />

              <Select
                placeholder="选择合同"
                value={contractId || undefined}
                onChange={setContractId}
                allowClear
                style={{ width: 250 }}
                loading={contractsLoading}
                options={filteredContracts.map((contract) => ({
                  label: `${contract.code} - ${contract.name || contract.projectName}`,
                  value: contract.id,
                }))}
              />

              <Button type="primary" onClick={handleSearch} loading={loading}>
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
                新增付款
              </Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table<LaborPayment>
            rowKey="id"
            columns={columns}
            dataSource={payments}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showTotal: (count) => `共 ${count} 条`,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showQuickJumper: total > pageSize,
              onChange: (nextPage, nextPageSize) => loadPayments(contractId, projectId, keyword, approvalStatus, dateRange, nextPage, nextPageSize),
            }}
            scroll={{ x: 1440 }}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={columns.length}>
                  <span style={{ fontWeight: 600 }}>
                    当前筛选合计：付款金额 {fmtMoney(summary.paymentAmountTotal)}；关联合同已付金额 {fmtMoney(summary.relatedPaidAmountTotal)}，关联合同未付金额 {fmtMoney(summary.relatedUnpaidAmountTotal)}，整体付款进度 {formatProgress(summary.paymentProgress)}；筛选结果共 {total} 条
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            locale={{
              emptyText: getLedgerEmptyText('劳务付款记录', '新增付款'),
            }}
          />
        </div>
      </div>

      {/* 新增/编辑付款弹窗 */}
      <Modal
        title={editingId ? '编辑劳务付款' : '新增劳务付款'}
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
                label: `${contract.code} - ${contract.name || contract.projectName}`,
                value: contract.id,
              }))}
            />
          </Form.Item>

          {selectedContract ? (
            <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, color: '#595959' }}>
              项目：{selectedContract.projectName}；劳务班组：{selectedContract.laborWorkerName}；合同名称：{selectedContract.name || '—'}；未付金额：{fmtMoney(selectedContract.unpaidAmount)}
            </div>
          ) : null}

          <Form.Item
            label="付款金额"
            name="amount"
            rules={positiveAmountRules('付款金额')}
          >
            <InputNumber
              placeholder="请输入付款金额"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="付款日期" name="paymentDate" rules={[requiredDateRule('付款日期')]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="付款方式" name="paymentMethod">
            <Input placeholder="请输入付款方式" />
          </Form.Item>

          <Form.Item label="付款单号" name="paymentNumber">
            <Input placeholder="请输入付款单号" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <DetailModal
        title={detailData ? `劳务付款详情 · ${detailData.paymentNumber || detailData.contractCode}` : '劳务付款详情'}
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
          { key: 'laborWorkerName', label: '劳务班组', value: getDisplayText(detailData?.laborWorkerName) },
          { key: 'amount', label: '付款金额', value: detailData ? fmtMoney(detailData.amount) : getDisplayText() },
          { key: 'status', label: '付款状态', value: getBusinessStatusLabel(detailData?.status) },
          { key: 'contractStatus', label: '关联合同状态', value: getBusinessStatusLabel(detailData?.contractStatus) },
          { key: 'payableAmount', label: '关联合同应付金额', value: detailData ? fmtMoney(detailData.payableAmount) : getDisplayText() },
          { key: 'paidAmount', label: '关联合同已付金额', value: detailData ? fmtMoney(detailData.paidAmount) : getDisplayText() },
          { key: 'unpaidAmount', label: '关联合同未付金额', value: detailData ? fmtMoney(detailData.unpaidAmount) : getDisplayText() },
          { key: 'paymentDate', label: '付款日期', value: fmtDate(detailData?.paymentDate || '') },
          { key: 'paymentMethod', label: '付款方式', value: getDisplayText(detailData?.paymentMethod) },
          { key: 'paymentNumber', label: '付款单号', value: getDisplayText(detailData?.paymentNumber) },
          { key: 'approvalStatus', label: '审批状态', value: detailData?.approvalStatus ? <ApprovalStatusTag status={detailData.approvalStatus} /> : getApprovalStatusLabel(detailData?.approvalStatus) },
          { key: 'createdAt', label: '登记时间', value: fmtDate(detailData?.createdAt || '') },
          { key: 'updatedAt', label: '最近更新时间', value: fmtDate(detailData?.updatedAt || '') },
          { key: 'remark', label: '备注', value: getDisplayText(detailData?.remark), span: 2 },
        ]}
        extra={detailData ? (
          <LedgerDetailExtra
            summaryItems={[
              { key: 'summary-amount', label: '本次付款', value: fmtMoney(detailData.amount) },
              { key: 'summary-payableAmount', label: '合同应付', value: fmtMoney(detailData.payableAmount ?? 0) },
              { key: 'summary-paidAmount', label: '合同累计已付', value: fmtMoney(detailData.paidAmount ?? 0) },
              { key: 'summary-unpaidAmount', label: '合同剩余未付', value: fmtMoney(detailData.unpaidAmount ?? 0) },
              { key: 'summary-approvalStatus', label: '当前审批状态', value: detailData.approvalStatus ? <ApprovalStatusTag status={detailData.approvalStatus} /> : getApprovalStatusLabel(detailData?.approvalStatus) },
              { key: 'summary-progress', label: '付款进度', value: getProgressText(detailData.paidAmount, detailData.payableAmount) },
            ]}
            summaryHint={joinDetailHints(
              getExecutionStatusHint(detailData.contractStatus),
              getApprovalStatusHint(detailData.approvalStatus),
              getApprovalActionBoundaryHint(detailData.approvalStatus, '劳务付款单'),
              '可在当前窗口继续切换同合同付款流水，也可直接查看关联合同台账',
            )}
            actionBar={(
              <Space size="small" wrap>
                <Button
                  size="small"
                  type="link"
                  onClick={() => window.open(buildLedgerRouteHref('/labor-contracts', {
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
                  onClick={() => { void loadPaymentDetail(detailData.id, false) }}
                >
                  刷新详情
                </Button>
                <ApprovalActions
                  id={detailData.id}
                  approvalStatus={detailData.approvalStatus}
                  resource="labor-payments"
                  enableCancel
                  onSuccess={() => handleApprovalActionSuccess(detailData.id)}
                />
              </Space>
            )}
            flowTitle="同合同最近付款流水"
            flows={detailData.relatedFlows}
            activeFlowId={detailData.id}
            flowEmptyText="当前合同暂无更多付款流水"
            onFlowClick={(flow) => {
              if (flow.id) {
                void loadPaymentDetail(flow.id, true)
              }
            }}
            approvalTitle="审批处理轨迹"
            approvalTrails={detailData.approvalTrail}
            approvalEmptyText="当前付款记录暂无审批轨迹"
          />
        ) : null}
      />
    </ConfigProvider>
  )
}
