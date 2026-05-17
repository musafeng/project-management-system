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

interface LaborWorker {
  id: string
  code: string
  name: string
  phone: string | null
  idNumber?: string | null
  address?: string | null
  bankAccount?: string | null
  bankName?: string | null
  attachmentUrl?: string | null
  remark?: string | null
  createdAt: string
}

interface LaborWorkerDetail extends LaborWorker {
  idNumber?: string | null
  address?: string | null
  bankAccount?: string | null
  bankName?: string | null
  status?: string
  remark?: string | null
  updatedAt?: string
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

export default function LaborWorkersPage() {
  const [workers, setWorkers] = useState<LaborWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [form] = Form.useForm()
  const isMobile = useMobile()

  const loadWorkers = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const keyword = (filters.keyword as string)?.trim()
    if (keyword) params.append('keyword', keyword)

    const url = `/api/labor-workers${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<LaborWorker[]>(url, {
      fallbackError: '数据加载失败，请稍后重试',
    })

    if (result.success && result.data) {
      setWorkers(result.data)
    } else {
      setWorkers([])
      message.error(result.error || '数据加载失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadWorkers()
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setLastFilter(filters)
    loadWorkers(filters)
  }

  const handleReset = () => {
    setLastFilter({})
    loadWorkers({})
  }

  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditClick = async (id: string) => {
    const result = await requestApi<LaborWorkerDetail>(`/api/labor-workers/${id}`, {
      fallbackError: '获取劳务人员信息失败，请稍后重试',
    })

    if (result.success && result.data) {
      setEditingId(id)
      form.setFieldsValue({
        name: result.data.name,
        phone: result.data.phone || undefined,
        idNumber: result.data.idNumber || undefined,
        address: result.data.address || undefined,
        bankAccount: result.data.bankAccount || undefined,
        bankName: result.data.bankName || undefined,
        attachmentUrl: result.data.attachmentUrl || undefined,
        remark: result.data.remark || undefined,
      })
      setIsModalVisible(true)
    } else {
      message.error(result.error || '获取劳务人员信息失败，请稍后重试')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/labor-workers/${id}`, {
      method: 'DELETE',
      fallbackError: '删除失败，请稍后重试',
    })

    if (result.success) {
      message.success('劳务人员已删除')
      loadWorkers(lastFilter)
    } else {
      message.error(result.error || '删除失败，请稍后重试')
    }
  }

  const handleSubmit = async (values: any) => {
    const url = editingId ? `/api/labor-workers/${editingId}` : '/api/labor-workers'
    const method = editingId ? 'PUT' : 'POST'

    const payload = {
      name: values.name,
      phone: values.phone || null,
      idNumber: values.idNumber || null,
      address: values.address || null,
      bankAccount: values.bankAccount || null,
      bankName: values.bankName || null,
      attachmentUrl: values.attachmentUrl || null,
      remark: values.remark || null,
    }

    const result = await requestApi(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      fallbackError: editingId ? '更新劳务人员失败，请稍后重试' : '创建劳务人员失败，请稍后重试',
    })

    if (result.success) {
      message.success(editingId ? '劳务人员已更新' : '劳务人员已创建')
      setIsModalVisible(false)
      form.resetFields()
      loadWorkers(lastFilter)
    } else {
      message.error(result.error || (editingId ? '更新劳务人员失败，请稍后重试' : '创建劳务人员失败，请稍后重试'))
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const columns: ColumnsType<LaborWorker> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text: string | null) => text || '-',
    },
    {
      title: '身份证号',
      dataIndex: 'idNumber',
      key: 'idNumber',
      width: 180,
      render: (text: string | null | undefined) => text || '-',
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
              title="删除劳务人员"
              description="确定删除该劳务人员吗？"
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
      fields={[{ type: 'input', key: 'keyword', placeholder: '搜索劳务人员姓名' }]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
    />
  )

  const table = (
    <Table<LaborWorker>
      rowKey="id"
      columns={columns}
      dataSource={workers}
      loading={loading}
      pagination={false}
      scroll={{ x: 1100 }}
      size="small"
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无劳务人员数据"
            desc="新增劳务人员后，可在此管理身份证与开户信息。"
            action={<Button type="primary" onClick={handleAddClick}>新增劳务人员</Button>}
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <MobileCardList<LaborWorker>
      data={workers}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      fields={[
        { key: 'phone', label: '联系电话', render: (item) => item.phone || '-' },
        { key: 'idNumber', label: '身份证号', render: (item) => item.idNumber || '-', fullWidth: true },
        { key: 'bankAccount', label: '银行卡号', render: (item) => item.bankAccount || '-', fullWidth: true },
        { key: 'bankName', label: '开户银行', render: (item) => item.bankName || '-', fullWidth: true },
        { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        { key: 'createdAt', label: '创建时间', render: (item) => formatDate(item.createdAt) },
      ]}
      actions={(record) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(record.id)}>编辑</Button>
          {canDelete ? (
            <Popconfirm title="删除劳务人员" description="确定删除该劳务人员吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          ) : null}
        </Space>
      )}
      empty={(
        <EmptyHint
          icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
          title="暂无劳务人员数据"
          desc="新增劳务人员后，可在此管理身份证与开户信息。"
          action={<Button type="primary" onClick={handleAddClick}>新增劳务人员</Button>}
        />
      )}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="劳务人员管理"
        desc="维护劳务人员档案，记录身份证、开户信息与备注"
        createLabel="新增劳务人员"
        onCreate={handleAddClick}
        total={workers.length}
        filterBar={filterBar}
        table={table}
        mobileTable={mobileCards}
      />

      <ResponsiveModalDrawer
        title={editingId ? '编辑劳务人员' : '新增劳务人员'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        width={620}
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
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入劳务人员名称' }]}
          >
            <Input placeholder="请输入劳务人员名称" />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            label="身份证号"
            name="idNumber"
            rules={[{ required: true, message: '请输入身份证号' }]}
          >
            <Input placeholder="请输入身份证号" />
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

          <Form.Item label="地址" name="address">
            <Input placeholder="请输入地址" />
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
