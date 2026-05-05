'use client'

type AmountSummaryItem = {
  label: string
  value: string
  color?: string
}

export default function AmountSummaryCards({
  items,
  isMobile = false,
}: {
  items: AmountSummaryItem[]
  isMobile?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            minWidth: isMobile ? 'calc(50% - 6px)' : 160,
            flex: isMobile ? '1 1 calc(50% - 6px)' : undefined,
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>{item.label}</div>
          <div style={{ color: item.color || '#1d1d1f', fontWeight: 700 }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
