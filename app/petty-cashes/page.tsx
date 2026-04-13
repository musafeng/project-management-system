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

interface PettyCash {
  id: string
  projectId?: string | null
  projectName?: string | null
  holder: string
  applyReason?: string
  issuedAmount: number
  returnedAmount: number
  issueDate: string
  returnDate?: string
  status: string
  attachmentUrl?: string
  approvalStatus: string
  remark?: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已拒绝', color: 'red' },
}

const CASH_STATUS: Record<string, { label: string; color: string }> = {
  ISSUED: { label: '已发放', color: 'blue' },
  RETURNED: { label: '已退回', color: 'green' },
  PARTIAL: { label: '部分退回', color: 'orange' },
}

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

export default function PettyCashesPage() {
  const [data, setData] = useState<PettyCash[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PettyCash | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/petty-cashes')
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

  const handleOpen = (record?: PettyCash) => {
    setEditing(record || null)
    form.resetFields()

    if (record) {
      form.setFieldsValue({
        holder: record.holder,
        applyReason: record.applyReason,
        issuedAmount: record.issuedAmount,
        issueDate: dayjs(record.issueDate),
        attachmentUrl: record.attachmentUrl,
        remark: record.remark,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        issueDate: values.issueDate?.format('YYYY-MM-DD'),
      }

      const url = editing ? `/api/petty-cashes/${editing.id}` : '/api/petty-cashes'
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
      console.error('提交备用金申请失败:', err)
      message.error('提交失败，请检查表单后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/petty-cashes/${id}`, { method: 'DELETE' })
    const json = await response.json()

    if (json.success) {
      message.success('已删除')
      void load()
      return
    }

    message.error(json.error || '删除失败')
  }

  const total = data.reduce((sum, record) => sum + Number(record.issuedAmount || 0), 0)

  const columns: ColumnsType<PettyCash> = [
    { title: '申请人', dataIndex: 'holder', width: 100 },
    { title: '申请事由', dataIndex: 'applyReason', width: 180, render: (value) => value || '-' },
    {
      title: '申请金额',
      dataIndex: 'issuedAmount',
      width: 120,
      align: 'right',
      render: (value) => <span style={{ color: '#fa8c16', fontWeight: 600 }}>{fmt(Number(value))}</span>,
    },
    { title: '已退回', dataIndex: 'returnedAmount', width: 110, align: 'right', render: (value) => fmt(Number(value)) },
    { title: '日期', dataIndex: 'issueDate', width: 110, render: fmtDate },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => <Tag color={CASH_STATUS[value]?.color}>{CASH_STATUS[value]?.label || value}</Tag>,
    },
    {
      title: '审批',
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
        <h2 style={{ margin: 0 }}>备用金申请</h2>
        <Space>
          <span style={{ color: '#fa8c16', fontWeight: 600 }}>合计发放：{fmt(total)}</span>
          <Button onClick={() => window.open('/data-exports?resourceType=petty-cashes', '_blank')}>导出数据</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>
            新增
          </Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 920 }} size="small" />

      <Modal
        title={editing ? '编辑备用金申请' : '新增备用金申请'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        width={520}
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
          <Form.Item label="申请人" name="holder" rules={[{ required: true, message: '请填写申请人' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="申请事由" name="applyReason" rules={[{ required: true, message: '请填写申请事由' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="金额" name="issuedAmount" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0.01} />
          </Form.Item>

          <Form.Item label="日期" name="issueDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="附件" name="attachmentUrl">
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
