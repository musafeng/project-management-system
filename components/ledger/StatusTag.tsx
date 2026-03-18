/**
 * StatusTag — 统一业务状态标签
 *
 * 用法：
 *   <StatusTag status="PENDING" map={CONTRACT_STATUS_MAP} />
 */
import { Tag } from 'antd'
import type { ReactNode } from 'react'

export interface StatusConfig {
  label: string
  color: string
  icon?: ReactNode
}

// ── 内置状态映射表（各页面可直接 import 使用）────────────────

export const CONTRACT_STATUS: Record<string, StatusConfig> = {
  DRAFT:      { label: '草稿',   color: 'default' },
  PENDING:    { label: '审批中', color: 'orange' },
  APPROVED:   { label: '已批准', color: 'blue' },
  EXECUTING:  { label: '执行中', color: 'processing' },
  COMPLETED:  { label: '已完成', color: 'success' },
  TERMINATED: { label: '已终止', color: 'error' },
  CANCELLED:  { label: '已取消', color: 'default' },
}

export const APPROVAL_STATUS: Record<string, StatusConfig> = {
  PENDING:   { label: '审批中', color: 'orange' },
  APPROVED:  { label: '已通过', color: 'success' },
  REJECTED:  { label: '已驳回', color: 'error' },
  CANCELLED: { label: '已撤销', color: 'default' },
}

export const PROJECT_STATUS: Record<string, StatusConfig> = {
  PLANNING:    { label: '规划中', color: 'default' },
  APPROVED:    { label: '已批准', color: 'blue' },
  IN_PROGRESS: { label: '进行中', color: 'processing' },
  SUSPENDED:   { label: '暂停中', color: 'warning' },
  COMPLETED:   { label: '已完成', color: 'success' },
  CANCELLED:   { label: '已取消', color: 'error' },
}

export const PAYMENT_STATUS: Record<string, StatusConfig> = {
  UNPAID:  { label: '未付', color: 'default' },
  PARTIAL: { label: '部分付款', color: 'orange' },
  PAID:    { label: '已付', color: 'success' },
  OVERPAID:{ label: '超付', color: 'error' },
}

// ── 组件本体 ─────────────────────────────────────────────────

interface StatusTagProps {
  status: string
  map: Record<string, StatusConfig>
  size?: 'small' | 'default'
}

export function StatusTag({ status, map, size = 'default' }: StatusTagProps) {
  const cfg = map[status] ?? { label: status, color: 'default' }
  return (
    <Tag
      color={cfg.color}
      icon={cfg.icon}
      style={size === 'small' ? { fontSize: 11, padding: '0 5px' } : undefined}
    >
      {cfg.label}
    </Tag>
  )
}

