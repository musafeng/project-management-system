'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface OtherReceipt {
  id: string
  projectId: string
  projectName: string
  receiptType: string
  receiptAmount: number
  receiptDate: string
  attachmentUrl?: string
  approvalStatus: string
  remark?: string
  createdAt: string
}

interface Project { id: string; name: string }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已拒绝', color: 'red' },
}

function fmt(v: number) { return `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` }
function fmtDate(s: string) { try { return new Date(s).toLocaleDateString('zh-CN') } catch { return s } }

export default function OtherReceiptsPage() {
  const [data, setData] = useState<OtherReceipt[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OtherReceipt | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/other-receipts')
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    fetch('/api/projects').then(r => r.json()).then(j => { if (j.success) setProjects(j.data) })
  }, [])

  const handleOpen = (record?: OtherReceipt) => {
    setEditing(record || null)
    form.resetFields()
    if (record) {
      form.setFieldsValue({
        projectId: record.projectId,
        receiptType: record.receiptType,
        receiptAmount: record.receiptAmount,
        receiptDate: dayjs(record.receiptDate),
        remark: record.remark,
        attachmentUrl: record.attachmentUrl,
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = { ...values, receiptDate: values.receiptDate?.format('YYYY-MM-DD') }
    const url = editing ? `/api/other-receipts/${editing.id}` : '/api/other-receipts'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (json.success) {
      message.success(editing ? '更新成功' : '创建成功')
      setModalOpen(false)
      load()
    } else { message.error(json.error || '操作失败') }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/other-receipts/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) { message.success('已删除'); load() }
    else message.error(json.error || '删除失败')
  }

  // 合计
  const total = data.reduce((s, r) => s + Number(r.receiptAmount), 0)

  const columns: ColumnsType<OtherReceipt> = [
    { title: '项目', dataIndex: 'projectName', width: 150 },
    { title: '收款事由', dataIndex: 'receiptType', width: 150 },
    { title: '金额', dataIndex: 'receiptAmount', width: 120, align: 'right',
      render: v => <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '日期', dataIndex: 'receiptDate', width: 110, render: fmtDate },
    { title: '审批状态', dataIndex: 'approvalStatus', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    { title: '备注', dataIndex: 'remark', width: 150, render: v => v || '-' },
    { title: '操作', key: 'action', width: 120, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpen(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="是" cancelText="否">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>其他收款</h2>
        <Space>
          <span style={{ color: '#52c41a', fontWeight: 600 }}>合计：{fmt(total)}</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>新增</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 900 }} size="small" />
      <Modal title={editing ? '编辑其他收款' : '新增其他收款'} open={modalOpen}
        onOk={() => form.submit()} onCancel={() => setModalOpen(false)} width={560} okText="确定" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item label="关联项目" name="projectId">
            <Select placeholder="选择项目（可选）" allowClear options={projects.map(p => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item label="收款事由" name="receiptType" rules={[{ required: true, message: '请填写收款事由' }]}>
            <Input placeholder="请输入收款事由" />
          </Form.Item>
          <Form.Item label="金额" name="receiptAmount" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0.01} placeholder="请输入金额" />
          </Form.Item>
          <Form.Item label="日期" name="receiptDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="附件URL" name="attachmentUrl">
            <Input placeholder="请输入附件链接" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

