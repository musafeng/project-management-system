'use client'

import { useEffect, useState } from 'react'
import { Table, Tag, message, Input, Select, Button, Space, Spin } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'

/**
 * 项目汇总数据类型
 */
interface ProjectSummary {
  id: string
  code: string
  name: string
  customerName: string
  status: string
  startDate: string | null
  endDate: string | null

  // 收入统计
  contractReceivableAmount: number
  contractReceivedAmount: number
  contractUnreceivedAmount: number
  otherReceiptAmount: number
  totalIncomeAmount: number

  // 支出统计
  procurementPaidAmount: number
  laborPaidAmount: number
  subcontractPaidAmount: number
  projectExpenseAmount: number
  otherPaymentAmount: number
  managementExpenseAmount: number
  salesExpenseAmount: number
  totalExpenseAmount: number

  // 利润
  profitAmount: number

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

/**
 * 项目状态映射表
 */
const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNING: { label: '规划中', color: 'default' },
  APPROVED: { label: '已批准', color: 'processing' },
  IN_PROGRESS: { label: '进行中', color: 'processing' },
  SUSPENDED: { label: '暂停', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
}

/**
 * 格式化金额为人民币样式
 */
function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * 获取项目状态标签
 */
function getStatusTag(status: string) {
  const statusInfo = PROJECT_STATUS_MAP[status]
  if (statusInfo) {
    return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
  }
  return <Tag>{status}</Tag>
}

/**
 * 利润金额渲染（绿色正数，红色负数）
 */
function renderProfit(value: number) {
  const color = value >= 0 ? '#52c41a' : '#f5222d'
  return (
    <span style={{ color, fontWeight: 600 }}>
      {formatCurrency(value)}
    </span>
  )
}

/**
 * 普通金额渲染
 */
function renderAmount(value: number) {
  return <span>{formatCurrency(value)}</span>
}

export default function HomePage() {
  const [data, setData] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>(undefined)

  /**
   * 初始化钉钉容器
   */
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 检测是否在钉钉环境
    const isDingTalk = window.location.href.includes('dingtalk') || (window as any).dd

    if (isDingTalk) {
      try {
      const script = document.createElement('script')
      script.src = 'https://g.alicdn.com/dingding/dingtalk-pc-api/2.10.0/index.js'
      script.onload = () => {
        if ((window as any).dd?.ready) {
          ;(window as any).dd.ready(() => {
              try {
                ;(window as any).dd.biz.navigation.setTitle({
                  title: '项目收支总览',
                })
              } catch (err) {
                console.warn('钉钉导航设置失败:', err)
        }
            })
          }
        }
        script.onerror = () => {
          console.warn('钉钉 SDK 加载失败')
      }
      document.head.appendChild(script)
        return () => {
          try {
            document.head.removeChild(script)
          } catch (err) {
            // 忽略移除错误
          }
        }
      } catch (err) {
        console.warn('钉钉初始化失败:', err)
      }
    }
  }, [])

  /**
   * 加载数据
   */
  const loadData = async (searchKeyword?: string, searchStatus?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchKeyword) params.append('keyword', searchKeyword)
      if (searchStatus) params.append('status', searchStatus)

      const url = `/api/projects/summary${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<ProjectSummary[]> = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setData([])
      }
    } catch (err) {
      console.error('加载数据失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初次加载数据
   */
  useEffect(() => {
    loadData()
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    loadData(keyword, status)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    loadData('', undefined)
  }

  /**
   * 表格列定义
   */
  const columns: ColumnsType<ProjectSummary> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      fixed: 'left',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
    },
    {
      title: '项目状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (date: string | null) => date || '-',
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (date: string | null) => date || '-',
    },
    // 收入信息
    {
      title: '合同应收',
      dataIndex: 'contractReceivableAmount',
      key: 'contractReceivableAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '合同已收',
      dataIndex: 'contractReceivedAmount',
      key: 'contractReceivedAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '合同未收',
      dataIndex: 'contractUnreceivedAmount',
      key: 'contractUnreceivedAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '其他收款',
      dataIndex: 'otherReceiptAmount',
      key: 'otherReceiptAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '总收入',
      dataIndex: 'totalIncomeAmount',
      key: 'totalIncomeAmount',
      width: 130,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: '#1677ff', fontWeight: 600 }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    // 支出信息
    {
      title: '采购付款',
      dataIndex: 'procurementPaidAmount',
      key: 'procurementPaidAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '劳务付款',
      dataIndex: 'laborPaidAmount',
      key: 'laborPaidAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '分包付款',
      dataIndex: 'subcontractPaidAmount',
      key: 'subcontractPaidAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '项目费用',
      dataIndex: 'projectExpenseAmount',
      key: 'projectExpenseAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '其他付款',
      dataIndex: 'otherPaymentAmount',
      key: 'otherPaymentAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '管理费用',
      dataIndex: 'managementExpenseAmount',
      key: 'managementExpenseAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '销售费用',
      dataIndex: 'salesExpenseAmount',
      key: 'salesExpenseAmount',
      width: 130,
      align: 'right',
      render: renderAmount,
    },
    {
      title: '总支出',
      dataIndex: 'totalExpenseAmount',
      key: 'totalExpenseAmount',
      width: 130,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: '#ff7a45', fontWeight: 600 }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: '利润',
      dataIndex: 'profitAmount',
      key: 'profitAmount',
      width: 130,
      fixed: 'right',
      align: 'right',
      render: renderProfit,
    },
  ]

  return (
    <div
      style={{
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
          项目收支总览
        </h1>
      </div>

      {/* 筛选区 */}
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
            placeholder="输入项目名称搜索"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />

          <Select
            placeholder="选择项目状态"
            value={status || undefined}
            onChange={setStatus}
            allowClear
            style={{ width: 150 }}
            options={[
              { label: '规划中', value: 'PLANNING' },
              { label: '已批准', value: 'APPROVED' },
              { label: '进行中', value: 'IN_PROGRESS' },
              { label: '暂停', value: 'SUSPENDED' },
              { label: '已完成', value: 'COMPLETED' },
              { label: '已取消', value: 'CANCELLED' },
            ]}
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
            loading={loading}
          >
            重置
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Spin spinning={loading}>
        <Table<ProjectSummary>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={false}
          pagination={false}
          scroll={{ x: 2800 }}
          size="small"
          locale={{
            emptyText: '暂无项目数据',
        }}
        />
      </Spin>

      {/* 数据统计摘要 */}
      {data.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: '12px 16px',
            background: '#fafafa',
            borderRadius: 6,
            border: '1px solid #f0f0f0',
              display: 'flex',
            gap: '40px',
            fontSize: 13,
            color: '#595959',
            }}
          >
          <div>
            <span style={{ marginRight: 8 }}>项目总数：</span>
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{data.length}</span>
          </div>
          <div>
            <span style={{ marginRight: 8 }}>总收入：</span>
            <span style={{ fontWeight: 600, color: '#1677ff' }}>
              {formatCurrency(
                data.reduce((sum, item) => sum + item.totalIncomeAmount, 0)
              )}
            </span>
          </div>
          <div>
            <span style={{ marginRight: 8 }}>总支出：</span>
            <span style={{ fontWeight: 600, color: '#ff7a45' }}>
              {formatCurrency(
                data.reduce((sum, item) => sum + item.totalExpenseAmount, 0)
              )}
            </span>
          </div>
          <div>
            <span style={{ marginRight: 8 }}>总利润：</span>
            <span
              style={{
                fontWeight: 600,
                color:
                  data.reduce((sum, item) => sum + item.profitAmount, 0) >= 0
                    ? '#52c41a'
                    : '#f5222d',
              }}
            >
              {formatCurrency(
                data.reduce((sum, item) => sum + item.profitAmount, 0)
              )}
            </span>
          </div>
            </div>
          )}
        </div>
  )
}
