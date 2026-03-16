'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

/**
 * 劳务人员数据类型
 */
interface LaborWorker {
  id: string
  code: string
  name: string
  contact: string | null
  phone: string | null
  createdAt: string
}

/**
 * 劳务人员详情类型
 */
interface LaborWorkerDetail extends LaborWorker {
  idNumber?: string | null
  address?: string | null
  bankAccount?: string | null
  bankName?: string | null
  status?: string
  remark?: string | null
  updatedAt?: string
}

/**
 * API 响应类型
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 格式化日期
 */
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
  const [keyword, setKeyword] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  /**
   * 加载劳务人员列表
   */
  const loadWorkers = async (searchKeyword?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchKeyword) params.append('keyword', searchKeyword)

      const url = `/api/labor-workers${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result: ApiResponse<LaborWorker[]> = await response.json()

      if (result.success && result.data) {
        setWorkers(result.data)
      } else {
        message.error(result.error || '数据加载失败')
        setWorkers([])
      }
    } catch (err) {
      console.error('加载劳务人员列表失败:', err)
      message.error('数据加载失败，请检查网络连接')
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初次加载数据
   */
  useEffect(() => {
    loadWorkers()
  }, [])

  /**
   * 查询处理
   */
  const handleSearch = () => {
    loadWorkers(keyword)
  }

  /**
   * 重置处理
   */
  const handleReset = () => {
    setKeyword('')
    loadWorkers('')
  }

  /**
   * 打开新增弹窗
   */
  const handleAddClick = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  /**
   * 打开编辑弹窗
   */
  const handleEditClick = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-workers/${id}`)
      const result: ApiResponse<LaborWorkerDetail> = await response.json()

      if (result.success && result.data) {
        setEditingId(id)
        form.setFieldsValue({
          name: result.data.name,
          contact: result.data.contact || undefined,
          phone: result.data.phone || undefined,
          address: result.data.address || undefined,
          remark: result.data.remark || undefined,
        })
        setIsModalVisible(true)
      } else {
        message.error(result.error || '获取劳务人员信息失败')
      }
    } catch (err) {
      console.error('获取劳务人员信息失败:', err)
      message.error('获取劳务人员信息失败')
    }
  }

  /**
   * 删除劳务人员
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-workers/${id}`, {
        method: 'DELETE',
      })
      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success('劳务人员已删除')
        loadWorkers(keyword)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除劳务人员失败:', err)
      message.error('删除失败，请检查网络连接')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      const url = editingId ? `/api/labor-workers/${editingId}` : '/api/labor-workers'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        name: values.name,
        contact: values.contact || null,
        phone: values.phone || null,
        address: values.address || null,
        remark: values.remark || null,
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<any> = await response.json()

      if (result.success) {
        message.success(editingId ? '劳务人员已更新' : '劳务人员已创建')
        setIsModalVisible(false)
        form.resetFields()
        loadWorkers(keyword)
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (err) {
      console.error('提交表单失败:', err)
      message.error('操作失败，请检查网络连接')
    }
  }

  /**
   * 表格列定义
   */
  const columns: ColumnsType<LaborWorker> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
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
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: '#1d1d1f',
          }}
        >
          劳务人员管理
        </h1>
      </div>

      {/* 查询区 */}
      <div
        style={{
          marginBottom: 20,
          padding: '12px',
          background: '#fafafa',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
        }}
      >
        <Space wrap style={{ width: '100%' }}>
          <Input
            placeholder="输入劳务人员名称搜索"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />

          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            查询
          </Button>

          <Button onClick={handleReset} loading={loading}>
            重置
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddClick}
            style={{ marginLeft: 'auto' }}
          >
            新增劳务人员
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Table<LaborWorker>
        rowKey="id"
        columns={columns}
        dataSource={workers}
        loading={loading}
        pagination={false}
        scroll={{ x: 800 }}
        size="small"
        locale={{
          emptyText: '暂无劳务人员数据',
        }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑劳务人员' : '新增劳务人员'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入劳务人员名称' }]}
          >
            <Input placeholder="请输入劳务人员名称" />
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

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

