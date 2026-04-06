'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  ConfigProvider,
  Popconfirm,
  DatePicker,
  InputNumber,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ApprovalStatusTag, ApprovalActions } from '@/components/ApprovalActions'
import AttachmentField from '@/components/AttachmentField'
import AttachmentLink from '@/components/AttachmentLink'
import DetailModal from '@/components/DetailModal'
import LedgerDetailExtra, { type LedgerChangeRecord, type LedgerFlowRecord } from '@/components/LedgerDetailExtra'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { APPROVAL_STATUS_OPTIONS, getApprovalBatchActionHint, isApprovalReadonly } from '@/lib/approval-ui'
import { downloadExportFile } from '@/lib/export-client'
import { endDateAfterStartRule, positiveAmountRules, requiredDateRule } from '@/lib/form-rules'
import {
  getApprovalActionBoundaryHint,
  getApprovalStatusHint,
  getBusinessStatusLabel,
  getContractChangeHint,
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
import { buildApprovalDetailPath, buildApprovalFilterSummary, buildApprovalPositionSummary, readApprovalRouteContext, type ApprovalRouteContext } from '@/lib/approval-context'
import { buildLedgerFilterSummary, buildLedgerRouteHref, readLedgerRouteContext } from '@/lib/ledger-context'
import { appendPaginationParams, getPageAfterDelete, normalizePaginatedList } from '@/lib/list-pagination'
import { fmtDate, fmtMoney } from '@/lib/utils/format'

/**
 * 劳务合同数据类型
 */
interface LaborContract {
  id: string
  code: string
  name?: string
  projectName: string
  constructionName: string
  laborWorkerName: string
  contractAmount: number
  changedAmount?: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  signDate: string | null
  status?: string
  approvalStatus: string
  attachmentUrl?: string | null
  createdAt: string
}

/**
 * 劳务合同详情类型
 */
interface LaborContractDetail extends LaborContract {
  projectId?: string
  constructionId?: string
  workerId?: string
  changedAmount?: number
  status?: string
  startDate?: string | null
  endDate?: string | null
  laborType?: string | null
  attachmentUrl?: string | null
  remark?: string | null
  updatedAt?: string
  recentFlows?: LedgerFlowRecord[]
  changeRecords?: LedgerChangeRecord[]
}

/**
 * 项目数据类型
 */
interface Project {
  id: string
  code: string
  name: string
  customerId: string
  customerName: string
  status: string
  createdAt: string
}

/**
 * 施工立项数据类型
 */
interface ConstructionApproval {
  id: string
  code: string
  name: string
  projectId: string
  budget: number
  status: string
  createdAt: string
}

/**
 * 劳务人员数据类型
 */
interface LaborWorker {
  id: string
  code: string
  name: string
  contact: string | null
  phone: string | null
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
  contractAmountTotal: 0,
  changedAmountTotal: 0,
  payableAmountTotal: 0,
  paidAmountTotal: 0,
  unpaidAmountTotal: 0,
  paymentProgress: 0,
  resultCount: 0,
}

const CONTRACT_STATUS_OPTIONS = [
  { label: '草稿', value: 'DRAFT' },
  { label: '待审批', value: 'PENDING' },
  { label: '已批准', value: 'APPROVED' },
  { label: '执行中', value: 'EXECUTING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已终止', value: 'TERMINATED' },
  { label: '已取消', value: 'CANCELLED' },
]

export default function LaborContractsPage() {
  const [contracts, setContracts] = useState<LaborContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [constructions, setConstructions] = useState<ConstructionApproval[]>([])
  const [laborWorkers, setLaborWorkers] = useState<LaborWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [constructionsLoading, setConstructionsLoading] = useState(true)
  const [laborWorkersLoading, setLaborWorkersLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [approvalStatus, setApprovalStatus] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<any>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<LaborContractDetail | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [approvalReturnPath, setApprovalReturnPath] = useState<string | undefined>(undefined)
  const [approvalPrevPath, setApprovalPrevPath] = useState<string | undefined>(undefined)
  const [approvalNextPath, setApprovalNextPath] = useState<string | undefined>(undefined)
  const [approvalContextHint, setApprovalContextHint] = useState<string | undefined>(undefined)
  const detailCacheRef = useRef<Record<string, LaborContractDetail>>({})
  const pageCacheRef = useRef<Record<number, LaborContract[]>>({})
  const approvalContextRef = useRef<ApprovalRouteContext>({})
  const [form] = Form.useForm()
  const selectedProjectId = Form.useWatch('projectId', form)
  const startDateValue = Form.useWatch('startDate', form)
  const filteredConstructions = constructions.filter((construction) => !selectedProjectId || construction.projectId === selectedProjectId)
  const formatProgress = (value?: number) => `${Number(value || 0).toFixed(1)}%`

  useEffect(() => {
    getCurrentAuthUser().then((u) => setIsAdmin(u?.systemRole === 'ADMIN'))
  }, [])

  const clearPrefetchCache = () => {
    detailCacheRef.current = {}
    pageCacheRef.current = {}
  }

  const buildListParams = (
    searchKeyword?: string,
    searchProjectId?: string,
    searchApprovalStatus?: string,
    searchDateRange?: [any, any] | null,
    nextPage = page,
    nextPageSize = pageSize,
  ) => {
    const params = new URLSearchParams()
    if (searchKeyword?.trim()) params.append('keyword', searchKeyword.trim())
    if (searchProjectId) params.append('projectId', searchProjectId)
    if (searchApprovalStatus) params.append('approvalStatus', searchApprovalStatus)
    if (searchDateRange?.[0]) params.append('startDate', searchDateRange[0].format('YYYY-MM-DD'))
    if (searchDateRange?.[1]) params.append('endDate', searchDateRange[1].format('YYYY-MM-DD'))
    appendPaginationParams(params, nextPage, nextPageSize)
    return params
  }

  /**
   * 加载项目列表
   */
  const loadProjects = async () => {
    try {
      setProjectsLoading(true)
      const response = await fetch('/api/projects')
      const result: ApiResponse<Project[]> = await response.json()

      if (result.success && result.data) {
        setProjects(result.data)
      } else {
        console.error('加载项目列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载项目列表失败:', err)
    } finally {
      setProjectsLoading(false)
    }
  }

  /**
   * 加载施工立项列表
   */
  const loadConstructions = async () => {
    try {
      setConstructionsLoading(true)
      const response = await fetch('/api/construction-approvals')
      const result: ApiResponse<ConstructionApproval[]> = await response.json()

      if (result.success && result.data) {
        setConstructions(result.data)
      } else {
        console.error('加载施工立项列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载施工立项列表失败:', err)
    } finally {
      setConstructionsLoading(false)
    }
  }

  /**
   * 加载劳务人员列表
   */
  const loadLaborWorkers = async () => {
    try {
      setLaborWorkersLoading(true)
      const response = await fetch('/api/labor-workers')
      const result: ApiResponse<LaborWorker[]> = await response.json()

      if (result.success && result.data) {
        setLaborWorkers(result.data)
      } else {
        console.error('加载劳务人员列表失败:', result.error)
      }
    } catch (err) {
      console.error('加载劳务人员列表失败:', err)
    } finally {
      setLaborWorkersLoading(false)
    }
  }

  /**
   * 加载劳务合同列表
   */
  const loadContracts = async (
    searchKeyword?: string,
    searchProjectId?: string,
    searchApprovalStatus?: string,
    searchDateRange?: [any, any] | null,
    nextPage = page,
    nextPageSize = pageSize,
  ) => {
    try {
      setLoading(true)
      const params = buildListParams(searchKeyword, searchProjectId, searchApprovalStatus, searchDateRange, nextPage, nextPageSize)

      const url = `/api/labor-contracts${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<any> = await response.json()

      if (result.success && result.data) {
        const normalized = normalizePaginatedList<LaborContract>(result.data, nextPage, nextPageSize)
        pageCacheRef.current[nextPage] = normalized.items
        setContracts(normalized.items)
        setPage(normalized.page)
        setPageSize(normalized.pageSize)
        setTotal(normalized.total)
        setSummary(result.data?.summary || { ...EMPTY_SUMMARY, resultCount: normalized.total })
        return normalized.items
      } else {
        message.error(result.error || '数据加载失败')
        setContracts([])
        setTotal(0)
        setSummary(EMPTY_SUMMARY)
        return []
      }
    } catch (err) {
      console.error('加载劳务合同列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setContracts([])
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
    setApprovalStatus(context.approvalStatus)
    setDateRange(initialDateRange)
    setApprovalReturnPath(context.returnPath?.includes('/approval') ? context.returnPath : undefined)
    clearPrefetchCache()
    loadProjects()
    loadConstructions()
    loadLaborWorkers()
    loadContracts(context.keyword || '', context.projectId, context.approvalStatus, initialDateRange, 1, pageSize)
      .then(async () => {
        if (context.detailId) {
          await handleViewClick(context.detailId)
          await loadApprovalWorkflowContext(context.detailId)
        }
      })
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    clearPrefetchCache()
    loadContracts(keyword, projectId, approvalStatus, dateRange, 1, pageSize)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    clearPrefetchCache()
    setKeyword('')
    setProjectId(undefined)
    setApprovalStatus(undefined)
    setDateRange(null)
    loadContracts('', undefined, undefined, null, 1, pageSize)
  }

  const openCreateModal = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      signDate: dayjs(),
      status: 'DRAFT',
    })
    setIsModalVisible(true)
  }

  /**
   * 打开新增弹窗
   */
  const handleAddClick = () => {
    openCreateModal()
  }

  /**
   * 打开编辑弹窗
   */
  const handleEditClick = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-contracts/${id}`)
      const result: ApiResponse<LaborContractDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        form.setFieldsValue({
          name: result.data.name || undefined,
          projectId: result.data.projectId,
          constructionId: result.data.constructionId,
          laborWorkerId: result.data.workerId,
          contractAmount: result.data.contractAmount,
          signDate: result.data.signDate ? dayjs(result.data.signDate) : undefined,
          startDate: result.data.startDate ? dayjs(result.data.startDate) : undefined,
          endDate: result.data.endDate ? dayjs(result.data.endDate) : undefined,
          status: result.data.status || undefined,
          laborType: result.data.laborType || undefined,
          attachmentUrl: result.data.attachmentUrl || undefined,
          remark: result.data.remark || undefined,
        })
        setIsModalVisible(true)
      } else {
        message.error(result.error || '获取合同信息失败')
      }
    } catch (err) {
      console.error('获取合同信息失败:', err)
      message.error('获取合同信息失败')
    }
  }

  const fetchContractDetail = async (id: string) => {
    const cached = detailCacheRef.current[id]
    if (cached) return cached
    const response = await fetch(`/api/labor-contracts/${id}`)
    const result: ApiResponse<LaborContractDetail> = await response.json()
    if (!result.success || !result.data) throw new Error(result.error || '获取合同信息失败')
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
    await refreshContractContext(recordId)
    if (approvalContextRef.current.approvalTab) {
      const summary = buildApprovalFilterSummary(approvalContextRef.current)
      setApprovalContextHint(`${summary} · ${getApprovalBatchActionHint(hasNext)}`)
    }
  }

  const loadContractDetail = async (id: string, openModal = false) => {
    if (openModal) setDetailOpen(true)
    try {
      const cached = detailCacheRef.current[id]
      if (cached) {
        setDetailData(cached)
        setDetailLoading(false)
      } else {
        setDetailLoading(true)
      }
      const detail = await fetchContractDetail(id)
      setDetailData(detail)
      await loadApprovalWorkflowContext(id)
    } catch (err) {
      console.error('获取合同信息失败:', err)
      message.error('获取合同信息失败')
      if (openModal) setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewClick = async (id: string) => {
    await loadContractDetail(id, true)
  }

  const refreshContractContext = async (recordId?: string, targetPage = page) => {
    await loadContracts(keyword, projectId, approvalStatus, dateRange, targetPage, pageSize)
    if (recordId && detailOpen && detailData?.id === recordId) {
      await loadContractDetail(recordId)
    }
  }

  const detailIndex = detailData ? contracts.findIndex((item) => item.id === detailData.id) : -1
  const globalPosition = detailIndex >= 0 ? (page - 1) * pageSize + detailIndex + 1 : 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrevDetail = globalPosition > 1
  const canNextDetail = globalPosition > 0 && globalPosition < total
  const contextSummary = buildLedgerFilterSummary({
    projectName: projects.find((item) => item.id === projectId)?.name,
    keyword,
    statusLabel: APPROVAL_STATUS_OPTIONS.find((item) => item.value === approvalStatus)?.label,
    startDate: dateRange?.[0]?.format?.('YYYY-MM-DD'),
    endDate: dateRange?.[1]?.format?.('YYYY-MM-DD'),
  })
  const detailToolbarText = approvalContextHint || (globalPosition > 0 ? `${contextSummary} · 第 ${globalPosition} 条 / 共 ${total} 条 · 当前切换与导出均基于这组筛选结果` : '当前记录不在本次筛选结果中')

  const formatContextDate = (value: any) => value?.format ? value.format('YYYY-MM-DD') : undefined

  const prefetchContractPage = async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || pageCacheRef.current[targetPage]) return
    try {
      const params = buildListParams(keyword, projectId, approvalStatus, dateRange, targetPage, pageSize)
      const response = await fetch(`/api/labor-contracts?${params.toString()}`)
      const result: ApiResponse<any> = await response.json()
      if (result.success && result.data) {
        const normalized = normalizePaginatedList<LaborContract>(result.data, targetPage, pageSize)
        pageCacheRef.current[targetPage] = normalized.items
      }
    } catch {}
  }

  const prefetchContractDetail = async (id?: string | null) => {
    if (!id || detailCacheRef.current[id]) return
    try {
      const detail = await fetchContractDetail(id)
      detailCacheRef.current[id] = detail
    } catch {}
  }

  useEffect(() => {
    if (!detailOpen || !detailData) return
    const currentIndex = contracts.findIndex((item) => item.id === detailData.id)
    if (currentIndex > 0) void prefetchContractDetail(contracts[currentIndex - 1]?.id)
    if (currentIndex >= 0 && currentIndex < contracts.length - 1) void prefetchContractDetail(contracts[currentIndex + 1]?.id)
    if (canPrevDetail && currentIndex <= 0) {
      void prefetchContractPage(page - 1).then(() => {
        const items = pageCacheRef.current[page - 1]
        if (items?.length) void prefetchContractDetail(items[items.length - 1]?.id)
      })
    }
    if (canNextDetail && currentIndex === contracts.length - 1) {
      void prefetchContractPage(page + 1).then(() => {
        const items = pageCacheRef.current[page + 1]
        if (items?.length) void prefetchContractDetail(items[0]?.id)
      })
    }
  }, [detailOpen, detailData?.id, page, pageSize, total, contracts])

  const handleDetailNavigate = async (direction: 'prev' | 'next') => {
    if (!detailData) return
    const currentIndex = contracts.findIndex((item) => item.id === detailData.id)
    if (currentIndex < 0) return
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (contracts[targetIndex]) {
      await loadContractDetail(contracts[targetIndex].id, false)
      return
    }
    const targetPage = direction === 'next' ? page + 1 : page - 1
    if (targetPage < 1 || targetPage > totalPages) return
    const targetItems = pageCacheRef.current[targetPage] || await loadContracts(keyword, projectId, approvalStatus, dateRange, targetPage, pageSize)
    const targetId = direction === 'next' ? targetItems[0]?.id : targetItems[targetItems.length - 1]?.id
    if (targetId) {
      await loadContractDetail(targetId, false)
    }
  }

  /**
   * 删除劳务合同
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-contracts/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(getDeleteSuccessMessage('劳务合同'))
        await refreshContractContext(id, getPageAfterDelete(page, contracts.length))
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除劳务合同失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      const url = editingId ? `/api/labor-contracts/${editingId}` : '/api/labor-contracts'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        name: values.name || null,
        projectId: values.projectId,
        constructionId: values.constructionId,
        laborWorkerId: values.laborWorkerId,
        contractAmount: values.contractAmount,
        signDate: values.signDate ? values.signDate.format('YYYY-MM-DD') : null,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        status: values.status || undefined,
        laborType: values.laborType || null,
        attachmentUrl: values.attachmentUrl || null,
        remark: values.remark || null,
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(getSaveSuccessMessage('劳务合同', Boolean(editingId)))
        setIsModalVisible(false)
        setEditingId(null)
        form.resetFields()
        await refreshContractContext(editingId || result.data?.id)
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
      if (keyword.trim()) params.set('keyword', keyword.trim())
      if (projectId) params.set('projectId', projectId)
      if (approvalStatus) params.set('approvalStatus', approvalStatus)
      if (dateRange?.[0]) params.set('startDate', dateRange[0].format('YYYY-MM-DD'))
      if (dateRange?.[1]) params.set('endDate', dateRange[1].format('YYYY-MM-DD'))
      const exportUrl = params.toString() ? `/api/labor-contracts/export?${params.toString()}` : '/api/labor-contracts/export'
      await downloadExportFile(exportUrl, `劳务合同台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`, '导出失败')
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
  const columns: ColumnsType<LaborContract> = [
    {
      title: '合同编号',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
      render: (text: string | undefined) => getDisplayText(text),
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
    },
    {
      title: '施工立项',
      dataIndex: 'constructionName',
      key: 'constructionName',
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
      title: '合同金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      width: 120,
      align: 'right',
      render: (value: number) => fmtMoney(value),
    },
    {
      title: '变更金额',
      dataIndex: 'changedAmount',
      key: 'changedAmount',
      width: 120,
      align: 'right',
      render: (value?: number) => fmtMoney(value),
    },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      key: 'payableAmount',
      width: 120,
      align: 'right',
      render: (value: number) => fmtMoney(value),
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmtMoney(value)}</span>,
    },
    {
      title: '未付金额',
      dataIndex: 'unpaidAmount',
      key: 'unpaidAmount',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#f5222d', fontWeight: 600 }}>{fmtMoney(value)}</span>,
    },
    {
      title: '签订日期',
      dataIndex: 'signDate',
      key: 'signDate',
      width: 120,
      render: fmtDate,
    },
    {
      title: '合同状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status?: string) => getBusinessStatusLabel(status),
    },
    {
      title: '附件',
      dataIndex: 'attachmentUrl',
      key: 'attachmentUrl',
      width: 100,
      render: (value: string | null | undefined) => <AttachmentLink url={value} />,
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
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewClick(record.id)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />} disabled={isApprovalReadonly(record.approvalStatus)} title={isApprovalReadonly(record.approvalStatus) ? READONLY_ACTION_HINT : ''} onClick={() => handleEditClick(record.id)}>编辑</Button>
          <Popconfirm title={getDeleteConfirmTitle('劳务合同')} description={getDeleteConfirmDescription('劳务合同')} onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" disabled={isApprovalReadonly(record.approvalStatus)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={isApprovalReadonly(record.approvalStatus)} title={isApprovalReadonly(record.approvalStatus) ? READONLY_ACTION_HINT : ''}>删除</Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            resource="labor-contracts"
            isAdmin={isAdmin}
            onSuccess={({ action }) => refreshContractContext(action ? record.id : undefined)}
          />
        </Space>
      ),
    },
  ]

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
              劳务合同管理
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
                placeholder="搜索合同名称 / 编号 / 项目 / 劳务班组"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 260 }}
                onPressEnter={handleSearch}
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
                placeholder={['签订开始', '签订结束']}
              />

              <Select
                placeholder="选择项目"
                value={projectId || undefined}
                onChange={setProjectId}
                allowClear
                style={{ width: 200 }}
                loading={projectsLoading}
                options={projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
              />

              <Button
                type="primary"
                icon={<SearchOutlined />}
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
                onClick={openCreateModal}
                style={{ marginLeft: 'auto' }}
              >
                新增合同
              </Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table<LaborContract>
            rowKey="id"
            columns={columns}
            dataSource={contracts}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showTotal: (count) => `共 ${count} 条`,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showQuickJumper: total > pageSize,
              onChange: (nextPage, nextPageSize) => loadContracts(keyword, projectId, approvalStatus, dateRange, nextPage, nextPageSize),
            }}
            scroll={{ x: 1760 }}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={columns.length}>
                  <span style={{ fontWeight: 600 }}>
                    当前筛选合计：合同金额 {fmtMoney(summary.contractAmountTotal)}，变更金额 {fmtMoney(summary.changedAmountTotal)}，合同已付金额 {fmtMoney(summary.paidAmountTotal)}，合同未付金额 {fmtMoney(summary.unpaidAmountTotal)}，整体付款进度 {formatProgress(summary.paymentProgress)}；筛选结果共 {total} 条
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            locale={{
              emptyText: getLedgerEmptyText('劳务合同', '新增合同'),
            }}
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑劳务合同' : '新增劳务合同'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingId(null)
          form.resetFields()
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={(changedValues) => {
            if ('projectId' in changedValues) {
              form.setFieldsValue({ constructionId: undefined })
            }
          }}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="合同名称"
            name="name"
            rules={[{ required: true, message: '请输入合同名称' }]}
          >
            <Input placeholder="请输入合同名称" />
          </Form.Item>

          <Form.Item
            label="项目"
            name="projectId"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select
              placeholder="请选择项目"
              loading={projectsLoading}
              showSearch
              optionFilterProp="label"
              options={projects.map((project) => ({
                label: `${project.name}（${project.code}）`,
                value: project.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="施工立项"
            name="constructionId"
            rules={[{ required: true, message: '请选择施工立项' }]}
          >
            <Select
              placeholder="请选择施工立项"
              disabled={!selectedProjectId}
              loading={constructionsLoading}
              showSearch
              optionFilterProp="label"
              options={filteredConstructions.map((construction) => ({
                label: `${construction.name}（${construction.code}）`,
                value: construction.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="劳务班组"
            name="laborWorkerId"
            rules={[{ required: true, message: '请选择劳务班组' }]}
          >
            <Select
              placeholder="请选择劳务班组"
              loading={laborWorkersLoading}
              showSearch
              optionFilterProp="label"
              options={laborWorkers.map((worker) => ({
                label: `${worker.name}${worker.phone ? `（${worker.phone}）` : ''}`,
                value: worker.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="合同金额"
            name="contractAmount"
            rules={positiveAmountRules('合同金额')}
          >
            <InputNumber
              placeholder="请输入合同金额"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="签订日期" name="signDate" rules={[requiredDateRule('签订日期')]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="开始日期" name="startDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="结束日期" name="endDate" dependencies={['startDate']} rules={[endDateAfterStartRule(() => startDateValue)]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="合同状态" name="status">
            <Select placeholder="请选择合同状态" options={CONTRACT_STATUS_OPTIONS} />
          </Form.Item>

          <Form.Item label="劳务类型" name="laborType">
            <Input placeholder="请输入劳务类型" />
          </Form.Item>

          <Form.Item label="合同附件" name="attachmentUrl">
            <AttachmentField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <DetailModal
        title={detailData ? `劳务合同详情 · ${detailData.code}` : '劳务合同详情'}
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
          { key: 'code', label: '合同编号', value: getDisplayText(detailData?.code) },
          { key: 'name', label: '合同名称', value: getDisplayText(detailData?.name) },
          { key: 'projectName', label: '项目名称', value: getDisplayText(detailData?.projectName) },
          { key: 'constructionName', label: '施工立项', value: getDisplayText(detailData?.constructionName) },
          { key: 'laborWorkerName', label: '劳务班组', value: getDisplayText(detailData?.laborWorkerName) },
          { key: 'contractAmount', label: '合同金额', value: detailData ? fmtMoney(detailData.contractAmount) : getDisplayText() },
          { key: 'changedAmount', label: '变更金额', value: detailData ? fmtMoney(detailData.changedAmount) : getDisplayText() },
          { key: 'payableAmount', label: '合同应付金额', value: detailData ? fmtMoney(detailData.payableAmount) : getDisplayText() },
          { key: 'paidAmount', label: '合同已付金额', value: detailData ? fmtMoney(detailData.paidAmount) : getDisplayText() },
          { key: 'unpaidAmount', label: '合同未付金额', value: detailData ? fmtMoney(detailData.unpaidAmount) : getDisplayText() },
          { key: 'status', label: '合同执行状态', value: CONTRACT_STATUS_OPTIONS.find((item) => item.value === detailData?.status)?.label || getBusinessStatusLabel(detailData?.status) },
          { key: 'approvalStatus', label: '审批状态', value: detailData?.approvalStatus ? <ApprovalStatusTag status={detailData.approvalStatus} /> : '-' },
          { key: 'signDate', label: '签订日期', value: fmtDate(detailData?.signDate || null) },
          { key: 'startDate', label: '开始日期', value: fmtDate(detailData?.startDate || null) },
          { key: 'endDate', label: '结束日期', value: fmtDate(detailData?.endDate || null) },
          { key: 'laborType', label: '劳务类型', value: getDisplayText(detailData?.laborType) },
          { key: 'attachmentUrl', label: '合同附件', value: <AttachmentLink url={detailData?.attachmentUrl} /> },
          { key: 'createdAt', label: '登记时间', value: fmtDate(detailData?.createdAt || null) },
          { key: 'updatedAt', label: '最近更新时间', value: fmtDate(detailData?.updatedAt || null) },
          { key: 'remark', label: '备注', value: getDisplayText(detailData?.remark), span: 2 },
        ]}
        extra={detailData ? (
          <LedgerDetailExtra
            summaryItems={[
              { key: 'summary-contractAmount', label: '合同金额', value: fmtMoney(detailData.contractAmount) },
              { key: 'summary-changedAmount', label: '变更金额', value: fmtMoney(detailData.changedAmount ?? 0) },
              { key: 'summary-payableAmount', label: '合同应付', value: fmtMoney(detailData.payableAmount) },
              {
                key: 'summary-paidAmount',
                label: '合同已付',
                value: (
                  <Space size={4} wrap>
                    <span>{fmtMoney(detailData.paidAmount)}</span>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => window.open(buildLedgerRouteHref('/labor-payments', {
                        contractId: detailData.id,
                        projectId: detailData.projectId,
                      }), '_blank')}
                    >
                      查看付款台账
                    </Button>
                  </Space>
                ),
              },
              {
                key: 'summary-unpaidAmount',
                label: '合同未付',
                value: (
                  <Space size={4} wrap>
                    <span>{fmtMoney(detailData.unpaidAmount)}</span>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => window.open(buildLedgerRouteHref('/labor-payments', {
                        contractId: detailData.id,
                        projectId: detailData.projectId,
                      }), '_blank')}
                    >
                      查看付款台账
                    </Button>
                  </Space>
                ),
              },
              { key: 'summary-progress', label: '付款进度', value: getProgressText(detailData.paidAmount, detailData.payableAmount) },
            ]}
            summaryHint={joinDetailHints(
              getContractChangeHint(detailData.changedAmount),
              getExecutionStatusHint(detailData.status),
              getApprovalStatusHint(detailData.approvalStatus),
              getApprovalActionBoundaryHint(detailData.approvalStatus, '劳务合同'),
              '下一步可先看付款台账核对进度，再看最近付款流水和合同变更记录',
            )}
            actionBar={(
              <Space size="small" wrap>
                {detailData.recentFlows?.[0]?.id ? (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => { window.location.href = buildLedgerRouteHref('/labor-payments', {
                      contractId: detailData.id,
                      projectId: detailData.projectId,
                      detailId: detailData.recentFlows?.[0]?.id,
                      returnPath: buildLedgerRouteHref('/labor-contracts', {
                        projectId,
                        keyword,
                        approvalStatus,
                        startDate: formatContextDate(dateRange?.[0]),
                        endDate: formatContextDate(dateRange?.[1]),
                        detailId: detailData.id,
                      }),
                    }) }}
                  >
                    进入最新付款详情
                  </Button>
                ) : null}
                <Button
                  size="small"
                  type="link"
                  onClick={() => window.open(buildLedgerRouteHref('/labor-payments', {
                    contractId: detailData.id,
                    projectId: detailData.projectId,
                  }), '_blank')}
                >
                  查看关联付款台账
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
                <Button
                  size="small"
                  type="link"
                  onClick={() => { void loadContractDetail(detailData.id, false) }}
                >
                  刷新详情
                </Button>
                <ApprovalActions
                  id={detailData.id}
                  approvalStatus={detailData.approvalStatus}
                  resource="labor-contracts"
                  enableCancel
                  onSuccess={() => handleApprovalActionSuccess(detailData.id)}
                />
              </Space>
            )}
            changeTitle="合同变更记录"
            changes={detailData.changeRecords}
            changeEmptyText="当前合同暂无更多变更记录"
            flowTitle="最近付款流水"
            flows={detailData.recentFlows}
            activeFlowId={detailData.id}
            flowEmptyText="当前合同暂无付款流水"
            onFlowClick={(flow) => {
              if (flow.id) {
                window.location.href = buildLedgerRouteHref('/labor-payments', {
                  contractId: detailData.id,
                  projectId: detailData.projectId,
                  detailId: flow.id,
                  returnPath: buildLedgerRouteHref('/labor-contracts', {
                    projectId,
                    keyword,
                    approvalStatus,
                    startDate: formatContextDate(dateRange?.[0]),
                    endDate: formatContextDate(dateRange?.[1]),
                    detailId: detailData.id,
                  }),
                })
              }
            }}
          />
        ) : null}
      />
    </ConfigProvider>
  )
}
