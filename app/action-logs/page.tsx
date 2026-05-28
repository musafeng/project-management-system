'use client'

import { useCallback, useEffect, useState } from 'react'
import { Table, Button, Alert, Empty, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FileTextOutlined } from '@ant-design/icons'
import { requestApi } from '@/lib/client-request'
import { EmptyHint, FilterBar, LedgerPageLayout, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ActionLog {
  id: string
  userName: string
  userRole: string
  action: string
  resource: string
  resourceId: string | null
  method: string
  path: string
  detail: string | null
  createdAt: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理员',
  FINANCE: '财务',
  PURCHASE: '采购',
  PROJECT_MANAGER: '项目经理',
  STAFF: '员工',
  UNKNOWN: '未知',
}

function parseValidDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatRelativeTime(value: string) {
  const date = parseValidDate(value)
  return date ? formatDistanceToNow(date, { locale: zhCN, addSuffix: true }) : '-'
}

interface LogsResponse {
  success?: boolean
  logs?: ActionLog[]
  pagination?: PaginationInfo
  error?: string
}

export default function ActionLogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [accessError, setAccessError] = useState<string | null>(null)
  const isMobile = useMobile()

  const loadLogs = useCallback(async (page = 1, filters: FilterValues = lastFilter) => {
    const nextKeyword = (filters.keyword as string)?.trim() || ''
    const nextAction = (filters.action as string) || ''
    const nextResource = (filters.resource as string)?.trim() || ''

    setLoading(true)
    setAccessError(null)
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('pageSize', '20')
    if (nextKeyword) params.append('keyword', nextKeyword)
    if (nextAction) params.append('action', nextAction)
    if (nextResource) params.append('resource', nextResource)

    const result = await requestApi<unknown>(`/api/action-logs?${params.toString()}`, {
      fallbackError: '加载日志失败',
    })

    if (result.status === 401) {
      setLogs([])
      setAccessError('未登录或登录已失效，请重新登录')
      setLoading(false)
      return
    }

    if (result.status === 403) {
      setLogs([])
      setAccessError('仅系统管理员可访问操作日志')
      setLoading(false)
      return
    }

    const payload = result as ClientApiResponseLike
    if (result.success && Array.isArray(payload.logs)) {
      setLogs(payload.logs as ActionLog[])
      if (payload.pagination) {
        setPagination(payload.pagination as PaginationInfo)
      }
    } else {
      setLogs([])
      message.error(result.error || '加载日志失败')
    }
    setLoading(false)
  }, [lastFilter])

  useEffect(() => {
    loadLogs(1, {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setLastFilter(filters)
    loadLogs(1, filters)
  }

  const handleReset = () => {
    setLastFilter({})
    setPagination({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
    setLogs([])
    loadLogs(1, {})
  }

  const columns: ColumnsType<ActionLog> = [
    {
      title: '操作人',
      dataIndex: 'userName',
      key: 'userName',
      width: 100,
      render: (text) => <span>{text}</span>,
    },
    {
      title: '角色',
      dataIndex: 'userRole',
      key: 'userRole',
      width: 100,
      render: (text) => <span>{ROLE_LABEL[text] || text}</span>,
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 80,
      render: (text) => <span>{ACTION_LABEL[text] || text}</span>,
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 120,
      render: (text) => <span style={{ fontSize: 12, color: '#666' }}>{text || '-'}</span>,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 70,
      render: (text) => (
        <span
          style={{
            color:
              text === 'POST'
                ? '#52c41a'
                : text === 'PUT'
                  ? '#1890ff'
                  : text === 'DELETE'
                    ? '#ff4d4f'
                    : '#666',
            fontWeight: 'bold',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 200,
      render: (text) => <span style={{ fontSize: 12, color: '#666' }}>{text || '-'}</span>,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      render: (text) => <span>{text || '-'}</span>,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (text) => {
        const date = parseValidDate(text)
        if (!date) return <span>-</span>
        return (
          <span title={date.toLocaleString()}>
            {formatDistanceToNow(date, { locale: zhCN, addSuffix: true })}
          </span>
        )
      },
    },
  ]

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'input', key: 'keyword', placeholder: '搜索用户名 / 资源 / 详情' },
        {
          type: 'select',
          key: 'action',
          placeholder: '选择动作',
          options: [
            { label: '创建', value: 'CREATE' },
            { label: '更新', value: 'UPDATE' },
            { label: '删除', value: 'DELETE' },
          ],
          width: 140,
        },
        { type: 'input', key: 'resource', placeholder: '资源类型' },
      ]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
    />
  )

  const table = accessError ? (
    <>
      <Alert type="warning" showIcon message={accessError} style={{ marginBottom: 16 }} />
      <Empty description={accessError} />
    </>
  ) : (
    <Table<ActionLog>
      columns={columns}
      dataSource={logs}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{
        current: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: false,
        showTotal: (t) => `共 ${t} 条`,
        onChange: (page) => loadLogs(page, lastFilter),
      }}
      scroll={{ x: 1200 }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无操作日志"
            desc="系统操作发生后会在此处留下记录。"
          />
        ),
      }}
    />
  )

  const mobileTable = accessError ? (
    <>
      <Alert type="warning" showIcon message={accessError} style={{ marginBottom: 16 }} />
      <Empty description={accessError} />
    </>
  ) : (
    <>
      <MobileCardList<ActionLog>
        data={logs}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => ACTION_LABEL[item.action] || item.action || '操作日志'}
        getDescription={(item) => `操作人：${item.userName}（${ROLE_LABEL[item.userRole] || item.userRole || '-'}）`}
        fields={[
          {
            key: 'resource',
            label: '模块 / 对象',
            render: (item) => `${item.resource || '-'}${item.resourceId ? ` · ${item.resourceId}` : ''}`,
            fullWidth: true,
          },
          {
            key: 'createdAt',
            label: '操作时间',
            render: (item) => {
              const date = parseValidDate(item.createdAt)
              return date ? (
                <span title={date.toLocaleString()}>{formatRelativeTime(item.createdAt)}</span>
              ) : (
                '-'
              )
            },
            fullWidth: true,
          },
          {
            key: 'detail',
            label: '详情 / 备注',
            render: (item) => (
              <span style={{ wordBreak: 'break-all' }}>{item.detail || '-'}</span>
            ),
            fullWidth: true,
          },
        ]}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无操作日志"
            desc="系统操作发生后会在此处留下记录。"
          />
        }
      />
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button
          disabled={pagination.page <= 1 || loading}
          onClick={() => loadLogs(pagination.page - 1, lastFilter)}
          style={{ marginRight: 8 }}
        >
          上一页
        </Button>
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>
          {pagination.page} / {pagination.totalPages || 1}
        </span>
        <Button
          disabled={pagination.page >= (pagination.totalPages || 1) || loading}
          onClick={() => loadLogs(pagination.page + 1, lastFilter)}
          style={{ marginLeft: 8 }}
        >
          下一页
        </Button>
      </div>
    </>
  )

  return (
    <LedgerPageLayout
      title="操作日志"
      desc="只读查看系统的关键操作记录与责任人"
      total={pagination.total}
      filterBar={filterBar}
      table={table}
      mobileTable={mobileTable}
    />
  )
}

interface ClientApiResponseLike {
  logs?: unknown
  pagination?: unknown
}
