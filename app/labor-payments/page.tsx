'use client'

import { useEffect, useState } from 'react'
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
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

/**
 * 劳务付款数据类型
 */
interface LaborPayment {
  id: string
  contractCode: string
  projectName: string
  laborWorkerName: string
  amount: number
  paymentDate: string
  remark: string | null
  createdAt: string
}

/**
 * 劳务合同数据类型
 */
interface LaborContract {
  id: string
  code: string
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

/**
 * 格式化日期
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

/**
 * 格式化金额
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function LaborPaymentsPage() {
  const [payments, setPayments] = useState<LaborPayment[]>([])
  const [contracts, setContracts] = useState<LaborContract[]>([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [contractId, setContractId] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

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
  const loadPayments = async (searchContractId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchContractId) params.append('contractId', searchContractId)

      const url = `/api/labor-payments${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<LaborPayment[]> = await response.json()

      if (result.success && result.data) {
        setPayments(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setPayments([])
      }
    } catch (err) {
      console.error('加载劳务付款列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初次加载数据
   */
  useEffect(() => {
    loadContracts()
    loadPayments()
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    loadPayments(contractId)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    setContractId(undefined)
    loadPayments(undefined)
  }

  /**
   * 打开新增弹窗
   */
  const handleAddClick = () => {
    form.resetFields()
    setIsModalVisible(true)
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
        message.success('劳务付款记录已删除')
        loadPayments(contractId)
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
        remark: values.remark || null,
      }

      const response = await fetch('/api/labor-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('劳务付款记录已创建')
        setIsModalVisible(false)
        form.resetFields()
        loadPayments(contractId)
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (err) {
      console.error('提交表单失败:', err)
      message.error('操作失败，请检查网络连接')
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
    },
    {
      title: '付款金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '付款日期',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      render: (text: string | null) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm
          title="删除劳务付款"
          description="确定删除该劳务付款记录吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
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
              <Select
                placeholder="选择合同"
                value={contractId || undefined}
                onChange={setContractId}
                allowClear
                style={{ width: 250 }}
                loading={contractsLoading}
                options={contracts.map((contract) => ({
                  label: `${contract.code} - ${contract.projectName}`,
                  value: contract.id,
                }))}
              />

              <Button type="primary" onClick={handleSearch} loading={loading}>
                查询
              </Button>

              <Button onClick={handleReset} loading={loading}>
                重置
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
            pagination={false}
            scroll={{ x: 1200 }}
            size="small"
            locale={{
              emptyText: '暂无劳务付款数据',
            }}
          />
        </div>
      </div>

      {/* 新增付款弹窗 */}
      <Modal
        title="新增劳务付款"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
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
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="合同"
            name="contractId"
            rules={[{ required: true, message: '请选择合同' }]}
          >
            <Select
              placeholder="请选择合同"
              loading={contractsLoading}
              options={contracts.map((contract) => ({
                label: `${contract.code} - ${contract.projectName}`,
                value: contract.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="付款金额"
            name="amount"
            rules={[
              { required: true, message: '请输入付款金额' },
              { type: 'number', min: 0, message: '付款金额必须大于 0' },
            ]}
          >
            <InputNumber
              placeholder="请输入付款金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item label="付款日期" name="paymentDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}

