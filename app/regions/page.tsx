'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { requestApi } from '@/lib/client-request'

interface Region {
  id: string
  name: string
  code: string | null
  isActive: boolean
  createdAt: string
}

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchRegions = async () => {
    setLoading(true)
    const result = await requestApi<Region[]>('/api/regions', {
      credentials: 'include',
      fallbackError: '加载区域列表失败，请稍后重试',
    })
    if (result.success) setRegions(result.data || [])
    else {
      setRegions([])
      message.error(result.error || '加载区域列表失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => { fetchRegions() }, [])

  const openCreate = () => {
    setEditingRegion(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (region: Region) => {
    setEditingRegion(region)
    form.setFieldsValue({ name: region.name, code: region.code || '', isActive: region.isActive })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const result = await requestApi(editingRegion ? `/api/regions/${editingRegion.id}` : '/api/regions', {
      method: editingRegion ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
      fallbackError: editingRegion ? '更新区域失败，请稍后重试' : '创建区域失败，请稍后重试',
    })
    if (result.success) {
      message.success(editingRegion ? '区域已更新' : '区域已创建')
      setModalOpen(false)
      fetchRegions()
    } else {
      message.error(result.error || (editingRegion ? '更新区域失败，请稍后重试' : '创建区域失败，请稍后重试'))
    }
    setSaving(false)
  }

  const toggleActive = async (region: Region) => {
    const result = await requestApi(`/api/regions/${region.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !region.isActive }),
      fallbackError: '更新区域状态失败，请稍后重试',
    })
    if (result.success) {
      message.success(region.isActive ? '已停用' : '已启用')
      fetchRegions()
    } else {
      message.error(result.error || '更新区域状态失败，请稍后重试')
    }
  }

  const columns = [
    { title: '区域名称', dataIndex: 'name', key: 'name' },
    { title: '区域代码', dataIndex: 'code', key: 'code', render: (v: string | null) => v || '-' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Region) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button
            size="small"
            danger={record.isActive}
            onClick={() => toggleActive(record)}
          >
            {record.isActive ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>区域管理</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增区域</Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={regions}
        columns={columns}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editingRegion ? '编辑区域' : '新增区域'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="区域名称" rules={[{ required: true, message: '请输入区域名称' }]}>
            <Input placeholder="例如：华南区、上海分部" />
          </Form.Item>
          <Form.Item name="code" label="区域代码（可选）">
            <Input placeholder="例如：SOUTH、SHANGHAI" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          {editingRegion && (
            <Form.Item name="isActive" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}



