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
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface DeductionItem {
  type: string
  amount: number
}

interface ContractReceipt {
  id: string
  contractId: string
  contractCode: string
  contractName: string
  projectName: string
  amount: number
  receiptDate: string
  deductionItems: DeductionItem[]
  attachmentUrl?: string | null
  approvalStatus?: string
  remark: string | null
  createdAt: string
}

interface ProjectContract {
  id: string
  code: string
  name: string
  projectId: string
  projectName: string
  contractAmount: number
  changedAmount: number
  receivableAmount: number
  receivedAmount: number
  unreceivedAmount: number
  signDate: string | null
  status: string
  createdAt: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const DEDUCTION_TYPES = ['税金', '手续费', '管理费', '其他']

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已拒绝', color: 'red' },
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function ContractReceiptsPage() {
  const [receipts, setReceipts] = useState<ContractReceipt[]>([])
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [contractId, setContractId] = useState<string | undefined>(undefined)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [deductionItems, setDeductionItems] = useState<DeductionItem[]>([])
  const [form] = Form.useForm()
  const selectedContractId = Form.useWatch('contractId', form)
  const selectedContract = contracts.find((item) => item.id === selectedContractId)

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

  const loadReceipts = async (searchContractId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchContractId) params.append('contractId', searchContractId)

      const url = `/api/contract-receipts${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<ContractReceipt[]> = await response.json()

      if (result.success && result.data) {
        setReceipts(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setReceipts([])
      }
    } catch (err) {
      console.error('加载收款记录列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContracts()
    loadReceipts()
  }, [])

  const handleSearch = () => {
    loadReceipts(contractId)
  }

  const handleReset = () => {
    setContractId(undefined)
    loadReceipts('')
  }

  const handleAddClick = () => {
    form.resetFields()
    setDeductionItems([])
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/contract-receipts/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('收款记录已删除')
        loadReceipts(contractId)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除收款记录失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        contractId: values.contractId,
        amount: values.amount,
        receiptDate: values.receiptDate ? values.receiptDate.format('YYYY-MM-DD') : null,
        deductionItems,
        attachmentUrl: values.attachmentUrl || null,
        remark: values.remark || null,
      }

      const response = await fetch('/api/contract-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('收款记录已创建')
        setIsModalVisible(false)
        form.resetFields()
        setDeductionItems([])
        loadReceipts(contractId)
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (err) {
      console.error('提交表单失败:', err)
      message.error('操作失败，请检查网络连接')
    }
  }

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
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
    },
    {
      title: '收款金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{formatCurrency(value)}</span>,
    },
    {
      title: '扣款明细',
      dataIndex: 'deductionItems',
      key: 'deductionItems',
      width: 220,
      render: (items: DeductionItem[]) =>
        items?.length
          ? items.map((item) => `${item.type}:${formatCurrency(item.amount)}`).join(' / ')
          : '-',
    },
    {
      title: '收款日期',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (status: string) =>
        status ? <Tag color={STATUS_MAP[status]?.color}>{STATUS_MAP[status]?.label || status}</Tag> : '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
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
          title="删除收款记录"
          description="确定删除该收款记录吗？"
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
                  label: `${contract.code} - ${contract.name}`,
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
                新增收款
              </Button>
            </Space>
          </div>

          <Table<ContractReceipt>
            rowKey="id"
            columns={columns}
            dataSource={receipts}
            loading={loading}
            pagination={false}
            scroll={{ x: 1400 }}
            size="small"
            locale={{
              emptyText: '暂无收款记录',
            }}
          />
        </div>
      </div>

      <Modal
        title="新增收款"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
          setDeductionItems([])
        }}
        width={640}
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
                label: `${contract.code} - ${contract.name}`,
                value: contract.id,
              }))}
            />
          </Form.Item>

          {selectedContract && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, lineHeight: 1.8, color: '#595959' }}>
              <div style={{ marginBottom: 6, fontWeight: 500, color: '#1d1d1f' }}>合同信息</div>
              <div>合同名称：{selectedContract.name}</div>
              <div>项目名称：{selectedContract.projectName}</div>
              <div>应收金额：{formatCurrency(selectedContract.receivableAmount)}</div>
              <div>已收金额：{formatCurrency(selectedContract.receivedAmount)}</div>
              <div>未收金额：{formatCurrency(selectedContract.unreceivedAmount)}</div>
            </div>
          )}

          <Form.Item
            label="收款金额"
            name="amount"
            rules={[
              { required: true, message: '请输入收款金额' },
              { type: 'number', min: 0, message: '收款金额必须大于 0' },
            ]}
          >
            <InputNumber
              placeholder="请输入收款金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
            />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>扣款明细</div>
            {deductionItems.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <Select
                  value={item.type}
                  onChange={(value) =>
                    setDeductionItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, type: value } : currentItem
                      )
                    )
                  }
                  options={DEDUCTION_TYPES.map((type) => ({ label: type, value: type }))}
                  style={{ width: 140 }}
                />
                <InputNumber
                  value={item.amount}
                  onChange={(value) =>
                    setDeductionItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, amount: Number(value) || 0 } : currentItem
                      )
                    )
                  }
                  placeholder="金额"
                  precision={2}
                  min={0}
                  style={{ flex: 1 }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setDeductionItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                />
              </div>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setDeductionItems((current) => [...current, { type: '税金', amount: 0 }])}
            >
              添加扣款明细
            </Button>
          </div>

          <Form.Item label="收款日期" name="receiptDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="附件URL" name="attachmentUrl">
            <Input placeholder="请输入附件链接" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
