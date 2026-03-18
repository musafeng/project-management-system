'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Tag, message, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons'

interface OrgUnit {
  id: string
  name: string
  code: string | null
  isActive: boolean
  remark: string | null
  members: { id: string; systemUser: { id: string; name: string; role: string } }[]
}

export default function OrgUnitsPage() {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchUnits = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/org-units', { credentials: 'include' })
      const json = await res.json()
      if (json.success) setUnits(json.data)
    } catch {
      message.error('加载组织列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUnits() }, [])

  const openCreate = () => {
    setEditingUnit(null)
    form.resetFields()
    form.setFieldValue('isActive', true)
    setModalOpen(true)
  }

  const openEdit = (unit: OrgUnit) => {
    setEditingUnit(unit)
    form.setFieldsValue({ name: unit.name, code: unit.code || '', isActive: unit.isActive, remark: unit.remark || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editingUnit) {
        const res = await fetch(`/api/org-units/${editingUnit.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          credentials: 'include', body: JSON.stringify(values),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        message.success('已更新')
      } else {
        const res = await fetch('/api/org-units', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'include', body: JSON.stringify(values),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        message.success('已创建')
      }
      setModalOpen(false)
      fetchUnits()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: '组织名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code', render: (v: string | null) => v || '-' },
    {
      title: '成员数',
      key: 'members',
      render: (_: any, r: OrgUnit) => (
        <Tag icon={<TeamOutlined />}>{r.members.length} 人</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: OrgUnit) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>组织单元管理</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增组织</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={units} columns={columns} pagination={false} size="middle" />

      <Modal
        title={editingUnit ? '编辑组织' : '新增组织'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="组织名称" rules={[{ required: true, message: '请输入组织名称' }]}>
            <Input placeholder="如：工程部、采购组" />
          </Form.Item>
          <Form.Item name="code" label="组织代码（可选）">
            <Input placeholder="如：ENG、PURCHASE" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          {editingUnit && (
            <Form.Item name="isActive" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

