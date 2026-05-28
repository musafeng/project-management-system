'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Form, Input, Switch, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, TeamOutlined, ApartmentOutlined } from '@ant-design/icons'
import { requestApi } from '@/lib/client-request'
import {
  LedgerPageLayout,
  MobileCardList,
  EmptyHint,
} from '@/components/ledger'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { useMobile } from '@/hooks/useMobile'

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
  const isMobile = useMobile()

  const fetchUnits = async () => {
    setLoading(true)
    const result = await requestApi<OrgUnit[]>('/api/org-units', {
      credentials: 'include',
      fallbackError: '加载组织列表失败，请稍后重试',
    })
    if (result.success) setUnits(result.data || [])
    else {
      setUnits([])
      message.error(result.error || '加载组织列表失败，请稍后重试')
    }
    setLoading(false)
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
    const result = await requestApi(editingUnit ? `/api/org-units/${editingUnit.id}` : '/api/org-units', {
      method: editingUnit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
      fallbackError: editingUnit ? '更新组织失败，请稍后重试' : '创建组织失败，请稍后重试',
    })
    if (result.success) {
      message.success(editingUnit ? '已更新' : '已创建')
      setModalOpen(false)
      fetchUnits()
    } else {
      message.error(result.error || (editingUnit ? '更新组织失败，请稍后重试' : '创建组织失败，请稍后重试'))
    }
    setSaving(false)
  }

  const columns = [
    { title: '组织名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code', render: (v: string | null) => v || '-' },
    {
      title: '成员数',
      key: 'members',
      render: (_: unknown, r: OrgUnit) => (
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
      render: (_: unknown, record: OrgUnit) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
        </Space>
      ),
    },
  ]

  const tableNode = (
    <Table<OrgUnit>
      rowKey="id"
      loading={loading}
      dataSource={units}
      columns={columns}
      pagination={false}
      size="middle"
      locale={{
        emptyText: loading ? <span /> : (
          <EmptyHint
            icon={<ApartmentOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="还没有任何组织单元"
            desc="新增组织后，可在此管理团队/部门划分与成员归属"
            action={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增组织</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <MobileCardList<OrgUnit>
      data={units}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      getStatus={(item) => (
        <Tag color={item.isActive ? 'green' : 'default'} style={{ marginRight: 0 }}>
          {item.isActive ? '启用' : '停用'}
        </Tag>
      )}
      fields={[
        { key: 'code', label: '组织代码', render: (item) => item.code || '-' },
        {
          key: 'members',
          label: '成员数',
          render: (item) => (
            <Tag icon={<TeamOutlined />} style={{ marginRight: 0 }}>{item.members.length} 人</Tag>
          ),
        },
        { key: 'remark', label: '备注', fullWidth: true, render: (item) => item.remark || '-' },
      ]}
      actions={(record) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
        </div>
      )}
      empty={(
        <EmptyHint
          icon={<ApartmentOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
          title="还没有任何组织单元"
          desc="新增组织后，可在此管理团队/部门划分与成员归属"
          action={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增组织</Button>}
        />
      )}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="组织单元管理"
        desc="维护团队 / 部门划分，用于成员归属与责任划分"
        total={units.length}
        onCreate={openCreate}
        createLabel="新增组织"
        table={tableNode}
        mobileTable={mobileCards}
      />

      <ResponsiveModalDrawer
        open={modalOpen}
        title={editingUnit ? '编辑组织' : '新增组织'}
        onOk={handleSave}
        onCancel={() => { if (!saving) setModalOpen(false) }}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={isMobile ? undefined : 520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: isMobile ? 4 : 16 }}>
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
      </ResponsiveModalDrawer>
    </>
  )
}
