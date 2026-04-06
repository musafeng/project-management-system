'use client'

import { Button } from 'antd'
import { PaperClipOutlined } from '@ant-design/icons'
import { LEDGER_EMPTY_VALUE } from '@/lib/ledger-ui'

export default function AttachmentLink({
  url,
  emptyText = LEDGER_EMPTY_VALUE,
}: {
  url?: string | null
  emptyText?: string
}) {
  if (!url) {
    return <span style={{ color: '#8c8c8c' }}>{emptyText}</span>
  }

  return (
    <Button
      type="link"
      size="small"
      icon={<PaperClipOutlined />}
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{ paddingInline: 0 }}
    >
      查看附件
    </Button>
  )
}
