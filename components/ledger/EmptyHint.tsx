/**
 * EmptyHint — 友好空状态提示
 *
 * 用法：
 *   <EmptyHint
 *     icon={<FileTextOutlined />}
 *     title="还没有合同"
 *     desc="新增合同后，可在此查看全部合同信息"
 *     action={<Button type="primary" onClick={onCreate}>新增合同</Button>}
 *   />
 */
import type { ReactNode } from 'react'
import { InboxOutlined } from '@ant-design/icons'

interface EmptyHintProps {
  icon?: ReactNode
  title?: string
  desc?: string
  action?: ReactNode
  style?: React.CSSProperties
}

export function EmptyHint({
  icon = <InboxOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />,
  title = '暂无数据',
  desc,
  action,
  style,
}: EmptyHintProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 8,
        ...style,
      }}
    >
      {icon}
      <div style={{ fontSize: 15, fontWeight: 600, color: '#595959', marginTop: 8 }}>
        {title}
      </div>
      {desc && (
        <div style={{ fontSize: 13, color: '#8c8c8c', textAlign: 'center', maxWidth: 300 }}>
          {desc}
        </div>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}




