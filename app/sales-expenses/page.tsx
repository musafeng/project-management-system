'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface ExpenseItem { type: string; amount: number }
interface Expense {
  id: string; submitter: string; totalAmount: number; expenseItems: ExpenseItem[]
  expenseDate: string; attachmentUrl?: string; approvalStatus: string; remark?: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' }, APPROVED: { label: '已通过', color: 'green' }, REJECTED: { label: '已拒绝', color: 'red' },
}
function fmt(v: number) { return `¥${Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` }
function fmtDate(s: string) { try { return new Date(s).toLocaleDateString('zh-CN') } catch { return s } }

const EXPENSE_TYPES = ['烟酒费', '餐费', '饭局', '其他']

export default function SalesExpensesPage() {
  const [data, setData] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([{ type: '餐费', amount: 0 }])
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { const res = await fetch('/api/sales-expenses'); const j = await res.json(); if (j.success) setData(j.data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const handleOpen = (record?: Expense) => {
    setEditing(record || null)
    const its = record?.expenseItems?.length ? record.expenseItems : [{ type: '餐费', amount: 0 }]
    setItems(its)
    form.resetFields()
    if (record) form.setFieldsValue({ submitter: record.submitter, expenseDate: dayjs(record.expenseDate), remark: record.remark, attachmentUrl: record.attachmentUrl })
    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    const payload = { ...values, expenseDate: values.expenseDate?.format('YYYY-MM-DD'), expenseItems: items, totalAmount, projectId: values.projectId || 'default' }
    const url = editing ? `/api/sales-expenses/${editing.id}` : '/api/sales-expenses'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (json.success) { message.success(editing ? '更新成功' : '创建成功'); setModalOpen(false); load() }
    else message.error(json.error || '操作失败')
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/sales-expenses/${id}`, { method: 'DELETE' })
    const j = await res.json()
    if (j.success) { message.success('已删除'); load() } else message.error(j.error || '删除失败')
  }

  const columns: ColumnsType<Expense> = [
    { title: '报销人', dataIndex: 'submitter', width: 100 },
    { title: '总金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: v => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '日期', dataIndex: 'expenseDate', width: 110, render: fmtDate },
    { title: '审批状态', dataIndex: 'approvalStatus', width: 100, render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    { title: '操作', key: 'action', width: 120, fixed: 'right',
      render: (_, r) => (<Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleOpen(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="是" cancelText="否"><Button size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
      </Space>) },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>销售费用报销</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>新增</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 700 }} size="small" />
      <Modal title={editing ? '编辑销售费用报销' : '新增销售费用报销'} open={modalOpen} onOk={() => form.submit()} onCancel={() => setModalOpen(false)} width={560} okText="确定" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item label="报销人" name="submitter" rules={[{ required: true, message: '请填写报销人' }]}><Input /></Form.Item>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>费用明细 <span style={{ color: '#1677ff' }}>合计：{fmt(totalAmount)}</span></div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <Select value={item.type} onChange={v => setItems(its => its.map((x, i) => i === idx ? { ...x, type: v } : x))} options={EXPENSE_TYPES.map(t => ({ label: t, value: t }))} style={{ width: 100 }} />
                <InputNumber value={item.amount} onChange={v => setItems(its => its.map((x, i) => i === idx ? { ...x, amount: Number(v) || 0 } : x))} placeholder="金额" precision={2} min={0} style={{ flex: 1 }} />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setItems(its => its.filter((_, i) => i !== idx))} />
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setItems(its => [...its, { type: '餐费', amount: 0 }])}>添加明细</Button>
          </div>
          <Form.Item label="日期" name="expenseDate" rules={[{ required: true, message: '请选择日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="附件URL" name="attachmentUrl"><Input placeholder="请输入附件链接" /></Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

