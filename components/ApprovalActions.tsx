'use client'

import { useState } from 'react'
import { Button, Tag, Modal, Input, Space, message } from 'antd'
import { CheckOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons'

/**
 * 审批状态 Tag
 */
export function ApprovalStatusTag({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    APPROVED: { color: 'success', label: '已通过' },
    PENDING: { color: 'warning', label: '待审批' },
    REJECTED: { color: 'error', label: '已驳回' },
  }
  const c = config[status] || { color: 'default', label: status }
  return <Tag color={c.color}>{c.label}</Tag>
}

/**
 * 审批操作按钮组
 * - APPROVED / REJECTED 状态：显示「提交审批」
 * - PENDING 状态（且 isAdmin）：显示「通过」「驳回」
 */
export function ApprovalActions({
  id,
  approvalStatus,
  resource,
  isAdmin,
  onSuccess,
}: {
  id: string
  approvalStatus: string
  resource: string   // e.g. 'construction-approvals'
  isAdmin: boolean
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectVisible, setRejectVisible] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const call = async (action: string, body?: object) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/${resource}/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })
      const result = await res.json()
      if (result.success) {
        const labels: Record<string, string> = {
          submit: '已提交审批',
          approve: '审批通过',
          reject: '已驳回',
        }
        message.success(labels[action] || '操作成功')
        onSuccess()
      } else {
        message.error(result.error || '操作失败')
      }
    } catch {
      message.error('操作失败，请检查网络')
    } finally {
      setLoading(null)
    }
  }

  const handleRejectConfirm = async () => {
    await call('reject', { reason: rejectReason })
    setRejectVisible(false)
    setRejectReason('')
  }

  if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') {
    return (
      <Button
        type="link"
        size="small"
        icon={<SendOutlined />}
        loading={loading === 'submit'}
        onClick={() => call('submit')}
      >
        提交审批
      </Button>
    )
  }

  if (approvalStatus === 'PENDING' && isAdmin) {
    return (
      <>
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            style={{ color: '#52c41a' }}
            loading={loading === 'approve'}
            onClick={() => call('approve')}
          >
            通过
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<CloseOutlined />}
            loading={loading === 'reject'}
            onClick={() => setRejectVisible(true)}
          >
            驳回
          </Button>
        </Space>
        <Modal
          title="驳回原因"
          open={rejectVisible}
          onOk={handleRejectConfirm}
          onCancel={() => { setRejectVisible(false); setRejectReason('') }}
          okText="确认驳回"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Input.TextArea
            rows={3}
            placeholder="请输入驳回原因（可选）"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ marginTop: 12 }}
          />
        </Modal>
      </>
    )
  }

  // PENDING 非 ADMIN：只展示状态，无操作
  return null
}

