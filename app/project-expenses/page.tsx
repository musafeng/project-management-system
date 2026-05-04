'use client'

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { ApprovalActions, ApprovalStatusTag } from '@/components/ApprovalActions'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import { canUseAsApprovedUpstream, isApprovalLocked } from '@/lib/approval-status'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'

interface ExpenseItem {
  type: string
  amount: number
  remark?: string | null
  attachmentUrl?: string | null
}

interface Expense {
  id: string
  projectId: string
  projectName: string
  constructionId?: string | null
  constructionName?: string | null
  submitter: string
  totalAmount: number
  expenseItems: ExpenseItem[]
  expenseDate: string
  attachmentUrl?: string
  approvalStatus: string
  approvedAt?: string | null
  remark?: string
  createdAt: string
}

interface ConstructionApproval {
  id: string
  name: string
  projectName: string
  approvalStatus: string
  approvedAt?: string | null
}

function fmt(v: number) {
  return `¥${Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('zh-CN')
  } catch {
    return s
  }
}

const EXPENSE_TYPES = ['辅料', '人工', '材料']

export default function ProjectExpensesPage() {
  const [data, setData] = useState<Expense[]>([])
  const [constructions, setConstructions] = useState<ConstructionApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([{ type: '材料', amount: 0 }])
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/project-expenses')
      const j = await res.json()
      if (j.success) setData(j.data)
    } finally {
      setLoading(false)
    }
  }

  const loadConstructions = async () => {
    const res = await fetch('/api/construction-approvals')
    const json = await res.json()
    if (json.success) {
      setConstructions(
        (json.data || []).filter((item: ConstructionApproval) => canUseAsApprovedUpstream(item))
      )
    }
  }

  useEffect(() => {
    load()
    loadConstructions()
  }, [])

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const selectedConstructionId = Form.useWatch('constructionId', form)
  const selectedConstruction = useMemo(
    () => constructions.find((item) => item.id === selectedConstructionId),
    [constructions, selectedConstructionId]
  )

  useEffect(() => {
    if (selectedConstruction) {
      form.setFieldValue('projectName', selectedConstruction.projectName)
    } else if (!editing) {
      form.setFieldValue('projectName', undefined)
    }
  }, [selectedConstruction, editing, form])

  const handleOpen = (record?: Expense) => {
    setEditing(record || null)
    const its = record?.expenseItems?.length ? record.expenseItems : [{ type: '材料', amount: 0 }]
    setItems(its)
    form.resetFields()
    if (record) {
      form.setFieldsValue({
        constructionId: record.constructionId,
        projectName: record.projectName,
        submitter: record.submitter,
        expenseDate: dayjs(record.expenseDate),
        remark: record.remark,
        attachmentUrl: record.attachmentUrl,
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
        totalAmount,
      }
      const url = editing ? `/api/project-expenses/${editing.id}` : '/api/project-expenses'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.success) {
        message.success(editing ? '更新成功' : '创建成功')
        setModalOpen(false)
        void load()
      } else {
        message.error(json.error || '操作失败')
      }
    } catch (err) {
      console.error('提交项目费用报销失败:', err)
      message.error('提交失败，请检查表单后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/project-expenses/${id}`, { method: 'DELETE' })
    const j = await res.json()
    if (j.success) {
      message.success('已删除')
      void load()
    } else {
      message.error(j.error || '删除失败')
    }
  }

  const columns: ColumnsType<Expense> = [
    { title: '施工立项', dataIndex: 'constructionName', width: 160, render: (value) => value || '-' },
    { title: '项目', dataIndex: 'projectName', width: 150 },
    { title: '报销人', dataIndex: 'submitter', width: 100 },
    { title: '总金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: v => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: '日期', dataIndex: 'expenseDate', width: 110, render: fmtDate },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (value, record) => <ApprovalStatusTag status={value || 'DRAFT'} approvedAt={record.approvedAt} />,
    },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right',
      render: (_, r) => {
        const locked = isApprovalLocked(r)

        return (
          <Space size="small" wrap>
            <Button size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(r)}>编辑</Button>
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="是" cancelText="否">
              <Button size="small" danger icon={<DeleteOutlined />} disabled={locked}>删除</Button>
            </Popconfirm>
            <ApprovalActions
              id={r.id}
              approvalStatus={r.approvalStatus || 'DRAFT'}
              approvedAt={r.approvedAt}
              resource="project-expenses"
              onSuccess={() => void load()}
            />
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>项目费用报销</h2>
        <Space>
          <Button onClick={() => { window.location.href = '/data-exports?resourceType=project-expenses' }}>导出数据</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>新增</Button>
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
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 920 }} size="small" />
      <Modal title={editing ? '编辑项目费用报销' : '新增项目费用报销'} open={modalOpen} onOk={() => form.submit()} onCancel={() => setModalOpen(false)} width={620} okText="确定" cancelText="取消">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={handleFinishFailed}
          validateMessages={DEFAULT_FORM_VALIDATE_MESSAGES}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="施工立项" name="constructionId" rules={[{ required: true, message: '请选择施工立项' }]}>
            <Select
              placeholder="请选择已审批通过的施工立项"
              options={constructions.map((item) => ({
                label: `${item.name} / ${item.projectName}`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="关联项目" name="projectName">
            <Input placeholder="将根据施工立项自动带出" disabled />
          </Form.Item>
          <Form.Item label="报销人" name="submitter" rules={[{ required: true, message: '请填写报销人' }]}>
            <Input placeholder="请输入报销人" />
          </Form.Item>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>费用明细 <span style={{ color: '#1677ff' }}>合计：{fmt(totalAmount)}</span></div>
            {items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Select value={item.type} onChange={v => setItems(its => its.map((x, i) => i === idx ? { ...x, type: v } : x))} options={EXPENSE_TYPES.map(t => ({ label: t, value: t }))} style={{ width: 120 }} />
                  <InputNumber value={item.amount} onChange={v => setItems(its => its.map((x, i) => i === idx ? { ...x, amount: Number(v) || 0 } : x))} placeholder="金额" precision={2} min={0} style={{ flex: 1 }} />
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setItems(its => its.filter((_, i) => i !== idx))} />
                </div>
                <Input
                  value={item.remark || ''}
                  onChange={(e) => setItems(its => its.map((x, i) => i === idx ? { ...x, remark: e.target.value } : x))}
                  placeholder="明细备注"
                  style={{ marginBottom: 8 }}
                />
                <AttachmentUploadField
                  value={item.attachmentUrl || null}
                  onChange={(value) => setItems(its => its.map((x, i) => i === idx ? { ...x, attachmentUrl: value } : x))}
                />
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setItems(its => [...its, { type: '材料', amount: 0, remark: '', attachmentUrl: null }])}>添加明细</Button>
          </div>
          <Form.Item label="日期" name="expenseDate" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="整单附件" name="attachmentUrl"><AttachmentUploadField /></Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
