'use client'

import { Card, Empty, Spin } from 'antd'
import type { ReactNode } from 'react'

export interface MobileCardField<T> {
  key: string
  label: string
  render: (record: T) => ReactNode
  fullWidth?: boolean
}

interface MobileCardListProps<T> {
  data: T[]
  loading?: boolean
  fields: MobileCardField<T>[]
  getKey: (record: T) => string
  getTitle: (record: T) => ReactNode
  getStatus?: (record: T) => ReactNode
  getDescription?: (record: T) => ReactNode
  actions?: (record: T) => ReactNode
  empty?: ReactNode
}

export function MobileCardList<T>({
  data,
  loading,
  fields,
  getKey,
  getTitle,
  getStatus,
  getDescription,
  actions,
  empty,
}: MobileCardListProps<T>) {
  return (
    <Spin spinning={loading}>
      {data.length === 0 ? (
        empty ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {data.map((item) => (
            <Card
              key={getKey(item)}
              size="small"
              style={{
                borderRadius: 12,
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              }}
              title={(
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#1f1f1f',
                        wordBreak: 'break-word',
                      }}
                    >
                      {getTitle(item)}
                    </div>
                    {getDescription && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                        {getDescription(item)}
                      </div>
                    )}
                  </div>
                  {getStatus?.(item)}
                </div>
              )}
              bodyStyle={{ padding: 14 }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px 12px',
                }}
              >
                {fields.map((field) => (
                  <div key={field.key} style={{ gridColumn: field.fullWidth ? '1 / -1' : undefined }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
                      {field.label}
                    </div>
                    <div style={{ fontSize: 13, color: '#262626', wordBreak: 'break-word' }}>
                      {field.render(item)}
                    </div>
                  </div>
                ))}
              </div>

              {actions && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  {actions(item)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Spin>
  )
}
