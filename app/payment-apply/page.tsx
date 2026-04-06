'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Steps, Form, Select, Button, InputNumber, DatePicker,
  Input, Card, Alert, Descriptions, Tag, Divider,
  message, Result, Spin, Typography, Space,
} from 'antd'
import {
  WalletOutlined, FileSearchOutlined, EditOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

// ============================================================
// 类型定义
// ============================================================

type PaymentType = 'procurement' | 'labor' | 'subcontract'

const PAYMENT_TYPE_CONFIG = {
  procurement: {
    label: '采购付款',
    desc: '向供应商支付的采购款项',
    contractApi: '/api/procurement-contracts',
    submitApi: '/api/procurement-payments',
    partyLabel: '供应商',
    contractLabel: '采购合同',
    color: '#1677ff',
  },
  labor: {
    label: '劳务付款',
    desc: '向劳务人员或班组支付的劳务费用',
    contractApi: '/api/labor-contracts',
    submitApi: '/api/labor-payments',
    partyLabel: '劳务人员',
    contractLabel: '劳务合同',
    color: '#52c41a',
  },
  subcontract: {
    label: '分包付款',
    desc: '向专业分包单位支付的分包款项',
    contractApi: '/api/subcontract-contracts',
    submitApi: '/api/subcontract-payments',
    partyLabel: '分包单位',
    contractLabel: '分包合同',
    color: '#fa8c16',
  },
} as const

interface ProjectOption {
  id: string
  name: string
  code: string
}

interface ContractOption {
  id: string
  code: string
  name: string
  contractAmount: number
  payableAmount: number
  paidAmount: number
  unpaidAmount: number
  approvalStatus: string
  // procurement
  supplierName?: string
  // labor
  laborWorkerName?: string
  workerName?: string
  // subcontract
  subcontractVendorName?: string
  vendorName?: string
}

interface FormValues {
  paymentType: PaymentType
  projectId: string
  contractId: string
  amount: number
  paymentDate: dayjs.Dayjs
  reason: string
  bankAccount: string
  bankName: string
  accountName: string
  remark: string
}

// ============================================================
import { fmtMoney } from '@/lib/utils/format'

function getPartyName(contract: ContractOption, type: PaymentType) {
  if (type === 'procurement') return contract.supplierName || '—'
  if (type === 'labor') return contract.laborWorkerName || contract.workerName || '—'
  return contract.subcontractVendorName || contract.vendorName || '—'
}

// ============================================================
// 步骤一：选择类型、项目、合同
// ============================================================

function StepOne({
  form,
  projects,
  contracts,
  loadingProjects,
  loadingContracts,
  selectedType,
  onTypeChange,
  onProjectChange,
  onContractChange,
}: {
  form: ReturnType<typeof Form.useForm>[0]
  projects: ProjectOption[]
  contracts: ContractOption[]
  loadingProjects: boolean
  loadingContracts: boolean
  selectedType: PaymentType | null
  onTypeChange: (v: PaymentType) => void
  onProjectChange: (v: string) => void
  onContractChange: (v: string) => void
}) {
  const cfg = selectedType ? PAYMENT_TYPE_CONFIG[selectedType] : null

  return (
    <div>
      <Title level={5} style={{ marginBottom: 4 }}>选择付款类型</Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>请先选择本次付款的业务类型，再选择对应的项目和合同。</Paragraph>

      {/* 付款类型卡片选择 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {(Object.keys(PAYMENT_TYPE_CONFIG) as PaymentType[]).map((type) => {
          const c = PAYMENT_TYPE_CONFIG[type]
          const active = selectedType === type
          return (
            <div
              key={type}
              onClick={() => onTypeChange(type)}
              style={{
                flex: '1 1 140px',
                minWidth: 140,
                padding: '14px 16px',
                border: `2px solid ${active ? c.color : '#e8e8e8'}`,
                borderRadius: 10,
                cursor: 'pointer',
                background: active ? `${c.color}08` : '#fafafa',
                transition: 'all 0.18s',
              }}
            >
              <div style={{ fontWeight: 700, color: active ? c.color : '#333', fontSize: 15 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>{c.desc}</div>
            </div>
          )
        })}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="projectId"
          label="所属项目"
          rules={[{ required: true, message: '请选择项目，合同列表将根据项目自动筛选' }]}
        >
          <Select
            showSearch
            loading={loadingProjects}
            placeholder="请选择项目"
            optionFilterProp="label"
            disabled={!selectedType}
            onChange={onProjectChange}
            options={projects.map((p) => ({
              value: p.id,
              label: `${p.name}（${p.code}）`,
            }))}
            notFoundContent={loadingProjects ? <Spin size="small" /> : '暂无项目'}
          />
        </Form.Item>

        <Form.Item
          name="contractId"
          label={cfg ? cfg.contractLabel : '关联合同'}
          rules={[{ required: true, message: '请选择合同' }]}
          extra={!form.getFieldValue('projectId') ? '请先选择项目' : undefined}
        >
          <Select
            showSearch
            loading={loadingContracts}
            placeholder={form.getFieldValue('projectId') ? '请选择合同' : '请先选择项目'}
            optionFilterProp="label"
            disabled={!form.getFieldValue('projectId')}
            onChange={onContractChange}
            options={contracts.map((c) => ({
              value: c.id,
              label: `${c.code} — ${c.name}`,
              disabled: c.approvalStatus !== 'APPROVED',
            }))}
            notFoundContent={loadingContracts ? <Spin size="small" /> : '该项目下暂无合同'}
          />
        </Form.Item>
      </Form>

      {selectedType && (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={`只有"审批通过"的${cfg!.contractLabel}才能申请付款。未通过审批的合同将显示为灰色不可选。`}
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  )
}

// ============================================================
// 步骤二：合同信息确认（自动带出）
// ============================================================

function StepTwo({
  contract,
  paymentType,
}: {
  contract: ContractOption
  paymentType: PaymentType
}) {
  const cfg = PAYMENT_TYPE_CONFIG[paymentType]
  const unpaid = Number(contract.unpaidAmount)
  const paid = Number(contract.paidAmount)
  const payable = Number(contract.payableAmount)
  const contractAmt = Number(contract.contractAmount)

  const paidPercent = payable > 0 ? Math.round((paid / payable) * 100) : 0
  const remainPercent = 100 - paidPercent

  return (
    <div>
      <Title level={5} style={{ marginBottom: 4 }}>确认合同信息</Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>以下信息由系统自动带出，请核对无误后继续。</Paragraph>

      <Card
        bordered
        style={{ borderColor: cfg.color, borderRadius: 10, marginBottom: 16 }}
        styles={{ header: { background: `${cfg.color}0d`, borderBottom: `1px solid ${cfg.color}30` } }}
        title={
          <Space>
            <Tag color={cfg.color}>{cfg.label}</Tag>
            <span style={{ fontWeight: 600 }}>{contract.code}</span>
          </Space>
        }
      >
        <Descriptions column={2} size="small" styles={{ label: { color: '#8c8c8c' } }}>
          <Descriptions.Item label="合同名称" span={2}>{contract.name}</Descriptions.Item>
          <Descriptions.Item label={cfg.partyLabel}>
            <Text strong>{getPartyName(contract, paymentType)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="合同总金额">
            <Text strong style={{ color: '#1677ff' }}>{fmtMoney(contractAmt)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="应付金额">{fmtMoney(payable)}</Descriptions.Item>
          <Descriptions.Item label="已付金额">{fmtMoney(paid)}</Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '12px 0' }} />

        {/* 付款进度条 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13 }}>付款进度</Text>
            <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{paidPercent}% 已支付</Text>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${paidPercent}%`, background: cfg.color, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
        </div>

        <Alert
          style={{ marginTop: 12 }}
          type={unpaid > 0 ? 'success' : 'warning'}
          showIcon
          message={
            unpaid > 0
              ? <span>本合同剩余可付：<Text strong style={{ color: '#52c41a', fontSize: 15 }}>{fmtMoney(unpaid)}</Text></span>
              : '该合同款项已全部支付，无剩余可付金额'
          }
        />
      </Card>

      {unpaid <= 0 && (
        <Alert
          type="error"
          showIcon
          message="该合同已无剩余可付金额，无法继续申请付款。请返回重新选择合同。"
        />
      )}
    </div>
  )
}

// ============================================================
// 步骤三：填写付款信息
// ============================================================

function StepThree({
  form,
  maxAmount,
  paymentType,
}: {
  form: ReturnType<typeof Form.useForm>[0]
  maxAmount: number
  paymentType: PaymentType
}) {
  return (
    <div>
      <Title level={5} style={{ marginBottom: 4 }}>填写付款信息</Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>请填写本次付款的详细信息，带 <Text type="danger">*</Text> 为必填项。</Paragraph>

      <Form form={form} layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item
            name="amount"
            label="本次付款金额（元）"
            rules={[
              { required: true, message: '请填写付款金额' },
              {
                validator: (_, v) => {
                  if (!v || v <= 0) return Promise.reject('付款金额必须大于 0')
                  if (v > maxAmount) return Promise.reject(`付款金额不能超过剩余可付金额 ${fmtMoney(maxAmount)}`)
                  return Promise.resolve()
                },
              },
            ]}
            extra={`最多可申请：${fmtMoney(maxAmount)}`}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={maxAmount}
              precision={2}
              placeholder="请输入金额"
              prefix="¥"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v?.replace(/,/g, '') as any}
            />
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="付款日期"
            rules={[{ required: true, message: '请选择付款日期' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" placeholder="选择日期" />
          </Form.Item>
        </div>

        <Form.Item
          name="reason"
          label="付款事由"
          rules={[{ required: true, message: '请简要说明本次付款的用途或原因' }]}
        >
          <Input.TextArea
            rows={2}
            placeholder={paymentType === 'labor' ? '例：2024年3月劳务费结算' : '例：第二批原材料采购款'}
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Divider orientation="left" style={{ fontSize: 13, color: '#8c8c8c' }}>收款账户信息（选填）</Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="accountName" label="收款方户名">
            <Input placeholder="请输入银行账户名称" />
          </Form.Item>
          <Form.Item name="bankName" label="开户银行">
            <Input placeholder="例：中国工商银行" />
          </Form.Item>
          <Form.Item name="bankAccount" label="银行账号" style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="请输入完整银行账号" />
          </Form.Item>
        </div>
      </Form>
    </div>
  )
}

// ============================================================
// 步骤四：确认提交
// ============================================================

function StepFour({
  values,
  contract,
  paymentType,
  submitting,
}: {
  values: Partial<FormValues>
  contract: ContractOption
  paymentType: PaymentType
  submitting: boolean
}) {
  const cfg = PAYMENT_TYPE_CONFIG[paymentType]

  return (
    <div>
      <Title level={5} style={{ marginBottom: 4 }}>确认并提交</Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>提交前请再次核对以下信息，提交后将自动进入审批流程。</Paragraph>

      <Card bordered style={{ borderRadius: 10, marginBottom: 16 }}>
        <Descriptions column={2} size="small" styles={{ label: { color: '#8c8c8c', width: 110 } }}>
          <Descriptions.Item label="付款类型">
            <Tag color={cfg.color}>{cfg.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={cfg.partyLabel}>
            <Text strong>{getPartyName(contract, paymentType)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={cfg.contractLabel} span={2}>
            {contract.code} — {contract.name}
          </Descriptions.Item>
          <Descriptions.Item label="本次付款金额">
            <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
              {fmtMoney(values.amount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="付款日期">
            {values.paymentDate?.format('YYYY年MM月DD日') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="付款事由" span={2}>
            {values.reason || '—'}
          </Descriptions.Item>
          {values.accountName && (
            <Descriptions.Item label="收款方户名" span={2}>{values.accountName}</Descriptions.Item>
          )}
          {values.bankName && (
            <Descriptions.Item label="开户银行">{values.bankName}</Descriptions.Item>
          )}
          {values.bankAccount && (
            <Descriptions.Item label="银行账号">{values.bankAccount}</Descriptions.Item>
          )}
          {values.remark && (
            <Descriptions.Item label="备注" span={2}>{values.remark}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="提交后将自动进入审批流程"
        description="本次付款申请提交后，系统将自动推送给相关审批人员，请确认信息无误再提交。审批期间无法修改。"
      />

      <div style={{ marginBottom: 16 }}>
        <Form.Item name="remark" label="备注（选填）">
          <Input.TextArea rows={2} placeholder="如有其他说明请在此填写" maxLength={500} showCount />
        </Form.Item>
      </div>
    </div>
  )
}

// ============================================================
// 主页面
// ============================================================

export default function PaymentApplyPage() {
  const [step, setStep] = useState(0)
  const [form1] = Form.useForm()
  const [form3] = Form.useForm()
  const [form4] = Form.useForm()

  const [selectedType, setSelectedType] = useState<PaymentType | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [contracts, setContracts] = useState<ContractOption[]>([])
  const [selectedContract, setSelectedContract] = useState<ContractOption | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // 加载项目列表
  useEffect(() => {
    if (!selectedType) return
    setLoadingProjects(true)
    fetch('/api/projects', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setProjects(j.data || [])
      })
      .catch(() => message.error('加载项目失败'))
      .finally(() => setLoadingProjects(false))
  }, [selectedType])

  const handleTypeChange = useCallback((type: PaymentType) => {
    setSelectedType(type)
    setContracts([])
    setSelectedContract(null)
    form1.resetFields(['projectId', 'contractId'])
  }, [form1])

  const handleProjectChange = useCallback(async (projectId: string) => {
    if (!selectedType) return
    form1.resetFields(['contractId'])
    setSelectedContract(null)
    setContracts([])
    setLoadingContracts(true)
    const cfg = PAYMENT_TYPE_CONFIG[selectedType]
    try {
      const res = await fetch(`${cfg.contractApi}?projectId=${projectId}`, { credentials: 'include' })
      const j = await res.json()
      if (j.success) setContracts(j.data || [])
    } catch {
      message.error('加载合同失败')
    } finally {
      setLoadingContracts(false)
    }
  }, [selectedType, form1])

  const handleContractChange = useCallback((contractId: string) => {
    const c = contracts.find((c) => c.id === contractId) || null
    setSelectedContract(c)
  }, [contracts])

  // 步骤一下一步
  const handleStep1Next = async () => {
    if (!selectedType) { message.warning('请先选择付款类型'); return }
    try {
      await form1.validateFields()
    } catch { return }
    if (!selectedContract) { message.warning('请选择合同'); return }
    if (selectedContract.approvalStatus !== 'APPROVED') {
      message.error('所选合同尚未审批通过，无法申请付款')
      return
    }
    setStep(1)
  }

  // 步骤二下一步
  const handleStep2Next = () => {
    if (!selectedContract) return
    const unpaid = Number(selectedContract.unpaidAmount)
    if (unpaid <= 0) {
      message.error('该合同已无剩余可付金额，请返回重新选择')
      return
    }
    setStep(2)
  }

  // 步骤三下一步
  const handleStep3Next = async () => {
    try {
      await form3.validateFields()
      setStep(3)
    } catch { /* 校验失败自动提示 */ }
  }

  // 提交
  const handleSubmit = async () => {
    if (!selectedType || !selectedContract) return
    const step3Values = form3.getFieldsValue()
    const step4Values = form4.getFieldsValue()
    const cfg = PAYMENT_TYPE_CONFIG[selectedType]

    const payload = {
      contractId: selectedContract.id,
      amount: Number(step3Values.amount),
      paymentDate: step3Values.paymentDate?.toISOString(),
      reason: step3Values.reason,
      bankAccount: step3Values.bankAccount || undefined,
      bankName: step3Values.bankName || undefined,
      accountName: step3Values.accountName || undefined,
      remark: step4Values.remark || undefined,
    }

    setSubmitting(true)
    try {
      const res = await fetch(cfg.submitApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (j.success) {
        // 自动提交审批
        if (j.data?.id) {
          const resourceType = {
            procurement: 'procurement-payments',
            labor: 'labor-payments',
            subcontract: 'subcontract-payments',
          }[selectedType]
          const submitRes = await fetch(`/api/${resourceType}/${j.data.id}/submit`, {
            method: 'POST',
            credentials: 'include',
          })
          const submitJson = await submitRes.json().catch(() => null)
          if (!submitRes.ok || !submitJson?.success) {
            message.error(submitJson?.error || '付款申请已创建，但提交审批失败，请联系管理员在对应付款台账中继续处理')
            return
          }
        }
        setDone(true)
      } else {
        message.error(j.error || '提交失败，请稍后重试')
      }
    } catch {
      message.error('网络异常，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 提交成功页
  if (done) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <Result
          status="success"
          title="付款申请已提交！"
          subTitle="系统已将您的付款申请推送给审批人，请耐心等待审批结果。审批进度可在「审批中心 → 我发起的」中查看。"
          extra={[
            <Button type="primary" key="approval" onClick={() => window.location.href = '/approval?tab=mine'}>
              查看审批进度
            </Button>,
            <Button key="new" onClick={() => {
              setDone(false); setStep(0); setSelectedType(null)
              setSelectedContract(null); setContracts([])
              form1.resetFields(); form3.resetFields(); form4.resetFields()
            }}>
              再次申请
            </Button>,
          ]}
        />
      </div>
    )
  }

  const step3Values = form3.getFieldsValue()
  const maxAmount = selectedContract ? Number(selectedContract.unpaidAmount) : 0

  const STEPS = [
    { title: '选择类型', icon: <FileSearchOutlined /> },
    { title: '核对合同', icon: <WalletOutlined /> },
    { title: '填写信息', icon: <EditOutlined /> },
    { title: '确认提交', icon: <CheckCircleOutlined /> },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', maxWidth: 780, margin: '0 auto' }}>
      {/* 页眉 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <WalletOutlined style={{ fontSize: 22, color: '#1677ff' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>付款申请</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>分步填写，提交后自动进入审批流程</Text>
        </div>
      </div>

      {/* 步骤条 */}
      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 32 }}
        items={STEPS.map((s) => ({ title: s.title, icon: s.icon }))}
      />

      {/* 内容区 */}
      <div style={{ minHeight: 320 }}>
        {step === 0 && (
          <StepOne
            form={form1}
            projects={projects}
            contracts={contracts}
            loadingProjects={loadingProjects}
            loadingContracts={loadingContracts}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
            onProjectChange={handleProjectChange}
            onContractChange={handleContractChange}
          />
        )}
        {step === 1 && selectedContract && selectedType && (
          <StepTwo contract={selectedContract} paymentType={selectedType} />
        )}
        {step === 2 && (
          <StepThree
            form={form3}
            maxAmount={maxAmount}
            paymentType={selectedType!}
          />
        )}
        {step === 3 && selectedContract && selectedType && (
          <>
            <StepFour
              values={step3Values}
              contract={selectedContract}
              paymentType={selectedType}
              submitting={submitting}
            />
            <Form form={form4} layout="vertical">
              <Form.Item name="remark" label="备注（选填）">
                <Input.TextArea rows={2} placeholder="如有其他说明请在此填写" maxLength={500} showCount />
              </Form.Item>
            </Form>
          </>
        )}
      </div>

      <Divider />

      {/* 底部按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          上一步
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>第 {step + 1} 步，共 4 步</Text>
        {step < 3 ? (
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            iconPosition="end"
            onClick={[handleStep1Next, handleStep2Next, handleStep3Next][step]}
          >
            下一步
          </Button>
        ) : (
          <Button
            type="primary"
            size="large"
            loading={submitting}
            icon={<CheckCircleOutlined />}
            onClick={handleSubmit}
            style={{ background: '#52c41a', borderColor: '#52c41a', minWidth: 140 }}
          >
            确认提交，进入审批
          </Button>
        )}
      </div>
    </div>
  )
}
