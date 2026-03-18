'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Tag,
  Switch,
  Select,
  message,
  Spin,
  Button,
  Space,
  Card,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'

interface SystemUser {
  id: string
  dingUserId: string
  name: string
  mobile: string | null
  role: string
  isActive: boolean
  deptIds: number[]
  deptNames: string[]
  lastLoginAt: string | null
  createdAt: string
}

const ROLE_OPTIONS = [
  { label: '系统管理员', value: 'ADMIN' },
  { label: '财务人员', value: 'FINANCE' },
  { label: '采购人员', value: 'PURCHASE' },
  { label: '项目经理', value: 'PROJECT_MANAGER' },
  { label: '普通员工', value: 'STAFF' },
]

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'red',
  FINANCE: 'gold',
  PURCHASE: 'blue',
  PROJECT_MANAGER: 'green',
  STAFF: 'default',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '系统管理员',
  FINANCE: '财务人员',
  PURCHASE: '采购人员',
  PROJECT_MANAGER: '项目经理',
  STAFF: '普通员工',
}

function formatDateTime(val: string | null): string {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleString('zh-CN')
  } catch {
    return val
  }
}

export default function SystemUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/system-users', { credentials: 'include' })
      const result = await res.json()
      if (result.success && result.data?.users) {
        setUsers(result.data.users)
      } else {
        message.error(result.error || '加载失败')
      }
    } catch (err) {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const updateUser = async (id: string, payload: { role?: string; isActive?: boolean }) => {
    try {
      setUpdatingId(id)
      const res = await fetch(`/api/system-users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.success) {
        message.success('更新成功')
        await loadUsers()
      } else {
        message.error(result.error || '更新失败')
      }
    } catch (err) {
      message.error('操作失败，请检查网络')
    } finally {
      setUpdatingId(null)
    }
  }

  const columns: ColumnsType<SystemUser> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'mobile',
      key: 'mobile',
      width: 130,
      render: (val: string | null) => val || '-',
    },
    {
      title: '所属部门',
      dataIndex: 'deptNames',
      key: 'deptNames',
      width: 180,
      render: (names: string[]) =>
        names && names.length > 0
          ? names.filter(Boolean).join('、') || '-'
          : '-',
    },
    {
      title: '当前角色',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: string, record: SystemUser) => (
        <Select
          value={role}
          size="small"
          style={{ width: 130 }}
          loading={updatingId === record.id}
          disabled={updatingId !== null && updatingId !== record.id}
          options={ROLE_OPTIONS}
          onChange={(val) => updateUser(record.id, { role: val })}
          popupMatchSelectWidth={false}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean, record: SystemUser) => (
        <Switch
          checked={isActive}
          size="small"
          loading={updatingId === record.id}
          disabled={updatingId !== null && updatingId !== record.id}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(val) => updateUser(record.id, { isActive: val })}
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (val: string | null) => formatDateTime(val),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => formatDateTime(val),
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1d1d1f' }}>系统用户管理</h1>
        <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>刷新</Button>
      </div>

      {/* 统计卡片 */}
      {!loading && users.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {ROLE_OPTIONS.map((r) => {
            const count = users.filter((u) => u.role === r.value).length
            if (count === 0) return null
            return (
              <Card key={r.value} size="small" style={{ minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>{count}</div>
                <Tag color={ROLE_COLOR[r.value]} style={{ marginTop: 4 }}>{r.label}</Tag>
              </Card>
            )
          })}
          <Card size="small" style={{ minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f5222d' }}>
              {users.filter((u) => !u.isActive).length}
            </div>
            <Tag color="error" style={{ marginTop: 4 }}>已禁用</Tag>
          </Card>
        </div>
      )}

      <Spin spinning={loading}>
        <Table<SystemUser>
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={false}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1000 }}
          size="small"
          locale={{ emptyText: '暂无系统用户' }}
          rowClassName={(record) => (!record.isActive ? 'opacity-50' : '')}
        />
      </Spin>
    </div>
  )
}



