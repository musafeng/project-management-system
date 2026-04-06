'use client'

import { useState, useEffect } from 'react'
import { Button, Tag, Modal, Input, Space, message } from 'antd'
import { CheckOutlined, CloseOutlined, RollbackOutlined, SendOutlined } from '@ant-design/icons'
import {
  getApprovalErrorMessage,
  getApprovalNextStatus,
  getApprovalStatusLabel,
  getApprovalSuccessMessage,
} from '@/lib/approval-ui'

/**
 * 审批状态 Tag
 */
export function ApprovalStatusTag({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    APPROVED: { color: 'success', label: getApprovalStatusLabel('APPROVED') },
    PENDING: { color: 'warning', label: getApprovalStatusLabel('PENDING') },
    REJECTED: { color: 'error', label: getApprovalStatusLabel('REJECTED') },
    CANCELLED: { color: 'default', label: getApprovalStatusLabel('CANCELLED') },
  }
  const c = config[status] || { color: 'default', label: status }
  return <Tag color={c.color}>{c.label}</Tag>
}

/**
 * 审批操作按钮组
 *
 * 显示逻辑：
 * - approvalStatus = APPROVED / REJECTED / CANCELLED → 显示「提交审批」
 * - approvalStatus = PENDING → 查询后端，判断当前用户是否是审批人
 *   - 是审批人 → 显示「通过」「驳回」
 *   - 当前用户是发起人且启用撤回 → 显示「撤回」
 *   - 其他情况 → 不显示
 *
 * 不再依赖 isAdmin，完全基于 ProcessTask 配置
 */
export function ApprovalActions({
  id,
  approvalStatus,
  resource,
  onSuccess,
  enableCancel = false,
  // 保留 isAdmin 为可选，避免改动7个页面的 props 传递（忽略即可）
  isAdmin: _isAdmin,
}: {
  id: string
  approvalStatus: string
  resource: string
  onSuccess: (payload: { action: 'submit' | 'approve' | 'reject' | 'cancel'; nextStatus: string; message: string }) => void | Promise<void>
  enableCancel?: boolean
  isAdmin?: boolean
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectVisible, setRejectVisible] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [canApprove, setCanApprove] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [taskChecked, setTaskChecked] = useState(false)

  // 当状态为 PENDING 时，查询当前用户是否为审批人
  useEffect(() => {
    if (approvalStatus !== 'PENDING') {
      setCanApprove(false)
      setCanCancel(false)
      setTaskChecked(true)
      return
    }

    setTaskChecked(false)
    fetch(`/api/process-tasks/pending?resource=${encodeURIComponent(resource)}&resourceId=${encodeURIComponent(id)}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        setCanApprove(json.data?.canApprove ?? false)
        setCanCancel(Boolean(enableCancel && json.data?.canCancel))
      })
      .catch(() => {
        setCanApprove(false)
        setCanCancel(false)
      })
      .finally(() => setTaskChecked(true))
  }, [approvalStatus, resource, id, enableCancel])

  const call = async (action: 'submit' | 'approve' | 'reject' | 'cancel', body?: object) => {
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
        const successMessage = getApprovalSuccessMessage(action)
        message.success(successMessage)
        await Promise.resolve(onSuccess({
          action,
          nextStatus: getApprovalNextStatus(action),
          message: successMessage,
        }))
      } else {
        message.error(result.error || getApprovalErrorMessage(action))
      }
    } catch {
      message.error(`${getApprovalErrorMessage(action)}，请检查网络连接`)
    } finally {
      setLoading(null)
    }
  }

  const handleRejectConfirm = async () => {
    await call('reject', { reason: rejectReason })
    setRejectVisible(false)
    setRejectReason('')
  }

  // 非 PENDING 状态：显示「提交审批」
  if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED' || approvalStatus === 'CANCELLED') {
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

  // PENDING 状态：等待查询结果
  if (!taskChecked) {
    return null
  }

  // PENDING 状态，当前用户是审批人
  if (canApprove || canCancel) {
    return (
      <>
        <Space size="small">
          {canApprove ? (
            <>
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
            </>
          ) : null}
          {canCancel ? (
            <Button
              type="link"
              size="small"
              danger
              icon={<RollbackOutlined />}
              loading={loading === 'cancel'}
              onClick={() => {
                Modal.confirm({
                  title: '撤回审批',
                  content: '撤回后可继续编辑并重新提交审批，确定继续吗？',
                  okText: '确定撤回',
                  cancelText: '取消',
                  okButtonProps: { danger: true },
                  onOk: () => call('cancel'),
                })
              }}
            >
              撤回
            </Button>
          ) : null}
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

  // PENDING 状态，非审批人：不显示任何操作
  return null
}
