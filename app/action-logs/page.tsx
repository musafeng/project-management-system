'use client'

import { useEffect, useState } from 'react'
import { Table, Input, Select, Button, Space, Spin, message, Card } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
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

  /**
   * 加载日志列表
   */
  const loadLogs = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('pageSize', '20')

      if (keyword) {
        params.append('keyword', keyword)
      }
      if (action) {
        params.append('action', action)
      }
      if (resource) {
        params.append('resource', resource)
      }

      const response = await fetch(`/api/action-logs?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setPagination(data.pagination)
      } else {
        message.error(data.error || '加载日志失败')
      }
    } catch (error) {
      console.error('加载日志失败:', error)
      message.error('加载日志失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadLogs(1)
  }, [])

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
    loadLogs(1)
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
      render: (text) => <span style={{ fontSize: 12, color: '#666' }}>{text}</span>,
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
      render: (text) => (
        <span title={new Date(text).toLocaleString()}>
          {formatDistanceToNow(new Date(text), { locale: zhCN, addSuffix: true })}
        </span>
      ),
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
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              totalBoundaryShowSizeChanger: true,
              showSizeChanger: false,
              onChange: (page) => loadLogs(page),
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>
    </div>
  )
}

