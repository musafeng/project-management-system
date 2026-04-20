'use client'

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'

interface ExpenseItem {
  type: string
  amount: number
  remark?: string | null
  attachmentUrl?: string | null
}

interface Expense {
  id: string
  projectId?: string | null
  projectName?: string | null
  submitter: string
  totalAmount: number
  expenseItems: ExpenseItem[]
  expenseDate: string
  attachmentUrl?: string
  approvalStatus: string
  remark?: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已拒绝', color: 'red' },
}

const EXPENSE_TYPES = ['职工薪酬', '办公费', '交通费', '员工福利', '其他']

function fmt(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('zh-CN')
  } catch {
    return value
  }
}

export default function ManagementExpensesPage() {
  const [data, setData] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([{ type: '办公费', amount: 0 }])
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/management-expenses')
      const json = await response.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const handleOpen = (record?: Expense) => {
    setEditing(record || null)
    const nextItems = record?.expenseItems?.length ? record.expenseItems : [{ type: '办公费', amount: 0 }]
    setItems(nextItems)
    form.resetFields()

    if (record) {
      form.setFieldsValue({
        submitter: record.submitter,
        expenseDate: dayjs(record.expenseDate),
        attachmentUrl: record.attachmentUrl,
        remark: record.remark,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    if (items.length === 0 || totalAmount <= 0) {
      message.error('请至少填写一条有效费用明细')
      return
    }

    try {
      const payload = {
        ...values,
        expenseDate: values.expenseDate?.format('YYYY-MM-DD'),
        expenseItems: items,
      }

      const url = editing ? `/api/management-expenses/${editing.id}` : '/api/management-expenses'
      const method = editing ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await response.json()

      if (json.success) {
        message.success(editing ? '更新成功' : '创建成功')
        setModalOpen(false)
        void load()
        return
      }

      message.error(json.error || '操作失败')
    } catch (err) {
      console.error('提交管理费用报销失败:', err)
      message.error('提交失败，请检查表单后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/management-expenses/${id}`, { method: 'DELETE' })
    const json = await response.json()

    if (json.success) {
      message.success('已删除')
      void load()
      return
    }

    message.error(json.error || '删除失败')
  }

  const columns: ColumnsType<Expense> = [
    { title: '报销人', dataIndex: 'submitter', width: 120 },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{fmt(Number(value))}</span>,
    },
    { title: '日期', dataIndex: 'expenseDate', width: 120, render: fmtDate },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (value) => <Tag color={STATUS_MAP[value]?.color}>{STATUS_MAP[value]?.label || value}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpen(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>管理费用报销</h2>
        <Space>
          <Button onClick={() => { window.location.href = '/data-exports?resourceType=management-expenses' }}>导出数据</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>
            新增
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { label: '报销单数', value: data.length, color: '#8c8c8c', formatter: (v: number) => `${v} 单` },
          { label: '报销总金额', value: data.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0), color: '#ff4d4f', formatter: fmt },
        ].map((item) => (
          <div key={item.label} style={{ minWidth: 160, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: item.color, fontWeight: 700 }}>{item.formatter(item.value)}</div>
          </div>
        ))}
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 700 }} size="small" />

      <Modal
        title={editing ? '编辑管理费用报销' : '新增管理费用报销'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        width={620}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={handleFinishFailed}
          validateMessages={DEFAULT_FORM_VALIDATE_MESSAGES}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="报销人" name="submitter" rules={[{ required: true, message: '请填写报销人' }]}>
            <Input />
          </Form.Item>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              费用明细 <span style={{ color: '#1677ff' }}>合计：{fmt(totalAmount)}</span>
            </div>
            {items.map((item, index) => (
              <div key={index} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Select
                    value={item.type}
                    onChange={(value) =>
                      setItems((current) =>
                        current.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, type: value } : currentItem
                        )
                      )
                    }
                    options={EXPENSE_TYPES.map((type) => ({ label: type, value: type }))}
                    style={{ width: 140 }}
                  />
                  <InputNumber
                    value={item.amount}
                    onChange={(value) =>
                      setItems((current) =>
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
                    onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  />
                </div>
                <Input
                  value={item.remark || ''}
                  onChange={(e) =>
                    setItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, remark: e.target.value } : currentItem
                      )
                    )
                  }
                  placeholder="明细备注"
                  style={{ marginBottom: 8 }}
                />
                <AttachmentUploadField
                  value={item.attachmentUrl || null}
                  onChange={(value) =>
                    setItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, attachmentUrl: value } : currentItem
                      )
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setItems((current) => [...current, { type: '办公费', amount: 0, remark: '', attachmentUrl: null }])}
            >
              添加明细
            </Button>
          </div>

          <Form.Item label="日期" name="expenseDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="整单附件" name="attachmentUrl">
            <AttachmentUploadField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
