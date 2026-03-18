/**
 * LedgerPageLayout — 台账页面统一布局
 *
 * 用法：
 *   <LedgerPageLayout
 *     title="销售合同"
 *     desc="管理所有项目的销售合同，跟踪收款进度"
 *     onCreate={() => setModalOpen(true)}
 *     createLabel="新增合同"
 *     filterBar={...}
 *     table={...}
 *     total={total}
 *   />
 */
import type { ReactNode } from 'react'
import { Button, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface LedgerPageLayoutProps {
  /** 页面标题 */
  title: string
  /** 一句话说明，帮助用户快速理解页面用途 */
  desc?: string
  /** 新建按钮点击事件 */
  onCreate?: () => void
  /** 新建按钮文字（默认「新建」） */
  createLabel?: string
  /** 筛选栏区域（传入 FilterBar 组件） */
  filterBar?: ReactNode
  /** 表格区域 */
  table: ReactNode
  /** 总条数，显示在标题旁 */
  total?: number
  /** 额外操作（放在新建按钮旁，如导出） */
  headerExtra?: ReactNode
}

export function LedgerPageLayout({
  title,
  desc,
  onCreate,
  createLabel = '新建',
  filterBar,
  table,
  total,
  headerExtra,
}: LedgerPageLayoutProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px 24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── 页眉 ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 2,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            {total != null && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                共 {total} 条
              </Text>
            )}
          </div>
          {desc && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
              {desc}
            </Text>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {headerExtra}
          {onCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreate}
            >
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      {/* ── 筛选栏 ── */}
      {filterBar}

      {/* ── 表格 ── */}
      <div style={{ marginTop: 4 }}>
        {table}
      </div>
    </div>
  )
}

