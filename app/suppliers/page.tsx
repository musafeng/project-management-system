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

interface Supplier {
  id: string
  code: string
  name: string
  contact: string | null
  phone: string | null
  address: string | null
  bankAccount?: string | null
  bankName?: string | null
  attachmentUrl?: string | null
  remark?: string | null
  createdAt: string
}

interface SupplierDetail extends Supplier {
  email?: string | null
  taxId?: string | null
  bankAccount?: string | null
  bankName?: string | null
  status?: string
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [form] = Form.useForm()
  const isMobile = useMobile()

  const loadSuppliers = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const keyword = (filters.keyword as string)?.trim()
    if (keyword) params.append('keyword', keyword)

    const url = `/api/suppliers${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<Supplier[]>(url, {
      fallbackError: '加载供应商列表失败，请稍后重试',
    })

    if (result.success && result.data) {
      setSuppliers(result.data)
    } else {
      setSuppliers([])
      message.error(result.error || '加载供应商列表失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSuppliers()
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setLastFilter(filters)
    loadSuppliers(filters)
  }

  const handleReset = () => {
    setLastFilter({})
    loadSuppliers({})
  }

  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditClick = async (id: string) => {
    const result = await requestApi<SupplierDetail>(`/api/suppliers/${id}`, {
      fallbackError: '获取供应商信息失败，请稍后重试',
    })

    if (result.success && result.data) {
      setEditingId(id)
      form.setFieldsValue({
        name: result.data.name,
        contact: result.data.contact || undefined,
        phone: result.data.phone || undefined,
        address: result.data.address || undefined,
        bankAccount: result.data.bankAccount || undefined,
        bankName: result.data.bankName || undefined,
        attachmentUrl: result.data.attachmentUrl || undefined,
        remark: result.data.remark || undefined,
      })
      setIsModalVisible(true)
    } else {
      message.error(result.error || '获取供应商信息失败，请稍后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/suppliers/${id}`, {
      method: 'DELETE',
      fallbackError: '删除供应商失败，请稍后重试',
    })

    if (result.success) {
      message.success('供应商已删除')
      loadSuppliers(lastFilter)
    } else {
      message.error(result.error || '删除供应商失败，请稍后重试')
    }
  }

  const handleSubmit = async (values: any) => {
    const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers'
    const method = editingId ? 'PUT' : 'POST'

    const result = await requestApi(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
      fallbackError: editingId ? '更新供应商失败，请稍后重试' : '创建供应商失败，请稍后重试',
    })

    if (result.success) {
      message.success(editingId ? '供应商已更新' : '供应商已创建')
      setIsModalVisible(false)
      form.resetFields()
      loadSuppliers(lastFilter)
    } else {
      message.error(result.error || (editingId ? '更新供应商失败，请稍后重试' : '创建供应商失败，请稍后重试'))
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const columns: ColumnsType<Supplier> = [
    {
      title: '供应商名称',
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
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      render: (text: string | null) => text || '-',
    },
    {
      title: '银行卡号',
      dataIndex: 'bankAccount',
      key: 'bankAccount',
      width: 180,
      render: (text: string | null | undefined) => text || '-',
    },
    {
      title: '开户行',
      dataIndex: 'bankName',
      key: 'bankName',
      width: 160,
      render: (text: string | null | undefined) => text || '-',
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
              title="删除供应商"
              description="确定删除该供应商吗？"
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
      fields={[{ type: 'input', key: 'keyword', placeholder: '搜索供应商名称' }]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
    />
  )

  const table = (
    <Table<Supplier>
      rowKey="id"
      columns={columns}
      dataSource={suppliers}
      loading={loading}
      pagination={false}
      scroll={{ x: 1000 }}
      size="small"
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无供应商数据"
            desc="新增供应商后，可在此管理联系方式与开户信息。"
            action={<Button type="primary" onClick={handleAddClick}>新增供应商</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <MobileCardList<Supplier>
      data={suppliers}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      fields={[
        { key: 'contact', label: '联系人', render: (item) => item.contact || '-' },
        { key: 'phone', label: '联系电话', render: (item) => item.phone || '-' },
        { key: 'bankAccount', label: '银行账号', render: (item) => item.bankAccount || '-', fullWidth: true },
        { key: 'bankName', label: '开户银行', render: (item) => item.bankName || '-', fullWidth: true },
        { key: 'address', label: '地址', render: (item) => item.address || '-', fullWidth: true },
        { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        { key: 'createdAt', label: '创建时间', render: (item) => formatDate(item.createdAt) },
      ]}
      actions={(record) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(record.id)}>编辑</Button>
          {canDelete ? (
            <Popconfirm title="删除供应商" description="确定删除该供应商吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          ) : null}
        </Space>
      )}
      empty={(
        <EmptyHint
          icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
          title="暂无供应商数据"
          desc="新增供应商后，可在此管理联系方式与开户信息。"
          action={<Button type="primary" onClick={handleAddClick}>新增供应商</Button>}
        />
      )}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="供应商管理"
        desc="维护供应商档案，跟踪联系方式与开户信息"
        createLabel="新增供应商"
        onCreate={handleAddClick}
        total={suppliers.length}
        filterBar={filterBar}
        table={table}
        mobileTable={mobileCards}
      />

      <ResponsiveModalDrawer
        title={editingId ? '编辑供应商' : '新增供应商'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        width={560}
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
            label="供应商名称"
            name="name"
            rules={[
              { required: true, message: '请输入供应商名称' },
              { max: 100, message: '供应商名称长度不能超过 100 个字符' },
            ]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item label="联系人" name="contact">
            <Input placeholder="请输入联系人" />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item label="地址" name="address">
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="银行卡号"
            name="bankAccount"
            rules={[{ required: true, message: '请输入银行卡号' }]}
          >
            <Input placeholder="请输入银行卡号" />
          </Form.Item>

          <Form.Item
            label="开户行"
            name="bankName"
            rules={[{ required: true, message: '请输入开户行' }]}
          >
            <Input placeholder="请输入开户行" />
          </Form.Item>

          <Form.Item label="附件URL" name="attachmentUrl">
            <Input placeholder="请输入附件链接" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </ResponsiveModalDrawer>
    </>
  )
}
