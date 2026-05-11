'use client'

import { useCallback, useEffect, useState } from 'react'
import { Table, Input, Select, Button, Space, Spin, message, Card, Alert, Empty } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { MobileCardList } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * 操作日志项
 */
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

/**
 * 分页信息
 */
interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface LogFilters {
  keyword?: string
  action?: string | undefined
  resource?: string
}

function parseValidDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * 操作日志页面
 */
export default function ActionLogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  // 查询参数
  const [keyword, setKeyword] = useState('')
  const [action, setAction] = useState<string | undefined>()
  const [resource, setResource] = useState('')
  const [accessError, setAccessError] = useState<string | null>(null)
  const isMobile = useMobile()

  /**
   * 加载日志列表
   */
  const loadLogs = useCallback(async (page = 1, filters?: LogFilters) => {
    const nextKeyword = filters && 'keyword' in filters ? filters.keyword ?? '' : keyword
    const nextAction = filters && 'action' in filters ? filters.action : action
    const nextResource = filters && 'resource' in filters ? filters.resource ?? '' : resource

    try {
      setLoading(true)
      setAccessError(null)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('pageSize', '20')

      if (nextKeyword) {
        params.append('keyword', nextKeyword)
      }
      if (nextAction) {
        params.append('action', nextAction)
      }
      if (nextResource) {
        params.append('resource', nextResource)
      }

      const response = await fetch(`/api/action-logs?${params.toString()}`)
      const data = await response.json()

      if (response.status === 401) {
        setLogs([])
        setAccessError('未登录或登录已失效，请重新登录')
        return
      }

      if (response.status === 403) {
        setLogs([])
        setAccessError('仅系统管理员可访问操作日志')
        return
      }

      if (data.success) {
        setLogs(Array.isArray(data.logs) ? data.logs : [])
        setPagination(data.pagination)
      } else {
        setLogs([])
        message.error(data.error || '加载日志失败')
      }
    } catch (error) {
      console.error('加载日志失败:', error)
      setLogs([])
      message.error('加载日志失败')
    } finally {
      setLoading(false)
    }
  }, [action, keyword, resource])

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadLogs(1)
  }, [loadLogs])

  /**
   * 处理查询
   */
  const handleSearch = () => {
    loadLogs(1)
  }

  /**
   * 处理重置
   */
  const handleReset = () => {
    setKeyword('')
    setAction(undefined)
    setResource('')
    setPagination({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
    setLogs([])
    loadLogs(1, { keyword: '', action: undefined, resource: '' })
  }

  /**
   * 表格列定义
   */
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
      render: (text) => {
        const roleMap: Record<string, string> = {
          ADMIN: '管理员',
          FINANCE: '财务',
          PURCHASE: '采购',
          PROJECT_MANAGER: '项目经理',
          STAFF: '员工',
          UNKNOWN: '未知',
        }
        return <span>{roleMap[text] || text}</span>
      },
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 80,
      render: (text) => {
        const actionMap: Record<string, string> = {
          CREATE: '创建',
          UPDATE: '更新',
          DELETE: '删除',
        }
        return <span>{actionMap[text] || text}</span>
      },
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

  return (
    <div style={{ padding: '24px' }}>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>操作日志</h1>
      </div>

      {/* 查询区 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Space wrap>
            <Input
              placeholder="搜索用户名、资源、详情"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 200 }}
              onPressEnter={handleSearch}
            />

            <Select
              placeholder="选择动作"
              value={action}
              onChange={setAction}
              style={{ width: 120 }}
              allowClear
              options={[
                { label: '创建', value: 'CREATE' },
                { label: '更新', value: 'UPDATE' },
                { label: '删除', value: 'DELETE' },
              ]}
            />

            <Input
              placeholder="资源类型"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              style={{ width: 150 }}
              onPressEnter={handleSearch}
            />

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
            >
              查询
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              重置
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        {accessError ? (
          <Alert
            type="warning"
            showIcon
            message={accessError}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Spin spinning={loading}>
          {accessError ? (
            <Empty description={accessError} />
          ) : isMobile ? (
            <>
              <MobileCardList<ActionLog>
                data={logs}
                loading={false}
                getKey={(item) => item.id}
                getTitle={(item) => `${item.userName} · ${item.action === 'CREATE' ? '创建' : item.action === 'UPDATE' ? '更新' : item.action === 'DELETE' ? '删除' : item.action}`}
                getDescription={(item) => {
                  const date = parseValidDate(item.createdAt)
                  return date ? formatDistanceToNow(date, { locale: zhCN, addSuffix: true }) : '-'
                }}
                fields={[
                  { key: 'resource', label: '资源', render: (item) => item.resource || '-' },
                  { key: 'method', label: '方法', render: (item) => item.method || '-' },
                  { key: 'path', label: '路径', render: (item) => <span style={{ fontSize: 11, color: '#666', wordBreak: 'break-all' }}>{item.path || '-'}</span>, fullWidth: true },
                  { key: 'detail', label: '详情', render: (item) => item.detail || '-', fullWidth: true },
                ]}
              />
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button disabled={pagination.page <= 1} onClick={() => loadLogs(pagination.page - 1)} style={{ marginRight: 8 }}>上一页</Button>
                <span style={{ color: '#8c8c8c', fontSize: 13 }}>{pagination.page} / {pagination.totalPages || 1}</span>
                <Button disabled={pagination.page >= (pagination.totalPages || 1)} onClick={() => loadLogs(pagination.page + 1)} style={{ marginLeft: 8 }}>下一页</Button>
              </div>
            </>
          ) : (
            <Table
              columns={columns}
              dataSource={logs}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: false,
                onChange: (page) => loadLogs(page),
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}
