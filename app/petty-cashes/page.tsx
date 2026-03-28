'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface PettyCash {
  id: string; projectId: string; projectName: string
  holder: string; applyReason?: string; issuedAmount: number; returnedAmount: number
  issueDate: string; returnDate?: string; status: string
  attachmentUrl?: string; approvalStatus: string; remark?: string
}
interface Project { id: string; name: string }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' }, APPROVED: { label: '已通过', color: 'green' }, REJECTED: { label: '已拒绝', color: 'red' },
}
const CASH_STATUS: Record<string, { label: string; color: string }> = {
  ISSUED: { label: '已发放', color: 'blue' }, RETURNED: { label: '已退回', color: 'green' }, PARTIAL: { label: '部分退回', color: 'orange' },
}
function fmt(v: number) { return `¥${Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` }
function fmtDate(s: string) { try { return new Date(s).toLocaleDateString('zh-CN') } catch { return s } }

export default function PettyCashesPage() {
  const [data, setData] = useState<PettyCash[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PettyCash | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { const res = await fetch('/api/petty-cashes'); const j = await res.json(); if (j.success) setData(j.data) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    load()
    fetch('/api/projects').then(r => r.json()).then(j => { if (j.success) setProjects(j.data) })
  }, [])

  const handleOpen = (record?: PettyCash) => {
    setEditing(record || null)
    form.resetFields()
    if (record) form.setFieldsValue({
      projectId: record.projectId, holder: record.holder, applyReason: record.applyReason,
      issuedAmount: record.issuedAmount, issueDate: dayjs(record.issueDate),
      remark: record.remark, attachmentUrl: record.attachmentUrl,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = { ...values, issueDate: values.issueDate?.format('YYYY-MM-DD') }
    const url = editing ? `/api/petty-cashes/${editing.id}` : '/api/petty-cashes'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (json.success) { message.success(editing ? '更新成功' : '创建成功'); setModalOpen(false); load() }
    else message.error(json.error || '操作失败')
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/petty-cashes/${id}`, { method: 'DELETE' })
    const j = await res.json()
    if (j.success) { message.success('已删除'); load() } else message.error(j.error || '删除失败')
  }

  const total = data.reduce((s, r) => s + Number(r.issuedAmount), 0)

  const columns: ColumnsType<PettyCash> = [
    { title: '项目', dataIndex: 'projectName', width: 150 },
    { title: '申请人', dataIndex: 'holder', width: 100 },
    { title: '申请事由', dataIndex: 'applyReason', width: 150, render: v => v || '-' },
    { title: '申请金额', dataIndex: 'issuedAmount', width: 120, align: 'right', render: v => <span style={{ color: '#fa8c16', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '已退回', dataIndex: 'returnedAmount', width: 110, align: 'right', render: v => fmt(v) },
    { title: '日期', dataIndex: 'issueDate', width: 110, render: fmtDate },
    { title: '状态', dataIndex: 'status', width: 100, render: v => <Tag color={CASH_STATUS[v]?.color}>{CASH_STATUS[v]?.label || v}</Tag> },
    { title: '审批', dataIndex: 'approvalStatus', width: 100, render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    { title: '操作', key: 'action', width: 120, fixed: 'right',
      render: (_, r) => (<Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleOpen(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="是" cancelText="否"><Button size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
      </Space>) },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>备用金申请</h2>
        <Space>
          <span style={{ color: '#fa8c16', fontWeight: 600 }}>合计发放：{fmt(total)}</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>新增</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1000 }} size="small" />
      <Modal title={editing ? '编辑备用金申请' : '新增备用金申请'} open={modalOpen} onOk={() => form.submit()} onCancel={() => setModalOpen(false)} width={520} okText="确定" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item label="关联项目" name="projectId" rules={[{ required: true, message: '请选择项目' }]}>
            <Select placeholder="选择项目" options={projects.map(p => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item label="申请人" name="holder" rules={[{ required: true, message: '请填写申请人' }]}><Input /></Form.Item>
          <Form.Item label="申请事由" name="applyReason" rules={[{ required: true, message: '请填写申请事由' }]}><Input /></Form.Item>
          <Form.Item label="金额" name="issuedAmount" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0.01} />
          </Form.Item>
          <Form.Item label="日期" name="issueDate" rules={[{ required: true, message: '请选择日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="附件URL" name="attachmentUrl"><Input placeholder="请输入附件链接" /></Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

