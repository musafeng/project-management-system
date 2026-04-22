'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  message,
  Switch,
  Divider,
  Typography,
  Badge,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { normalizeSystemUsersPayload } from '@/lib/system-users-response'

const { Title, Text } = Typography

// ─── 类型 ────────────────────────────────────────────────────────────────────

interface ProcessNode {
  id: string
  definitionId: string
  order: number
  name: string
  approverType: 'ROLE' | 'USER'
  approverRole: string | null
  approverUserId: string | null
  ccMode: 'NONE' | 'SUBMITTER' | 'ROLE' | 'USER'
  ccRole: string | null
  ccUserId: string | null
  createdAt: string
}

interface ProcessDefinition {
  id: string
  resourceType: string
  name: string
  isActive: boolean
  createdAt: string
  nodes: ProcessNode[]
  ProcessNode?: ProcessNode[]
}

interface SystemUser {
  id: string
  name: string
  dingUserId: string
  role: string
}

// ─── 常量 ────────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { label: 'ADMIN（系统管理员）', value: 'ADMIN' },
  { label: 'FINANCE（财务人员）', value: 'FINANCE' },
  { label: 'PURCHASE（采购人员）', value: 'PURCHASE' },
  { label: 'PROJECT_MANAGER（项目经理）', value: 'PROJECT_MANAGER' },
  { label: 'STAFF（普通员工）', value: 'STAFF' },
]

const CC_MODE_OPTIONS = [
  { label: '无抄送', value: 'NONE' },
  { label: '抄送提交人', value: 'SUBMITTER' },
  { label: '抄送某角色', value: 'ROLE' },
  { label: '抄送指定用户', value: 'USER' },
]

const APPROVER_TYPE_OPTIONS = [
  { label: '按角色审批', value: 'ROLE' },
  { label: '按指定用户审批', value: 'USER' },
]

// ─── 组件 ────────────────────────────────────────────────────────────────────

export default function ProcessDefinitionsPage() {
  const [definitions, setDefinitions] = useState<ProcessDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDef, setSelectedDef] = useState<ProcessDefinition | null>(null)
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])

  // 流程定义弹窗
  const [defModalOpen, setDefModalOpen] = useState(false)
  const [editingDef, setEditingDef] = useState<ProcessDefinition | null>(null)
  const [defForm] = Form.useForm()
  const [defSubmitting, setDefSubmitting] = useState(false)

  // 节点弹窗
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<ProcessNode | null>(null)
  const [nodeForm] = Form.useForm()
  const [nodeSubmitting, setNodeSubmitting] = useState(false)
  const [approverType, setApproverType] = useState<'ROLE' | 'USER'>('ROLE')
  const [ccMode, setCcMode] = useState<'NONE' | 'SUBMITTER' | 'ROLE' | 'USER'>('NONE')

  const getDefinitionNodes = (definition: ProcessDefinition | null | undefined) => {
    return definition?.nodes ?? definition?.ProcessNode ?? []
  }

  // ─── 数据加载 ──────────────────────────────────────────────────────────────

  const loadDefinitions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/process-definitions', { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setDefinitions(
          (json.data ?? []).map((definition: ProcessDefinition) => ({
            ...definition,
            nodes: getDefinitionNodes(definition),
          }))
        )
      }
      else message.error(json.error || '加载失败')
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSystemUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/system-users', { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setSystemUsers(normalizeSystemUsersPayload(json.data))
      }
    } catch {
      // 忽略
    }
  }, [])

  useEffect(() => {
    loadDefinitions()
    loadSystemUsers()
  }, [loadDefinitions, loadSystemUsers])

  // 当进入详情时同步 selectedDef 的节点数据
  useEffect(() => {
    setSelectedDef((current) => {
      if (!current) return current
      const updated = definitions.find((d) => d.id === current.id)
      return updated ?? current
    })
  }, [definitions])

  // ─── 流程定义操作 ──────────────────────────────────────────────────────────

  const openCreateDef = () => {
    setEditingDef(null)
    defForm.resetFields()
    setDefModalOpen(true)
  }

  const openEditDef = (def: ProcessDefinition) => {
    setEditingDef(def)
    defForm.setFieldsValue({ name: def.name, resourceType: def.resourceType, isActive: def.isActive })
    setDefModalOpen(true)
  }

  const handleSaveDef = async (values: any) => {
    setDefSubmitting(true)
    try {
      const isEdit = !!editingDef
      const res = await fetch(
        isEdit ? `/api/process-definitions/${editingDef!.id}` : '/api/process-definitions',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(values),
        }
      )
      const json = await res.json()
      if (json.success) {
        message.success(isEdit ? '流程定义已更新' : '流程定义已创建')
        setDefModalOpen(false)
        defForm.resetFields()
        setEditingDef(null)
        loadDefinitions()
      } else {
        message.error(json.error || (isEdit ? '更新失败' : '创建失败'))
      }
    } catch {
      message.error('操作失败')
    } finally {
      setDefSubmitting(false)
    }
  }

  const handleToggleActive = async (def: ProcessDefinition, active: boolean) => {
    try {
      const res = await fetch(`/api/process-definitions/${def.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: active }),
      })
      const json = await res.json()
      if (json.success) {
        message.success(active ? '已启用' : '已停用')
        loadDefinitions()
      } else {
        message.error(json.error || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  // ─── 节点操作 ──────────────────────────────────────────────────────────────

  const openNodeModal = (node?: ProcessNode) => {
    setEditingNode(node ?? null)
    if (node) {
      setApproverType(node.approverType)
      setCcMode(node.ccMode)
      nodeForm.setFieldsValue({
        name: node.name,
        order: node.order,
        approverType: node.approverType,
        approverRole: node.approverRole,
        approverUserId: node.approverUserId,
        ccMode: node.ccMode,
        ccRole: node.ccRole,
        ccUserId: node.ccUserId,
      })
    } else {
      const nextNodes = getDefinitionNodes(selectedDef)
      setApproverType('ROLE')
      setCcMode('NONE')
      nodeForm.setFieldsValue({
        name: '审批',
        order: nextNodes.length + 1,
        approverType: 'ROLE',
        ccMode: 'NONE',
      })
    }
    setNodeModalOpen(true)
  }

  const handleNodeSubmit = async (values: any) => {
    if (!selectedDef) return
    setNodeSubmitting(true)
    try {
      const isEdit = !!editingNode
      const url = isEdit
        ? `/api/process-definitions/${selectedDef.id}/nodes/${editingNode!.id}`
        : `/api/process-definitions/${selectedDef.id}/nodes`
      const method = isEdit ? 'PUT' : 'POST'

      const payload = {
        name: values.name,
        order: values.order,
        approverType: values.approverType,
        approverRole: values.approverType === 'ROLE' ? values.approverRole : null,
        approverUserId: values.approverType === 'USER' ? values.approverUserId : null,
        ccMode: values.ccMode,
        ccRole: values.ccMode === 'ROLE' ? values.ccRole : null,
        ccUserId: values.ccMode === 'USER' ? values.ccUserId : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        message.success(isEdit ? '节点已更新' : '节点已添加')
        setNodeModalOpen(false)
        nodeForm.resetFields()
        setEditingNode(null)
        loadDefinitions()
      } else {
        message.error(json.error || '操作失败')
      }
    } catch {
      message.error('操作失败')
    } finally {
      setNodeSubmitting(false)
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    if (!selectedDef) return
    try {
      const res = await fetch(`/api/process-definitions/${selectedDef.id}/nodes/${nodeId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        message.success('节点已删除')
        loadDefinitions()
      } else {
        message.error(json.error || '删除失败')
      }
    } catch {
      message.error('删除失败')
    }
  }

  // ─── 列定义 ────────────────────────────────────────────────────────────────

  const defColumns: ColumnsType<ProcessDefinition> = [
    {
      title: '流程名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      render: (t) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: '节点数',
      key: 'nodeCount',
      width: 80,
      align: 'center',
      render: (_, r) => <Badge count={getDefinitionNodes(r).length} showZero color="#595959" />,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      align: 'center',
      render: (active, record) => (
        <Switch
          size="small"
          checked={active}
          onChange={(v) => handleToggleActive(record, v)}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditDef(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setSelectedDef(record)}
          >
            配置节点
          </Button>
        </Space>
      ),
    },
  ]

  const nodeColumns: ColumnsType<ProcessNode> = [
    {
      title: '顺序',
      dataIndex: 'order',
      key: 'order',
      width: 64,
      align: 'center',
      render: (v) => (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#1677ff', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, margin: '0 auto', fontSize: 13,
        }}>{v}</div>
      ),
    },
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      render: (t) => <span style={{ fontWeight: 500 }}>{t}</span>,
    },
    {
      title: '审批方式',
      key: 'approver',
      render: (_, r) => {
        if (r.approverType === 'ROLE') {
          return <Tag color="purple">角色：{r.approverRole}</Tag>
        }
        const u = systemUsers.find((u) => u.id === r.approverUserId)
        return <Tag color="geekblue">用户：{u?.name ?? r.approverUserId}</Tag>
      },
    },
    {
      title: '抄送',
      key: 'cc',
      render: (_, r) => {
        if (r.ccMode === 'NONE') return <Text type="secondary">无</Text>
        if (r.ccMode === 'SUBMITTER') return <Tag color="cyan">提交人</Tag>
        if (r.ccMode === 'ROLE') return <Tag color="orange">角色：{r.ccRole}</Tag>
        const u = systemUsers.find((u) => u.id === r.ccUserId)
        return <Tag color="gold">用户：{u?.name ?? r.ccUserId}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openNodeModal(record)}>编辑</Button>
          <Popconfirm
            title="确定删除该节点吗？"
            onConfirm={() => handleDeleteNode(record.id)}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ─── 渲染 ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      {/* 列表视图 */}
      {!selectedDef && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Title level={4} style={{ margin: 0 }}>审批流程配置</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateDef()}>
              新增流程
            </Button>
          </div>
          <Table<ProcessDefinition>
            rowKey="id"
            columns={defColumns}
            dataSource={definitions}
            loading={loading}
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无流程定义' }}
          />
        </>
      )}

      {/* 节点详情视图 */}
      {selectedDef && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedDef(null)}
            >
              返回列表
            </Button>
            <Divider type="vertical" />
            <Title level={4} style={{ margin: 0 }}>
              {selectedDef.name}
              <Tag color="blue" style={{ marginLeft: 10, fontSize: 12 }}>{selectedDef.resourceType}</Tag>
            </Title>
            <div style={{ marginLeft: 'auto' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openNodeModal()}>
                新增节点
              </Button>
            </div>
          </div>

          {getDefinitionNodes(selectedDef).length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 0',
              color: '#999', border: '1px dashed #d9d9d9', borderRadius: 6, marginBottom: 16,
            }}>
              暂无审批节点，点击「新增节点」添加第一个审批步骤
            </div>
          )}

          {getDefinitionNodes(selectedDef).length > 0 && (
            <Table<ProcessNode>
              rowKey="id"
              columns={nodeColumns}
              dataSource={[...getDefinitionNodes(selectedDef)].sort((a, b) => a.order - b.order)}
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无节点' }}
            />
          )}
        </>
      )}

      {/* 新增/编辑流程定义弹窗 */}
      <Modal
        title={editingDef ? '编辑流程定义' : '新增流程定义'}
        open={defModalOpen}
        onOk={() => defForm.submit()}
        onCancel={() => { setDefModalOpen(false); defForm.resetFields(); setEditingDef(null) }}
        confirmLoading={defSubmitting}
        okText={editingDef ? '保存' : '创建'}
        cancelText="取消"
        width={480}
      >
        <Form form={defForm} layout="vertical" onFinish={handleSaveDef} style={{ marginTop: 16 }}>
          <Form.Item label="资源类型" name="resourceType" rules={[{ required: true, message: '请选择资源类型' }]}
            extra={<span style={{ fontSize: 12, color: '#888' }}>对应业务模块，创建后不可修改</span>}
          >
            <Select
              placeholder="请选择对应的业务模块"
              disabled={!!editingDef}
              options={[
                { label: '项目新增（projects）', value: 'projects' },
                { label: '项目合同（project-contracts）', value: 'project-contracts' },
                { label: '施工立项（construction-approvals）', value: 'construction-approvals' },
                { label: '项目合同变更（project-contract-changes）', value: 'project-contract-changes' },
                { label: '采购合同（procurement-contracts）', value: 'procurement-contracts' },
                { label: '采购付款（procurement-payments）', value: 'procurement-payments' },
                { label: '劳务合同（labor-contracts）', value: 'labor-contracts' },
                { label: '劳务付款（labor-payments）', value: 'labor-payments' },
                { label: '分包合同（subcontract-contracts）', value: 'subcontract-contracts' },
                { label: '分包付款（subcontract-payments）', value: 'subcontract-payments' },
              ]}
            />
          </Form.Item>
          <Form.Item label="流程名称" name="name" rules={[{ required: true, message: '请填写流程名称' }]}>
            <Input placeholder="如：施工立项审批流程" />
          </Form.Item>
          {editingDef && (
            <Form.Item label="状态" name="isActive" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 新增/编辑节点弹窗 */}
      <Modal
        title={editingNode ? '编辑审批节点' : '新增审批节点'}
        open={nodeModalOpen}
        onOk={() => nodeForm.submit()}
        onCancel={() => { setNodeModalOpen(false); nodeForm.resetFields(); setEditingNode(null) }}
        confirmLoading={nodeSubmitting}
        okText={editingNode ? '保存' : '添加'}
        cancelText="取消"
        width={520}
      >
        <Form form={nodeForm} layout="vertical" onFinish={handleNodeSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item label="节点名称" name="name" rules={[{ required: true, message: '请填写节点名称' }]}>
              <Input placeholder="如：主管审批" />
            </Form.Item>
            <Form.Item label="顺序" name="order" rules={[{ required: true, message: '请填写顺序' }]}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
            </Form.Item>
          </div>

          <Divider orientation="left" style={{ fontSize: 13 }}>审批人配置</Divider>

          <Form.Item label="审批方式" name="approverType" rules={[{ required: true }]}>
            <Select
              options={APPROVER_TYPE_OPTIONS}
              onChange={(v) => {
                setApproverType(v)
                nodeForm.setFieldsValue({ approverRole: undefined, approverUserId: undefined })
              }}
            />
          </Form.Item>

          {approverType === 'ROLE' && (
            <Form.Item label="审批角色" name="approverRole" rules={[{ required: true, message: '请选择角色' }]}>
              <Select options={ROLE_OPTIONS} placeholder="选择角色" />
            </Form.Item>
          )}
          {approverType === 'USER' && (
            <Form.Item label="审批用户" name="approverUserId" rules={[{ required: true, message: '请选择用户' }]}>
              <Select
                placeholder="选择用户"
                options={systemUsers.map((u) => ({ label: `${u.name}（${u.role}）`, value: u.id }))}
              />
            </Form.Item>
          )}

          <Divider orientation="left" style={{ fontSize: 13 }}>抄送配置</Divider>

          <Form.Item label="抄送方式" name="ccMode" rules={[{ required: true }]}>
            <Select
              options={CC_MODE_OPTIONS}
              onChange={(v) => {
                setCcMode(v)
                nodeForm.setFieldsValue({ ccRole: undefined, ccUserId: undefined })
              }}
            />
          </Form.Item>

          {ccMode === 'ROLE' && (
            <Form.Item label="抄送角色" name="ccRole" rules={[{ required: true, message: '请选择角色' }]}>
              <Select options={ROLE_OPTIONS} placeholder="选择角色" />
            </Form.Item>
          )}
          {ccMode === 'USER' && (
            <Form.Item label="抄送用户" name="ccUserId" rules={[{ required: true, message: '请选择用户' }]}>
              <Select
                placeholder="选择用户"
                options={systemUsers.map((u) => ({ label: `${u.name}（${u.role}）`, value: u.id }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
