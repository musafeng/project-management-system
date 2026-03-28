'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Drawer,
  Divider,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'

interface FormFieldItem {
  id: string
  formId: string
  label: string
  fieldKey: string
  componentType: string
  required: boolean
  optionsJson: string | null
  sortOrder: number
  createdAt: string
}

interface FormDefinitionItem {
  id: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
  fields: FormFieldItem[]
}

const COMPONENT_TYPE_OPTIONS = [
  { label: '单行输入框 (input)', value: 'input' },
  { label: '数字输入框 (number)', value: 'number' },
  { label: '日期选择 (date)', value: 'date' },
  { label: '下拉选择 (select)', value: 'select' },
  { label: '多行文本 (textarea)', value: 'textarea' },
]

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  input: '单行输入',
  number: '数字',
  date: '日期',
  select: '下拉选择',
  textarea: '多行文本',
}

export default function FormDefinitionsPage() {
  const [forms, setForms] = useState<FormDefinitionItem[]>([])
  const [loading, setLoading] = useState(true)

  // 表单定义 Modal
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<FormDefinitionItem | null>(null)
  const [formForm] = Form.useForm()

  // 字段管理 Drawer
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false)
  const [activeForm, setActiveForm] = useState<FormDefinitionItem | null>(null)

  // 字段 Modal
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<FormFieldItem | null>(null)
  const [fieldForm] = Form.useForm()
  const [fieldComponentType, setFieldComponentType] = useState<string>('input')

  const loadForms = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/form-definitions')
      const result = await res.json()
      if (result.success) {
        setForms(result.data || [])
      } else {
        message.error(result.error || '加载失败')
      }
    } catch {
      message.error('加载表单定义失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForms()
  }, [])

  // ---- 表单定义操作 ----

  const handleAddForm = () => {
    setEditingForm(null)
    formForm.resetFields()
    formForm.setFieldsValue({ isActive: true })
    setFormModalOpen(true)
  }

  const handleEditForm = (record: FormDefinitionItem) => {
    setEditingForm(record)
    formForm.setFieldsValue({
      name: record.name,
      code: record.code,
      isActive: record.isActive,
    })
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (values: any) => {
    try {
      if (editingForm) {
        const res = await fetch(`/api/form-definitions/${editingForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, isActive: values.isActive }),
        })
        const result = await res.json()
        if (result.success) {
          message.success('更新成功')
          setFormModalOpen(false)
          loadForms()
        } else {
          message.error(result.error || '更新失败')
        }
      } else {
        const res = await fetch('/api/form-definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const result = await res.json()
        if (result.success) {
          message.success('创建成功')
          setFormModalOpen(false)
          loadForms()
        } else {
          message.error(result.error || '创建失败')
        }
      }
    } catch {
      message.error('操作失败')
    }
  }

  // ---- 字段管理 ----

  const openFieldDrawer = (record: FormDefinitionItem) => {
    setActiveForm(record)
    setFieldDrawerOpen(true)
  }

  const refreshActiveForm = async (formId: string) => {
    try {
      const res = await fetch('/api/form-definitions')
      const result = await res.json()
      if (result.success) {
        const updated = (result.data as FormDefinitionItem[]).find((f) => f.id === formId)
        if (updated) setActiveForm(updated)
        setForms(result.data || [])
      }
    } catch {
      // ignore
    }
  }

  const handleAddField = () => {
    setEditingField(null)
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ required: false, sortOrder: 0, componentType: 'input' })
    setFieldComponentType('input')
    setFieldModalOpen(true)
  }

  const handleEditField = (field: FormFieldItem) => {
    setEditingField(field)
    fieldForm.setFieldsValue({
      label: field.label,
      fieldKey: field.fieldKey,
      componentType: field.componentType,
      required: field.required,
      optionsJson: field.optionsJson || '',
      sortOrder: field.sortOrder,
    })
    setFieldComponentType(field.componentType)
    setFieldModalOpen(true)
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!activeForm) return
    try {
      const res = await fetch(
        `/api/form-definitions/${activeForm.id}/fields/${fieldId}`,
        { method: 'DELETE' }
      )
      const result = await res.json()
      if (result.success) {
        message.success('字段已删除')
        refreshActiveForm(activeForm.id)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch {
      message.error('删除字段失败')
    }
  }

  const handleFieldSubmit = async (values: any) => {
    if (!activeForm) return
    try {
      if (editingField) {
        const res = await fetch(
          `/api/form-definitions/${activeForm.id}/fields/${editingField.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }
        )
        const result = await res.json()
        if (result.success) {
          message.success('字段已更新')
          setFieldModalOpen(false)
          refreshActiveForm(activeForm.id)
        } else {
          message.error(result.error || '更新失败')
        }
      } else {
        const res = await fetch(`/api/form-definitions/${activeForm.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const result = await res.json()
        if (result.success) {
          message.success('字段已添加')
          setFieldModalOpen(false)
          refreshActiveForm(activeForm.id)
        } else {
          message.error(result.error || '添加失败')
        }
      }
    } catch {
      message.error('操作失败')
    }
  }

  // ---- 表格列定义 ----

  const formColumns: ColumnsType<FormDefinitionItem> = [
    {
      title: '表单名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '表单代码',
      dataIndex: 'code',
      key: 'code',
      width: 220,
      render: (text: string) => (
        <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 3 }}>
          {text}
        </code>
      ),
    },
    {
      title: '字段数',
      key: 'fieldCount',
      width: 80,
      align: 'center',
      render: (_: any, record: FormDefinitionItem) => (
        <Tag color="blue">{record.fields?.length ?? 0}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>{active ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: FormDefinitionItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => openFieldDrawer(record)}
          >
            字段管理
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditForm(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  const fieldColumns: ColumnsType<FormFieldItem> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 60,
      align: 'center',
    },
    {
      title: '字段标签',
      dataIndex: 'label',
      key: 'label',
      width: 120,
    },
    {
      title: 'fieldKey',
      dataIndex: 'fieldKey',
      key: 'fieldKey',
      width: 150,
      render: (text: string) => (
        <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 3 }}>
          {text}
        </code>
      ),
    },
    {
      title: '控件类型',
      dataIndex: 'componentType',
      key: 'componentType',
      width: 110,
      render: (type: string) => <Tag>{COMPONENT_TYPE_LABELS[type] ?? type}</Tag>,
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      align: 'center',
      render: (v: boolean) => (v ? <Tag color="red">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: FormFieldItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditField(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该字段？"
            onConfirm={() => handleDeleteField(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* 标题 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1d1d1f' }}>
          表单配置管理
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddForm}>
          新增表单
        </Button>
      </div>

      {/* 表单定义列表 */}
      <Table<FormDefinitionItem>
        rowKey="id"
        columns={formColumns}
        dataSource={forms}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无表单配置，点击右上角新增' }}
      />

      {/* 新增/编辑表单定义 Modal */}
      <Modal
        title={editingForm ? '编辑表单' : '新增表单'}
        open={formModalOpen}
        onOk={() => formForm.submit()}
        onCancel={() => setFormModalOpen(false)}
        width={480}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={formForm}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="表单名称"
            name="name"
            rules={[{ required: true, message: '请输入表单名称' }]}
          >
            <Input placeholder="如：施工立项" />
          </Form.Item>
          <Form.Item
            label="表单代码"
            name="code"
            rules={[{ required: true, message: '请输入表单代码' }]}
            extra="创建后不可修改，需与业务模块 resourceType 保持一致"
          >
            <Input placeholder="如：construction-approvals" disabled={!!editingForm} />
          </Form.Item>
          <Form.Item label="状态" name="isActive" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 字段管理 Drawer */}
      <Drawer
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setFieldDrawerOpen(false)}
              size="small"
            />
            <span>{activeForm?.name} — 字段管理</span>
          </Space>
        }
        open={fieldDrawerOpen}
        onClose={() => setFieldDrawerOpen(false)}
        width={720}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
            新增字段
          </Button>
        }
      >
        {activeForm && (
          <>
            <div style={{ marginBottom: 12, color: '#888', fontSize: 13 }}>
              表单代码：<code>{activeForm.code}</code>
            </div>
            <Table<FormFieldItem>
              rowKey="id"
              columns={fieldColumns}
              dataSource={activeForm.fields}
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无字段，点击右上角新增' }}
            />
          </>
        )}
      </Drawer>

      {/* 新增/编辑字段 Modal */}
      <Modal
        title={editingField ? '编辑字段' : '新增字段'}
        open={fieldModalOpen}
        onOk={() => fieldForm.submit()}
        onCancel={() => setFieldModalOpen(false)}
        width={520}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={handleFieldSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="字段标签"
            name="label"
            rules={[{ required: true, message: '请输入字段标签' }]}
          >
            <Input placeholder="如：项目名称" />
          </Form.Item>
          <Form.Item
            label="字段Key（fieldKey）"
            name="fieldKey"
            rules={[{ required: true, message: '请输入 fieldKey' }]}
            extra="小驼峰命名，如 projectName，创建后建议不修改"
          >
            <Input placeholder="如：projectName" />
          </Form.Item>
          <Form.Item
            label="控件类型"
            name="componentType"
            rules={[{ required: true, message: '请选择控件类型' }]}
          >
            <Select
              options={COMPONENT_TYPE_OPTIONS}
              onChange={(val) => setFieldComponentType(val)}
            />
          </Form.Item>
          <Form.Item label="必填" name="required" valuePropName="checked">
            <Switch checkedChildren="必填" unCheckedChildren="选填" />
          </Form.Item>
          {fieldComponentType === 'select' && (
            <Form.Item
              label="选项（JSON）"
              name="optionsJson"
              extra={'格式：["选项A","选项B"] 或 [{"label":"A","value":"a"}]'}
            >
              <Input.TextArea rows={3} placeholder='["选项A","选项B"]' />
            </Form.Item>
          )}
          <Form.Item label="排序" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}




