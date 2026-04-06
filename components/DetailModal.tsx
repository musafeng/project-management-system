'use client'

import type { ReactNode } from 'react'
import { Descriptions, Modal, Spin } from 'antd'

export interface DetailItem {
  key: string
  label: string
  value: ReactNode
  span?: number
}

export default function DetailModal({
  title,
  open,
  loading,
  onClose,
  items,
  extra,
  toolbar,
}: {
  title: ReactNode
  open: boolean
  loading?: boolean
  onClose: () => void
  items: DetailItem[]
  extra?: ReactNode
  toolbar?: ReactNode
}) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <Spin spinning={Boolean(loading)}>
        {toolbar ? (
          <div style={{ marginTop: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            {toolbar}
          </div>
        ) : null}
        <Descriptions
          column={2}
          bordered
          size="small"
          style={{ marginTop: 16 }}
          items={items.map((item) => ({
            key: item.key,
            label: item.label,
            children: item.value,
            span: item.span ?? 1,
          }))}
        />
        {extra}
      </Spin>
    </Modal>
  )
}
