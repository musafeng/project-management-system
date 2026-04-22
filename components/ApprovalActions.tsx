'use client'

import { useState, useEffect } from 'react'
import { Button, Tag, Modal, Input, Space, message } from 'antd'
import { CheckOutlined, CloseOutlined, SendOutlined, NotificationOutlined } from '@ant-design/icons'
import { toChineseErrorMessage } from '@/lib/api/error-message'

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

function getFriendlyActionErrorMessage(input: unknown, fallback: string) {
  const text = typeof input === 'string' ? input : input instanceof Error ? input.message : ''
  const translated = toChineseErrorMessage(text)
  return /[\u4e00-\u9fa5]/.test(translated) ? translated : fallback
}

/**
 * 审批操作按钮组
 *
 * 显示逻辑：
 * - 统一以最新流程实例状态为准
 * - 未提交 / 已驳回：显示「提交审批」
 * - 审批中：显示当前节点；审批人可见「通过」「驳回」，发起人可见「催办」
 * - 已审批完成：不再显示「提交审批」
 *
 * 不再依赖 isAdmin，完全基于 ProcessTask 配置
 */
export function ApprovalActions({
  id,
  approvalStatus,
  resource,
  onSuccess,
  // 保留 isAdmin 为可选，避免改动7个页面的 props 传递（忽略即可）
  isAdmin: _isAdmin,
}: {
  id: string
  approvalStatus: string
  resource: string
  onSuccess: () => void
  isAdmin?: boolean
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectVisible, setRejectVisible] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [canApprove, setCanApprove] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)
  const [canUrge, setCanUrge] = useState(false)
  const [latestStatus, setLatestStatus] = useState<string | null>(null)
  const [currentNodeName, setCurrentNodeName] = useState<string | null>(null)
  const [taskChecked, setTaskChecked] = useState(false)

  // 查询最新流程状态和当前用户可执行动作
  useEffect(() => {
    setTaskChecked(false)
    fetch(`/api/process-tasks/pending?resource=${encodeURIComponent(resource)}&resourceId=${encodeURIComponent(id)}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        setCanApprove(json.data?.canApprove ?? false)
        setCanSubmit(json.data?.canSubmit ?? false)
        setCanUrge(json.data?.canUrge ?? false)
        setLatestStatus(json.data?.latestStatus ?? null)
        setCurrentNodeName(json.data?.task?.nodeName ?? null)
      })
      .catch(() => {
        setCanApprove(false)
        setCanSubmit(approvalStatus !== 'PENDING')
        setCanUrge(false)
        setLatestStatus(null)
        setCurrentNodeName(null)
      })
      .finally(() => setTaskChecked(true))
  }, [approvalStatus, resource, id])

  const call = async (action: string, body?: object) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/${resource}/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })
      const result = await res.json().catch(() => null)
      if (result && typeof result === 'object' && 'success' in result && result.success) {
        const labels: Record<string, string> = {
          submit: '已提交审批',
          approve: '审批通过',
          reject: '已驳回',
        }
        message.success(labels[action] || '操作成功')
        onSuccess()
      } else {
        const rawError =
          result && typeof result === 'object' && 'error' in result
            ? (result as { error?: unknown }).error
            : res.statusText
        message.error(getFriendlyActionErrorMessage(rawError, '操作失败，请稍后重试'))
      }
    } catch (error) {
      message.error(getFriendlyActionErrorMessage(error, '操作失败，请检查网络'))
    } finally {
      setLoading(null)
    }
  }

  const handleRejectConfirm = async () => {
    await call('reject', { reason: rejectReason })
    setRejectVisible(false)
    setRejectReason('')
  }

  if (!taskChecked) {
    return null
  }

  const progressHint =
    latestStatus === 'PENDING' && currentNodeName ? (
      <Tag color="processing" style={{ marginInlineEnd: 0 }}>
        当前：{currentNodeName}
      </Tag>
    ) : null

  if (canSubmit) {
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

  if (latestStatus === 'PENDING' && canApprove) {
    return (
      <>
        <Space size="small" wrap>
          {progressHint}
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

  if (latestStatus === 'PENDING') {
    return (
      <Space size="small" wrap>
        {progressHint}
        {canUrge && (
          <Button
            type="link"
            size="small"
            icon={<NotificationOutlined />}
            loading={loading === 'urge'}
            onClick={() => call('urge')}
          >
            催办
          </Button>
        )}
      </Space>
    )
  }

  return null
}
