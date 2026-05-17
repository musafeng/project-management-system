'use client'

import { DeleteOutlined, DownloadOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { ApprovalActions, ApprovalStatusTag } from '@/components/ApprovalActions'
import AmountSummaryCards from '@/components/AmountSummaryCards'
import AttachmentUploadField from '@/components/AttachmentUploadField'
import ViewRecordButton from '@/components/ViewRecordButton'
import ResponsiveModalDrawer from '@/components/ResponsiveModalDrawer'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { canUseAsApprovedUpstream, isApprovalLocked } from '@/lib/approval-status'
import { DEFAULT_FORM_VALIDATE_MESSAGES } from '@/lib/form'
import { isSystemManagerClientUser } from '@/lib/system-manager'
import { EmptyHint, FilterBar, LedgerPageLayout, MobileCardList } from '@/components/ledger'
import type { FilterValues } from '@/components/ledger'
import { useMobile } from '@/hooks/useMobile'
import { fmtMoney, fmtDate } from '@/lib/utils/format'
import { requestApi } from '@/lib/client-request'

const { Text } = Typography
const MOBILE_PAGE_SIZE = 20

interface DeductionItem {
  type: string
  amount: number
  remark?: string | null
  attachmentUrl?: string | null
}

interface ContractReceipt {
  id: string
  contractId: string
  contractCode: string
  contractName: string
  projectName: string
  amount: number
  actualReceivedAmount?: number
  receiptDate: string
  deductionItems: DeductionItem[]
  attachmentUrl?: string | null
  approvalStatus?: string
  approvedAt?: string | null
  remark: string | null
  createdAt: string
}

interface ProjectContract {
  id: string
  code: string
  name: string
  projectId: string
  projectName: string
  contractAmount: number
  changedAmount: number
  receivableAmount: number
  receivedAmount: number
  unreceivedAmount: number
  signDate: string | null
  status: string
  approvalStatus?: string | null
  approvedAt?: string | null
  createdAt: string
}

const DEDUCTION_TYPES = ['税金', '手续费', '管理费', '其他']

export default function ContractReceiptsPage() {
  const [receipts, setReceipts] = useState<ContractReceipt[]>([])
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [deductionItems, setDeductionItems] = useState<DeductionItem[]>([])
  const [lastFilter, setLastFilter] = useState<FilterValues>({})
  const [mobilePage, setMobilePage] = useState(1)
  const [form] = Form.useForm()
  const selectedContractId = Form.useWatch('contractId', form)
  const watchedAmount = Form.useWatch('amount', form)
  const selectedContract = contracts.find((item) => item.id === selectedContractId)
  const deductionTotal = deductionItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const actualReceivedAmount = Number(watchedAmount || 0) - deductionTotal
  const isMobile = useMobile()

  useEffect(() => {
    getCurrentAuthUser().then((user) => setCanDelete(isSystemManagerClientUser(user)))
  }, [])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(receipts.length / MOBILE_PAGE_SIZE))
    if (mobilePage > maxPage) setMobilePage(maxPage)
  }, [receipts.length, mobilePage])

  const loadContracts = async () => {
    setContractsLoading(true)
    const result = await requestApi<ProjectContract[]>('/api/project-contracts', {
      credentials: 'include',
      fallbackError: '加载合同列表失败',
    })
    if (result.success) setContracts(result.data || [])
    else setContracts([])
    setContractsLoading(false)
  }

  const loadReceipts = async (filters: FilterValues = {}) => {
    setLoading(true)
    const params = new URLSearchParams()
    const cId = (filters.contractId as string) || ''
    if (cId) params.set('contractId', cId)
    const url = `/api/contract-receipts${params.toString() ? `?${params.toString()}` : ''}`
    const result = await requestApi<ContractReceipt[]>(url, {
      credentials: 'include',
      fallbackError: '数据加载失败，请稍后重试',
    })
    if (result.success) {
      setReceipts(result.data || [])
    } else {
      setReceipts([])
      message.error(result.error || '数据加载失败，请稍后重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadContracts()
    loadReceipts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (filters: FilterValues) => {
    setMobilePage(1)
    setLastFilter(filters)
    loadReceipts(filters)
  }

  const handleReset = () => {
    setMobilePage(1)
    setLastFilter({})
    loadReceipts({})
  }

  const handleAddClick = () => {
    form.resetFields()
    setDeductionItems([])
    form.setFieldValue('attachmentUrl', null)
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const result = await requestApi(`/api/contract-receipts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      fallbackError: '删除失败，请稍后重试',
    })

    if (result.success) {
      message.success('收款记录已删除')
      loadReceipts(lastFilter)
      loadContracts()
    } else {
      message.error(result.error || '删除失败')
    }
  }

  const handleSubmit = async (values: any) => {
    const payload = {
      contractId: values.contractId,
      amount: values.amount,
      receiptDate: values.receiptDate ? values.receiptDate.format('YYYY-MM-DD') : null,
      deductionItems,
      attachmentUrl: values.attachmentUrl || null,
      remark: values.remark || null,
    }

    const result = await requestApi('/api/contract-receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      fallbackError: '操作失败，请稍后重试',
    })

    if (result.success) {
      message.success('收款记录已创建')
      setIsModalVisible(false)
      form.resetFields()
      setDeductionItems([])
      loadReceipts(lastFilter)
      loadContracts()
    } else {
      message.error(result.error || '操作失败')
    }
  }

  const handleFinishFailed = () => {
    message.error('请先完善表单必填项后再提交')
  }

  const contractOptions = useMemo(
    () =>
      contracts
        .filter((contract) => canUseAsApprovedUpstream(contract))
        .map((contract) => ({
          label: `${contract.code} - ${contract.name}`,
          value: contract.id,
        })),
    [contracts]
  )

  const summaryItems = useMemo(
    () => [
      {
        label: '收款总额',
        value: fmtMoney(receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
        color: '#52c41a',
      },
      {
        label: '扣款总额',
        value: fmtMoney(receipts.reduce((sum, item) => sum + item.deductionItems.reduce((deductSum, deduction) => deductSum + Number(deduction.amount || 0), 0), 0)),
        color: '#fa8c16',
      },
      {
        label: '到账总额',
        value: fmtMoney(receipts.reduce((sum, item) => sum + Number(item.actualReceivedAmount ?? (item.amount - item.deductionItems.reduce((deductSum, deduction) => deductSum + Number(deduction.amount || 0), 0))), 0)),
        color: '#1677ff',
      },
    ],
    [receipts]
  )

  const summaryCards = <AmountSummaryCards items={summaryItems} isMobile={isMobile} />

  const columns: ColumnsType<ContractReceipt> = [
    {
      title: '合同编号',
      dataIndex: 'contractCode',
      width: 130,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    { title: '合同名称', dataIndex: 'contractName', width: 180 },
    { title: '项目名称', dataIndex: 'projectName', width: 150 },
    {
      title: '收款金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {fmtMoney(Number(value))}
        </Text>
      ),
    },
    {
      title: '扣款明细',
      dataIndex: 'deductionItems',
      width: 260,
      render: (items: DeductionItem[]) =>
        items?.length
          ? items.map((item) => {
            const parts = [`${item.type}:${fmtMoney(Number(item.amount))}`]
            if (item.remark) parts.push(`备注:${item.remark}`)
            if (item.attachmentUrl) parts.push('有附件')
            return parts.join(' ')
          }).join(' / ')
          : '-',
    },
    {
      title: '到账金额',
      dataIndex: 'actualReceivedAmount',
      width: 130,
      align: 'right',
      render: (_: number, record) => (
        <Text strong style={{ color: '#1677ff' }}>
          {fmtMoney(Number(record.actualReceivedAmount ?? (record.amount - record.deductionItems.reduce((sum, item) => sum + Number(item.amount || 0), 0))))}
        </Text>
      ),
    },
    { title: '收款日期', dataIndex: 'receiptDate', width: 120, render: (v) => fmtDate(v) },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      width: 100,
      render: (value, record) => <ApprovalStatusTag status={value || 'DRAFT'} approvedAt={record.approvedAt} />,
    },
    { title: '备注', dataIndex: 'remark', width: 200, render: (v) => v || '-' },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v) => fmtDate(v) },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <ViewRecordButton resource="contract-receipts" id={record.id} />
          {canDelete ? (
            <Popconfirm
              title="删除收款记录"
              description="确定删除该收款记录吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : null}
          <ApprovalActions
            id={record.id}
            approvalStatus={record.approvalStatus || 'DRAFT'}
            approvedAt={record.approvedAt}
            resource="contract-receipts"
            onSuccess={() => {
              void loadReceipts(lastFilter)
              void loadContracts()
            }}
          />
        </Space>
      ),
    },
  ]

  const filterBar = (
    <FilterBar
      fields={[
        { type: 'select', key: 'contractId', placeholder: '选择合同', options: contractOptions, width: 250 },
      ]}
      onSearch={handleSearch}
      onReset={handleReset}
      loading={loading}
      extra={
        <Button
          size="small"
          icon={<DownloadOutlined />}
          type="text"
          style={{ color: '#8c8c8c' }}
          onClick={() => {
            const params = new URLSearchParams({ resourceType: 'contract-receipts' })
            const cId = (lastFilter.contractId as string) || ''
            const filterContract = contracts.find((item) => item.id === cId)
            if (filterContract?.projectId) {
              params.set('projectId', filterContract.projectId)
            }
            window.location.href = `/data-exports?${params.toString()}`
          }}
        >
          导出
        </Button>
      }
    />
  )

  const table = (
    <Table<ContractReceipt>
      rowKey="id"
      columns={columns}
      dataSource={receipts}
      loading={loading}
      size="small"
      scroll={{ x: 1400 }}
      pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: false }}
      locale={{
        emptyText: (
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无收款记录"
            desc="新增收款后，可在此查看合同收款、扣款与到账情况。"
            action={
              <Button type="primary" onClick={handleAddClick}>
                新增收款
              </Button>
            }
          />
        ),
      }}
    />
  )

  const mobileCards = (
    <>
      <MobileCardList<ContractReceipt>
        data={receipts.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE)}
        loading={loading}
        getKey={(item) => item.id}
        getTitle={(item) => item.contractName || '合同收款'}
        getDescription={(item) => `合同编号：${item.contractCode || '-'}`}
        getStatus={(item) => <ApprovalStatusTag status={item.approvalStatus || 'DRAFT'} approvedAt={item.approvedAt} />}
        fields={[
          {
            key: 'amount',
            label: '收款金额',
            render: (item) => (
              <Text strong style={{ color: '#52c41a' }}>
                {fmtMoney(Number(item.amount))}
              </Text>
            ),
          },
          {
            key: 'actualReceivedAmount',
            label: '到账金额',
            render: (item) => (
              <Text strong style={{ color: '#1677ff' }}>
                {fmtMoney(Number(item.actualReceivedAmount ?? (item.amount - item.deductionItems.reduce((sum, deduction) => sum + Number(deduction.amount || 0), 0))))}
              </Text>
            ),
          },
          { key: 'projectName', label: '项目名称', render: (item) => item.projectName || '-' },
          { key: 'receiptDate', label: '收款日期', render: (item) => fmtDate(item.receiptDate) },
          {
            key: 'deductionItems',
            label: '扣款明细',
            render: (item) =>
              item.deductionItems?.length
                ? item.deductionItems.map((deduction) => {
                  const parts = [`${deduction.type}:${fmtMoney(Number(deduction.amount))}`]
                  if (deduction.remark) parts.push(`备注:${deduction.remark}`)
                  if (deduction.attachmentUrl) parts.push('有附件')
                  return parts.join(' ')
                }).join(' / ')
                : '-',
            fullWidth: true,
          },
          { key: 'remark', label: '备注', render: (item) => item.remark || '-', fullWidth: true },
        ]}
        actions={(record) => (
          <Space size="small" wrap>
            <ViewRecordButton resource="contract-receipts" id={record.id} />
            {canDelete ? (
              <Popconfirm
                title="删除收款记录"
                description="确定删除该收款记录吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
            <ApprovalActions
              id={record.id}
              approvalStatus={record.approvalStatus || 'DRAFT'}
              approvedAt={record.approvedAt}
              resource="contract-receipts"
              onSuccess={() => {
                void loadReceipts(lastFilter)
                void loadContracts()
              }}
            />
          </Space>
        )}
        empty={
          <EmptyHint
            icon={<FileTextOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            title="暂无收款记录"
            desc="新增收款后，可在此查看合同收款、扣款与到账情况。"
            action={
              <Button type="primary" onClick={handleAddClick}>
                新增收款
              </Button>
            }
          />
        }
      />
      {receipts.length > MOBILE_PAGE_SIZE && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={mobilePage}
            pageSize={MOBILE_PAGE_SIZE}
            total={receipts.length}
            onChange={setMobilePage}
            showSizeChanger={false}
            size="small"
          />
        </div>
      )}
    </>
  )

  return (
    <>
      <LedgerPageLayout
        title="合同收款管理"
        desc="管理合同收款、扣款明细与到账金额"
        createLabel="新增收款"
        onCreate={handleAddClick}
        total={receipts.length}
        filterBar={filterBar}
        table={
          <>
            {summaryCards}
            {table}
          </>
        }
        mobileTable={
          <>
            {summaryCards}
            {mobileCards}
          </>
        }
      />

      <ResponsiveModalDrawer
        title="新增收款"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
          setDeductionItems([])
        }}
        width={640}
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
          <Form.Item label="合同" name="contractId" rules={[{ required: true, message: '请选择合同' }]}>
            <Select placeholder="请选择合同" loading={contractsLoading} options={contractOptions} />
          </Form.Item>

          {selectedContract && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                lineHeight: 1.8,
                color: '#595959',
              }}
            >
              <div style={{ marginBottom: 6, fontWeight: 500, color: '#1d1d1f' }}>合同信息</div>
              <div>合同名称：{selectedContract.name}</div>
              <div>项目名称：{selectedContract.projectName}</div>
              <div>应收金额：{fmtMoney(Number(selectedContract.receivableAmount))}</div>
              <div>已收金额：{fmtMoney(Number(selectedContract.receivedAmount))}</div>
              <div>未收金额：{fmtMoney(Number(selectedContract.unreceivedAmount))}</div>
            </div>
          )}

          <Form.Item
            label="收款金额"
            name="amount"
            rules={[
              { required: true, message: '请输入收款金额' },
              { type: 'number', min: 0, message: '收款金额必须大于 0' },
            ]}
          >
            <InputNumber placeholder="请输入收款金额" style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>
              扣款明细
              <span style={{ marginLeft: 12, color: '#fa8c16' }}>扣款合计：{fmtMoney(deductionTotal)}</span>
              <span style={{ marginLeft: 12, color: '#1677ff' }}>到账金额：{fmtMoney(actualReceivedAmount)}</span>
            </div>
            {deductionItems.map((item, index) => (
              <div key={index} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Select
                    value={item.type}
                    onChange={(value) =>
                      setDeductionItems((current) =>
                        current.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, type: value } : currentItem
                        )
                      )
                    }
                    options={DEDUCTION_TYPES.map((type) => ({ label: type, value: type }))}
                    style={{ width: 140 }}
                  />
                  <InputNumber
                    value={item.amount}
                    onChange={(value) =>
                      setDeductionItems((current) =>
                        current.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, amount: Number(value) || 0 } : currentItem
                        )
                      )
                    }
                    placeholder="金额"
                    precision={2}
                    min={0}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setDeductionItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  />
                </div>
                <Input
                  value={item.remark || ''}
                  onChange={(e) =>
                    setDeductionItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, remark: e.target.value } : currentItem
                      )
                    )
                  }
                  placeholder="扣款备注"
                  style={{ marginBottom: 8 }}
                />
                <AttachmentUploadField
                  value={item.attachmentUrl || null}
                  onChange={(value) =>
                    setDeductionItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? { ...currentItem, attachmentUrl: value } : currentItem
                      )
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setDeductionItems((current) => [...current, { type: '税金', amount: 0, remark: '', attachmentUrl: null }])}
            >
              添加扣款明细
            </Button>
          </div>

          <Form.Item label="收款日期" name="receiptDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="收款附件" name="attachmentUrl">
            <AttachmentUploadField />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </ResponsiveModalDrawer>
    </>
  )
}
