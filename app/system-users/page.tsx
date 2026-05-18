'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Tag,
  Switch,
  Select,
  message,
  Button,
  Card,
  Space,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { requestApi } from '@/lib/client-request'
import {
  LedgerPageLayout,
  FilterBar,
  MobileCardList,
  type FilterValues,
} from '@/components/ledger'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { useMobile } from '@/hooks/useMobile'

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

const STATUS_OPTIONS = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' },
]

function formatDateTime(val: string | null): string {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleString('zh-CN')
  } catch {
    return val
  }
}

function formatDeptNames(names: string[] | undefined): string {
  if (!names || names.length === 0) return '-'
  return names.filter(Boolean).join('、') || '-'
}

export default function SystemUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const isMobile = useMobile()

  const [filters, setFilters] = useState<FilterValues>({})

  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [draftRole, setDraftRole] = useState<string>('STAFF')
  const [draftActive, setDraftActive] = useState<boolean>(true)

  const loadUsers = async () => {
    setLoading(true)
    const result = await requestApi<{ users: SystemUser[] }>('/api/system-users', {
      credentials: 'include',
      fallbackError: '加载用户列表失败，请稍后重试',
    })
    if (result.success && result.data?.users) {
      setUsers(result.data.users)
    } else {
      setUsers([])
      message.error(result.error || '加载用户列表失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const updateUser = async (id: string, payload: { role?: string; isActive?: boolean }) => {
    setUpdatingId(id)
    const result = await requestApi(`/api/system-users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      fallbackError: '更新用户失败，请稍后重试',
    })
    if (result.success) {
      message.success('更新成功')
      await loadUsers()
    } else {
      message.error(result.error || '更新用户失败，请稍后重试')
    }
    setUpdatingId(null)
    return result.success
  }

  const filteredUsers = useMemo(() => {
    const keyword = ((filters.keyword as string) || '').trim().toLowerCase()
    const roleFilter = (filters.role as string) || ''
    const statusFilter = (filters.status as string) || ''

    return users.filter((u) => {
      if (keyword) {
        const haystack = [
          u.name || '',
          u.mobile || '',
          formatDeptNames(u.deptNames),
        ].join(' ').toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      if (roleFilter && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.isActive) return false
      if (statusFilter === 'inactive' && u.isActive) return false
      return true
    })
  }, [users, filters])

  const openEdit = (record: SystemUser) => {
    setEditing(record)
    setDraftRole(record.role)
    setDraftActive(record.isActive)
  }

  const closeEdit = () => {
    if (updatingId) return
    setEditing(null)
  }

  const submitEdit = async () => {
    if (!editing) return
    const payload: { role?: string; isActive?: boolean } = {}
    if (draftRole !== editing.role) payload.role = draftRole
    if (draftActive !== editing.isActive) payload.isActive = draftActive
    if (Object.keys(payload).length === 0) {
      message.info('没有可提交的变更')
      setEditing(null)
      return
    }
    const ok = await updateUser(editing.id, payload)
    if (ok) setEditing(null)
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
      render: (names: string[]) => formatDeptNames(names),
    },
    {
      title: '当前角色',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (role: string) => (
        <Tag color={ROLE_COLOR[role] || 'default'}>{ROLE_LABEL[role] || role}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean) =>
        isActive
          ? <Tag color="success">启用</Tag>
          : <Tag color="error">禁用</Tag>,
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
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_: unknown, record: SystemUser) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ]

  const tableNode = (
    <Table<SystemUser>
      rowKey="id"
      columns={columns}
      dataSource={filteredUsers}
      loading={loading}
      pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      scroll={{ x: 1100 }}
      size="small"
      locale={{ emptyText: '暂无系统用户' }}
      rowClassName={(record) => (!record.isActive ? 'opacity-50' : '')}
    />
  )

  const mobileCards = (
    <MobileCardList<SystemUser>
      data={filteredUsers}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.name}
      getDescription={(item) => (
        <Space size={6} wrap>
          <Tag color={ROLE_COLOR[item.role] || 'default'} style={{ marginRight: 0 }}>
            {ROLE_LABEL[item.role] || item.role}
          </Tag>
          {!item.isActive && <Tag color="error" style={{ marginRight: 0 }}>已禁用</Tag>}
        </Space>
      )}
      fields={[
        { key: 'mobile', label: '手机号', render: (item) => item.mobile || '-' },
        { key: 'deptNames', label: '部门', render: (item) => formatDeptNames(item.deptNames) },
        { key: 'lastLoginAt', label: '最后登录', render: (item) => formatDateTime(item.lastLoginAt), fullWidth: true },
      ]}
      actions={(record) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
        </div>
      )}
    />
  )

  const statsCards = !isMobile && !loading && users.length > 0 ? (
    <div style={{ display: 'flex', gap: 12, margin: '8px 0 12px', flexWrap: 'wrap' }}>
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
  ) : null

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'input', key: 'keyword', placeholder: '搜索姓名 / 手机号 / 部门', width: 240 },
        { type: 'select', key: 'role', placeholder: '全部角色', options: ROLE_OPTIONS, width: 140 },
        { type: 'select', key: 'status', placeholder: '全部状态', options: STATUS_OPTIONS, width: 120 },
      ]}
      onSearch={(values) => setFilters(values)}
      onReset={() => setFilters({})}
      loading={loading}
    />
  )

  return (
    <>
      <LedgerPageLayout
        title="系统用户"
        desc="管理系统登录账号的角色与启用状态，用户由钉钉通讯录同步生成"
        total={filteredUsers.length}
        headerExtra={
          <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>
            刷新
          </Button>
        }
        filterBar={
          <>
            {filterBar}
            {statsCards}
          </>
        }
        table={tableNode}
        mobileTable={mobileCards}
      />

      <ResponsiveModalDrawer
        open={editing !== null}
        title={editing ? `编辑用户 · ${editing.name}` : '编辑用户'}
        onOk={submitEdit}
        onCancel={closeEdit}
        okText="保存"
        cancelText="取消"
        confirmLoading={updatingId === editing?.id}
        destroyOnClose
        width={520}
      >
        {editing && (
          <div style={{ display: 'grid', gap: 14 }}>
            <ReadonlyRow label="姓名" value={editing.name} />
            <ReadonlyRow label="手机号" value={editing.mobile || '-'} />
            <ReadonlyRow label="所属部门" value={formatDeptNames(editing.deptNames)} />
            <ReadonlyRow label="钉钉 userId" value={editing.dingUserId || '-'} mono />

            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>角色</div>
              <Select
                value={draftRole}
                style={{ width: '100%' }}
                options={ROLE_OPTIONS}
                onChange={(val) => setDraftRole(val)}
                disabled={updatingId === editing.id}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>启用状态</div>
              <Switch
                checked={draftActive}
                checkedChildren="启用"
                unCheckedChildren="禁用"
                onChange={(val) => setDraftActive(val)}
                disabled={updatingId === editing.id}
              />
              <span style={{ marginLeft: 10, fontSize: 12, color: '#8c8c8c' }}>
                禁用后该用户将无法登录系统
              </span>
            </div>
          </div>
        )}
      </ResponsiveModalDrawer>
    </>
  )
}

function ReadonlyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          color: '#1f1f1f',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  )
}
