'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  ConfigProvider,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ApprovalActions } from '@/components/ApprovalActions'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import { EmptyHint, MobileCardList } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { toChineseErrorMessage } from '@/lib/api/error-message'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { getApprovalStatusMeta, isApprovalLocked } from '@/lib/approval-status'

interface ProjectContract {
  id: string
  code: string
  name: string
  projectId: string
  projectName: string
  contractAmount: number
}

interface ProjectContractChange {
  id: string
  contractId: string
  contractCode: string
  contractName: string
  projectId: string
  projectName: string
  changeDate: string
  increaseAmount: number
  originalAmount: number
  totalAmount: number
  attachmentUrl: string
  remark: string
  approvalStatus: string
  approvedAt?: string | null
  createdAt: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

function fmt(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('zh-CN')
  } catch {
    return value
  }
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return await response.json()
  } catch {
    return { success: false, error: '服务器返回数据格式异常，请稍后重试' }
  }
}

function getFriendlyErrorMessage(input: unknown, fallback: string) {
  const text = typeof input === 'string' ? input : input instanceof Error ? input.message : ''
  const translated = toChineseErrorMessage(text)
  return /[\u4e00-\u9fa5]/.test(translated) ? translated : fallback
}

export default function ProjectContractChangesPage() {
  const [data, setData] = useState<ProjectContractChange[]>([])
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectContractChange | null>(null)
  const [form] = Form.useForm()
  const selectedContractId = Form.useWatch('contractId', form)
  const increaseAmount = Number(Form.useWatch('increaseAmount', form) ?? 0)
  const selectedContract = contracts.find((item) => item.id === selectedContractId)
  const originalAmount = editing?.originalAmount ?? Number(selectedContract?.contractAmount ?? 0)
  const totalAmount = originalAmount + increaseAmount
  const isMobile = useMobile()

  const loadContracts = async () => {
    const res = await fetch('/api/project-contracts')
    const json: ApiResponse<ProjectContract[]> = await res.json()
    if (json.success) setContracts(json.data || [])
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/project-contract-changes')
      const json: ApiResponse<ProjectContractChange[]> = await res.json()
      if (json.success) setData(json.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContracts()
    load()
  }, [])

  useEffect(() => {
    form.setFieldsValue({
      originalAmount,
      totalAmount,
      projectName: editing?.projectName ?? selectedContract?.projectName,
    })
  }, [editing, selectedContract, originalAmount, totalAmount, form])

  const handleOpen = async (record?: ProjectContractChange) => {
    setEditing(record || null)
    form.resetFields()

    if (record) {
      const res = await fetch(`/api/project-contract-changes/${record.id}`)
      const json = await parseApiResponse<ProjectContractChange>(res)
      if (!json.success || !json.data) {
        message.error(json.error || '获取详情失败')
        return
      }
      form.setFieldsValue({
        contractId: json.data.contractId,
        projectName: json.data.projectName,
        changeDate: json.data.changeDate ? dayjs(json.data.changeDate) : undefined,
        increaseAmount: json.data.increaseAmount,
        originalAmount: json.data.originalAmount,
        totalAmount: json.data.totalAmount,
        remark: json.data.remark,
        attachmentUrl: json.data.attachmentUrl,
      })
    }

    setModalOpen(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        contractId: values.contractId,
        changeDate: values.changeDate?.format('YYYY-MM-DD'),
        increaseAmount: values.increaseAmount,
        remark: values.remark,
        attachmentUrl: values.attachmentUrl,
      }

      const url = editing ? `/api/project-contract-changes/${editing.id}` : '/api/project-contract-changes'
      const method = editing ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await parseApiResponse<any>(response)

      if (json.success) {
        message.success(editing ? '更新成功' : '创建成功')
        setModalOpen(false)
        void load()
        void loadContracts()
        return
      }

      message.error(json.error || '操作失败')
    } catch (err) {
      console.error('提交项目合同变更失败:', err)
      message.error(getFriendlyErrorMessage(err, '提交失败，请检查表单后重试'))
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/project-contract-changes/${id}`, { method: 'DELETE' })
    const json = await parseApiResponse<any>(response)

    if (json.success) {
      message.success('已删除')
      void load()
      return
    }

    message.error(json.error || '删除失败')
  }

  const columns: ColumnsType<ProjectContractChange> = [
    { title: '合同编号', dataIndex: 'contractCode', width: 130 },
    { title: '合同名称', dataIndex: 'contractName', width: 180 },
    { title: '项目名称', dataIndex: 'projectName', width: 150 },
    { title: '变更日期', dataIndex: 'changeDate', width: 120, render: fmtDate },
    { title: '增项金额', dataIndex: 'increaseAmount', width: 120, align: 'right', render: (value) => <span style={{ color: '#1677ff', fontWeight: 600 }}>{fmt(value)}</span> },
    { title: '合同原金额', dataIndex: 'originalAmount', width: 120, align: 'right', render: fmt },
    { title: '合同总金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: fmt },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (_, record) => {
        const statusMeta = getApprovalStatusMeta(record)
        return <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
      },
    },
    { title: '备注', dataIndex: 'remark', width: 180, render: (value) => value || '-' },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const locked = isApprovalLocked(record)

        return (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
            <Button size="small" danger icon={<DeleteOutlined />} disabled={locked}>
              删除
            </Button>
          </Popconfirm>
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus}
            approvedAt={record.approvedAt}
            resource="project-contract-changes"
            onSuccess={() => {
              void load()
              void loadContracts()
            }}
          />
        </Space>
        )
      },
    },
  ]

  const mobileCards = (
    <MobileCardList<ProjectContractChange>
      data={data}
      loading={loading}
      getKey={(item) => item.id}
      getTitle={(item) => item.contractName}
      getDescription={(item) => `合同编号：${item.contractCode}`}
      getStatus={(item) => {
        const statusMeta = getApprovalStatusMeta(item)
        return <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
      }}
      fields={[
        { key: 'projectName', label: '项目名称', render: (item) => item.projectName || '-' },
        { key: 'changeDate', label: '变更日期', render: (item) => fmtDate(item.changeDate) },
        { key: 'increaseAmount', label: '增项金额', render: (item) => <span style={{ color: '#1677ff', fontWeight: 600 }}>{fmt(item.increaseAmount)}</span> },
        { key: 'originalAmount', label: '合同原金额', render: (item) => fmt(item.originalAmount) },
        { key: 'totalAmount', label: '合同总金额', render: (item) => fmt(item.totalAmount) },
        { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
      ]}
      actions={(record) => {
        const locked = isApprovalLocked(record)

        return (
          <Space size="small" wrap>
            <Button size="small" icon={<EditOutlined />} disabled={locked} onClick={() => handleOpen(record)}>
              编辑
            </Button>
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
              <Button size="small" danger icon={<DeleteOutlined />} disabled={locked}>
                删除
              </Button>
            </Popconfirm>
            <ApprovalActions
              id={record.id}
              approvalStatus={record.approvalStatus}
              approvedAt={record.approvedAt}
              resource="project-contract-changes"
              onSuccess={() => {
                void load()
                void loadContracts()
              }}
            />
          </Space>
        )
      }}
      empty={(
        <EmptyHint
          title="暂无项目合同变更"
          desc="新增合同变更后，可在此查看变更金额与审批状态。"
          action={<Button type="primary" onClick={() => handleOpen()}>新增</Button>}
        />
      )}
    />
  )

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontSize: 14,
        },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          padding: isMobile ? '12px' : '16px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: isMobile ? 10 : 8,
            padding: isMobile ? '14px' : 20,
            minHeight: '80vh',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
              alignItems: isMobile ? 'stretch' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 12 : 0,
            }}
          >
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>项目合同变更</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()} style={{ width: isMobile ? '100%' : undefined }}>
              新增
            </Button>
          </div>

          {isMobile ? (
            mobileCards
          ) : (
            <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1500 }} size="small" />
          )}
        </div>
      </div>

      <Modal
        title={editing ? '编辑项目合同变更' : '新增项目合同变更'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        width={isMobile ? '95vw' : 620}
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
          <Form.Item label="项目合同名称" name="contractId" rules={[{ required: true, message: '请选择项目合同' }]}>
            <Select
              placeholder="请选择项目合同"
              options={contracts.map((item) => ({
                label: `${item.code} / ${item.name}`,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="所属项目" name="projectName">
            <Input disabled />
          </Form.Item>

          <Form.Item label="变更日期" name="changeDate" rules={[{ required: true, message: '请选择变更日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="增项金额" name="increaseAmount" rules={[{ required: true, message: '请输入增项金额' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
          </Form.Item>

          <Form.Item label="合同原金额" name="originalAmount">
            <InputNumber style={{ width: '100%' }} disabled />
          </Form.Item>

          <Form.Item label="合同总金额" name="totalAmount">
            <InputNumber style={{ width: '100%' }} disabled />
          </Form.Item>

          <Form.Item label="备注" name="remark" rules={[{ required: true, message: '请填写备注' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="附件" name="attachmentUrl" rules={[{ required: true, message: '请上传附件' }]}>
            <AttachmentUploadField />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
