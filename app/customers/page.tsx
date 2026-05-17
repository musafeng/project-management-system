'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Form,
  message,
  Popconfirm,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons'
import { requestApi } from '@/lib/client-request'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { isSystemManagerClientUser } from '@/lib/system-manager'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { EmptyHint, FilterBar, LedgerPageLayout, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'

interface Customer {
  id: string
  code: string
  name: string
  contact: string | null
  phone: string | null
  email?: string | null
  address?: string | null
  remark?: string | null
  status?: string
  createdAt: string
}

interface CustomerDetail extends Customer {
  taxId?: string | null
  bankAccount?: string | null
  bankName?: string | null
  remark?: string | null
  updatedAt?: string
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [form] = Form.useForm()
  const isMobile = useMobile()

  const loadCustomers = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const keyword = (filters.keyword as string)?.trim()
    if (keyword) params.append('keyword', keyword)

    const url = `/api/customers${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<Customer[]>(url, {
      fallbackError: '数据加载失败，请稍后重试',
    })

    if (result.success && result.data) {
      setCustomers(result.data)
    } else {
      setCustomers([])
      message.error(result.error || '数据加载失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setLastFilter(filters)
    loadCustomers(filters)
  }

  const handleReset = () => {
    setLastFilter({})
    loadCustomers({})
  }

  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditClick = async (id: string) => {
    const result = await requestApi<CustomerDetail>(`/api/customers/${id}`, {
      fallbackError: '获取客户信息失败，请稍后重试',
    })

    if (result.success && result.data) {
      setEditingId(id)
      form.setFieldsValue({
        name: result.data.name,
        contact: result.data.contact || undefined,
        phone: result.data.phone || undefined,
        remark: result.data.remark || undefined,
      })
      setIsModalVisible(true)
    } else {
      message.error(result.error || '获取客户信息失败，请稍后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/customers/${id}`, {
      method: 'DELETE',
      fallbackError: '删除失败，请稍后重试',
    })

    if (result.success) {
      message.success('客户已删除')
      loadCustomers(lastFilter)
    } else {
      message.error(result.error || '删除失败，请稍后重试')
    }
  }

  const handleSubmit = async (values: any) => {
    const url = editingId ? `/api/customers/${editingId}` : '/api/customers'
    const method = editingId ? 'PUT' : 'POST'

    const result = await requestApi(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
      fallbackError: editingId ? '更新客户失败，请稍后重试' : '创建客户失败，请稍后重试',
    })

    if (result.success) {
      message.success(editingId ? '客户已更新' : '客户已创建')
      setIsModalVisible(false)
      form.resetFields()
      loadCustomers(lastFilter)
    } else {
      message.error(result.error || (editingId ? '更新客户失败，请稍后重试' : '创建客户失败，请稍后重试'))
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const columns: ColumnsType<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      key: 'contact',
      width: 120,
      render: (text: string | null) => text || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text: string | null) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record.id)}
          >
            编辑
          </Button>
          {canDelete ? (
            <Popconfirm
              title="删除客户"
              description="确定删除该客户吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  const filterBar = (
    <FilterBar
      fields={[{ type: 'input', key: 'keyword', placeholder: '搜索客户名称' }]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
    />
  )

  const table = (
    <Table<Customer>
      rowKey="id"
      columns={columns}
      dataSource={customers}
      loading={loading}
      pagination={false}
      scroll={{ x: 800 }}
      size="small"
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无客户数据"
            desc="新增客户后，可在此管理客户的联系方式。"
            action={<Button type="primary" onClick={handleAddClick}>新增客户</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <MobileCardList<Customer>
      data={customers}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      fields={[
        { key: 'contact', label: '联系人', render: (item) => item.contact || '-' },
        { key: 'phone', label: '联系电话', render: (item) => item.phone || '-' },
        { key: 'address', label: '地址', render: (item) => item.address || '-', fullWidth: true },
        { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        { key: 'createdAt', label: '创建时间', render: (item) => formatDate(item.createdAt) },
      ]}
      actions={(record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record.id)}
          >
            编辑
          </Button>
          {canDelete ? (
            <Popconfirm
              title="删除客户"
              description="确定删除该客户吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      )}
      empty={(
        <EmptyHint
          icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
          title="暂无客户数据"
          desc="新增客户后，可在此管理客户的联系方式。"
          action={<Button type="primary" onClick={handleAddClick}>新增客户</Button>}
        />
      )}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="客户管理"
        desc="维护客户档案，跟踪联系方式与备注"
        createLabel="新增客户"
        onCreate={handleAddClick}
        total={customers.length}
        filterBar={filterBar}
        table={table}
        mobileTable={mobileCards}
      />

      <ResponsiveModalDrawer
        title={editingId ? '编辑客户' : '新增客户'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        width={500}
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
          <Form.Item
            label="客户名称"
            name="name"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input placeholder="请输入客户名称" />
          </Form.Item>

          <Form.Item label="联系人" name="contact">
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </ResponsiveModalDrawer>
    </>
  )
}
