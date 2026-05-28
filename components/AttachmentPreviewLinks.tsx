'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Image, Modal, Space, Spin, Typography, message } from 'antd'
import { DownloadOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons'
import {
  type AttachmentPreviewType,
  getAttachmentDisplayName,
  getAttachmentOpenUrl,
  getAttachmentPreviewType,
  getAttachmentResolveUrl,
  parseAttachmentUrls,
} from '@/lib/attachments'

const { Text } = Typography

interface ResolvedAttachment {
  url: string
  name: string
  previewType: AttachmentPreviewType
}

interface AttachmentPreviewLinksProps {
  value?: unknown
  urls?: string[]
  emptyText?: string
}

function buildOfficeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
}

function PreviewBody({ attachment }: { attachment: ResolvedAttachment }) {
  const { url, name, previewType } = attachment

  if (previewType === 'image') {
    return (
      <div style={{ textAlign: 'center', maxHeight: '72vh', overflow: 'auto' }}>
        <Image
          src={url}
          alt={name}
          preview={false}
          style={{ maxWidth: '100%', height: 'auto', borderRadius: 6 }}
        />
      </div>
    )
  }

  if (previewType === 'pdf') {
    return (
      <iframe
        title={name}
        src={url}
        style={{ width: '100%', height: '72vh', border: '1px solid #f0f0f0', borderRadius: 6 }}
      />
    )
  }

  if (previewType === 'office') {
    return (
      <iframe
        title={name}
        src={buildOfficeViewerUrl(url)}
        style={{ width: '100%', height: '72vh', border: '1px solid #f0f0f0', borderRadius: 6 }}
      />
    )
  }

  if (previewType === 'text') {
    return (
      <iframe
        title={name}
        src={url}
        style={{ width: '100%', height: '72vh', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff' }}
      />
    )
  }

  return (
    <Alert
      type="info"
      showIcon
      message="此类型不支持直接预览"
      description="可以下载或在新窗口打开后查看。"
    />
  )
}

export default function AttachmentPreviewLinks({
  value,
  urls,
  emptyText = '暂无附件',
}: AttachmentPreviewLinksProps) {
  const attachmentUrls = useMemo(() => urls ?? parseAttachmentUrls(value), [urls, value])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState<ResolvedAttachment | null>(null)

  if (attachmentUrls.length === 0) return <Text type="secondary">{emptyText}</Text>

  const handlePreview = async (url: string) => {
    const fallbackName = getAttachmentDisplayName(url) || '附件'
    setOpen(true)
    setLoading(true)
    setCurrent({ url: getAttachmentOpenUrl(url), name: fallbackName, previewType: getAttachmentPreviewType(url) })

    try {
      const res = await fetch(getAttachmentResolveUrl(url), { credentials: 'include' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success || !json?.data?.url) {
        message.error(json?.error || '附件打开失败，请稍后重试')
        setOpen(false)
        return
      }
      setCurrent({
        url: json.data.url,
        name: json.data.name || fallbackName,
        previewType: json.data.previewType || getAttachmentPreviewType(url),
      })
    } catch {
      message.error('附件打开失败，请检查网络后重试')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Space direction="vertical" size={4}>
        {attachmentUrls.map((url) => {
          const name = getAttachmentDisplayName(url) || '查看附件'
          return (
            <Button
              key={url}
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => { void handlePreview(url) }}
              style={{ height: 'auto', padding: 0, whiteSpace: 'normal', textAlign: 'left' }}
            >
              <span style={{ wordBreak: 'break-all' }}>{name}</span>
            </Button>
          )
        })}
      </Space>

      <Modal
        title={current?.name || '附件预览'}
        open={open}
        onCancel={() => setOpen(false)}
        width="min(960px, 96vw)"
        footer={current ? (
          <Space>
            <Button icon={<FileOutlined />} href={current.url} target="_blank" rel="noreferrer">
              新窗口打开
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} href={current.url} target="_blank" rel="noreferrer">
              下载
            </Button>
          </Space>
        ) : null}
        destroyOnClose
      >
        <Spin spinning={loading}>
          {current ? <PreviewBody attachment={current} /> : null}
        </Spin>
      </Modal>
    </>
  )
}
