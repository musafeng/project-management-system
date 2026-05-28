'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Form, Input, Switch, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { requestApi } from '@/lib/client-request'
import {
  LedgerPageLayout,
  MobileCardList,
  EmptyHint,
} from '@/components/ledger'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { useMobile } from '@/hooks/useMobile'

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
  const isMobile = useMobile()

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
      render: (_: unknown, record: Region) => (
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

  const tableNode = (
    <Table<Region>
      rowKey="id"
      loading={loading}
      dataSource={regions}
      columns={columns}
      pagination={false}
      size="middle"
      locale={{
        emptyText: loading ? <span /> : (
          <EmptyHint
            icon={<EnvironmentOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="还没有任何区域"
            desc="新增区域后，可在此管理项目所属区域与启用状态"
            action={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增区域</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <MobileCardList<Region>
      data={regions}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      getStatus={(item) => (
        <Tag color={item.isActive ? 'green' : 'default'} style={{ marginRight: 0 }}>
          {item.isActive ? '启用' : '停用'}
        </Tag>
      )}
      fields={[
        { key: 'code', label: '区域代码', render: (item) => item.code || '-' },
        { key: 'createdAt', label: '创建时间', render: (item) => new Date(item.createdAt).toLocaleDateString('zh-CN') },
      ]}
      actions={(record) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button
            size="small"
            danger={record.isActive}
            onClick={() => toggleActive(record)}
          >
            {record.isActive ? '停用' : '启用'}
          </Button>
        </div>
      )}
      empty={(
        <EmptyHint
          icon={<EnvironmentOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
          title="还没有任何区域"
          desc="新增区域后，可在此管理项目所属区域与启用状态"
          action={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增区域</Button>}
        />
      )}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="区域管理"
        desc="管理项目所属区域，影响项目的展示分组与责任划分"
        total={regions.length}
        onCreate={openCreate}
        createLabel="新增区域"
        table={tableNode}
        mobileTable={mobileCards}
      />

      <ResponsiveModalDrawer
        open={modalOpen}
        title={editingRegion ? '编辑区域' : '新增区域'}
        onOk={handleSave}
        onCancel={() => { if (!saving) setModalOpen(false) }}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={isMobile ? undefined : 520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: isMobile ? 4 : 16 }}>
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
      </ResponsiveModalDrawer>
    </>
  )
}
