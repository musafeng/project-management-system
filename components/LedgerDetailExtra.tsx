'use client'

import { useRef, type ReactNode, type RefObject } from 'react'
import { Descriptions, Divider, List, Space, Tag, Typography } from 'antd'
import { getApprovalStatusLabel, getProcessTaskStatusLabel } from '@/lib/approval-ui'
import {
  getApprovalTrailActionLabel,
  getApprovalTrailEffectHint,
  getApprovalTrailActorLabel,
  getApprovalTrailHint,
  getChangeImpactHint,
  getChangeTypeLabel,
  getDisplayText,
  getLinkedFlowStatusText,
} from '@/lib/ledger-ui'
import { fmtDate, fmtMoney } from '@/lib/utils/format'

const { Text } = Typography

export interface LedgerSummaryItem {
  key: string
  label: string
  value: ReactNode
}

export interface LedgerFlowRecord {
  id: string
  date?: string | null
  amount?: number | null
  method?: string | null
  number?: string | null
  status?: string | null
  approvalStatus?: string | null
}

export interface LedgerChangeRecord {
  id: string
  changedAt?: string | null
  beforeAmount?: number | null
  changeAmount?: number | null
  afterAmount?: number | null
  changeType?: string | null
  reason?: string | null
  approvalStatus?: string | null
}

export interface LedgerApprovalTrailRecord {
  id: string
  nodeName: string
  status?: string | null
  operatorName?: string | null
  handledAt?: string | null
  createdAt?: string | null
  comment?: string | null
}

export default function LedgerDetailExtra({
  summaryItems,
  summaryHint,
  actionBar,
  flowTitle,
  flows,
  flowEmptyText,
  onFlowClick,
  activeFlowId,
  changeTitle,
  changes,
  changeEmptyText,
  approvalTitle,
  approvalTrails,
  approvalEmptyText,
}: {
  summaryItems: LedgerSummaryItem[]
  summaryHint?: ReactNode
  actionBar?: ReactNode
  flowTitle: string
  flows?: LedgerFlowRecord[]
  flowEmptyText?: string
  onFlowClick?: (flow: LedgerFlowRecord) => void
  activeFlowId?: string
  changeTitle?: string
  changes?: LedgerChangeRecord[]
  changeEmptyText?: string
  approvalTitle?: string
  approvalTrails?: LedgerApprovalTrailRecord[]
  approvalEmptyText?: string
}) {
  const changeRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const approvalRef = useRef<HTMLDivElement | null>(null)

  const scrollToSection = (ref: RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Divider orientation="left" style={{ marginTop: 0 }}>业务摘要</Divider>
      <Descriptions
        column={2}
        bordered
        size="small"
        items={summaryItems.map((item) => ({
          key: item.key,
          label: item.label,
          children: item.value,
        }))}
      />
      {summaryHint ? (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {summaryHint}
        </Text>
      ) : null}
      <Space size="middle" wrap style={{ marginTop: 12 }}>
        {changeTitle ? (
          <Typography.Link onClick={() => scrollToSection(changeRef)}>
            查看变更记录
          </Typography.Link>
        ) : null}
        {flowTitle ? (
          <Typography.Link onClick={() => scrollToSection(flowRef)}>
            查看最近流水
          </Typography.Link>
        ) : null}
        {approvalTitle ? (
          <Typography.Link onClick={() => scrollToSection(approvalRef)}>
            查看审批轨迹
          </Typography.Link>
        ) : null}
      </Space>
      {actionBar ? (
        <div style={{ marginTop: 12 }}>
          {actionBar}
        </div>
      ) : null}

      {changeTitle ? (
        <div ref={changeRef}>
          <Divider orientation="left">{changeTitle}</Divider>
          <List
            size="small"
            bordered
            locale={{ emptyText: changeEmptyText || `暂无${changeTitle}` }}
            dataSource={changes || []}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong>
                      {`${getChangeTypeLabel(item.changeType)}：${item.changeAmount === null || item.changeAmount === undefined ? getDisplayText() : fmtMoney(item.changeAmount)}`}
                    </Text>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {`时间：${fmtDate(item.changedAt || null)} · 变更前：${item.beforeAmount === null || item.beforeAmount === undefined ? getDisplayText() : fmtMoney(item.beforeAmount)} · 变更后：${item.afterAmount === null || item.afterAmount === undefined ? getDisplayText() : fmtMoney(item.afterAmount)}`}
                    </div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {`说明：${getDisplayText(item.reason)}`}
                    </div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {getChangeImpactHint(item.changeAmount, item.afterAmount, item.approvalStatus)}
                    </div>
                  </div>
                  <Space direction="vertical" size={4} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                    <Text type="secondary">{getApprovalStatusLabel(item.approvalStatus)}</Text>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </div>
      ) : null}

      <div ref={flowRef}>
        <Divider orientation="left">{flowTitle}</Divider>
        <List
          size="small"
          bordered
          locale={{ emptyText: flowEmptyText || `暂无${flowTitle}` }}
          dataSource={flows || []}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <Text strong>{item.amount === null || item.amount === undefined ? getDisplayText() : fmtMoney(item.amount)}</Text>
                  <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                    {`日期：${fmtDate(item.date || null)} · 方式：${getDisplayText(item.method)} · 单号：${getDisplayText(item.number)}`}
                  </div>
                </div>
                <Space direction="vertical" size={4} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                  <Text type="secondary">{getLinkedFlowStatusText(item.status, item.approvalStatus)}</Text>
                  {item.id === activeFlowId ? (
                    <Tag color="processing">当前查看</Tag>
                  ) : null}
                  {onFlowClick ? (
                    <Typography.Link onClick={() => onFlowClick(item)}>
                      {item.id === activeFlowId ? '切换到这条记录' : '查看原单'}
                    </Typography.Link>
                  ) : null}
                </Space>
              </div>
            </List.Item>
          )}
        />
      </div>

      {approvalTitle ? (
        <div ref={approvalRef}>
          <Divider orientation="left">{approvalTitle}</Divider>
          <List
            size="small"
            bordered
            locale={{ emptyText: approvalEmptyText || `暂无${approvalTitle}` }}
            dataSource={approvalTrails || []}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong>{item.nodeName}</Text>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {`动作：${getApprovalTrailActionLabel(item.status)}`}
                    </div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {`${getApprovalTrailActorLabel(item.status)}：${getDisplayText(item.operatorName)} · 时间：${fmtDate(item.handledAt || item.createdAt || null)}`}
                    </div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {`处理意见：${getDisplayText(item.comment)}`}
                    </div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {getApprovalTrailHint(item.status, item.comment)}
                    </div>
                    <div style={{ color: '#8c8c8c', marginTop: 4 }}>
                      {getApprovalTrailEffectHint(item.status)}
                    </div>
                  </div>
                  <Space direction="vertical" size={4} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                    <Text type="secondary">{getProcessTaskStatusLabel(item.status)}</Text>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </div>
      ) : null}
    </div>
  )
}
