'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Space, Upload, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import {
  getAttachmentDisplayName,
  parseAttachmentUrls,
  serializeAttachmentUrls,
} from '@/lib/attachments'

interface AttachmentUploadFieldProps {
  value?: string | null
  onChange?: (value: string | null) => void
  disabled?: boolean
}

export default function AttachmentUploadField({
  value,
  onChange,
  disabled,
}: AttachmentUploadFieldProps) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const attachments = useMemo(() => parseAttachmentUrls(value), [value])
  const attachmentsRef = useRef<string[]>(attachments)
  const uploading = uploadingCount > 0

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  const emitChange = (nextUrls: string[]) => {
    const serialized = serializeAttachmentUrls(nextUrls)
    attachmentsRef.current = parseAttachmentUrls(serialized)
    onChange?.(serialized)
  }

  const handleUpload = async (file: File) => {
    setUploadingCount((count) => count + 1)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        message.error(typeof json.error === 'string' ? json.error : '上传失败')
        return false
      }
      emitChange([...attachmentsRef.current, json.url])
      message.success(`${json.name || '文件'} 上传成功`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ''
      message.error(errorMessage || '上传失败，请检查网络')
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1))
    }
    return false
  }

  const handleRemove = (targetUrl: string) => {
    emitChange(attachmentsRef.current.filter((url) => url !== targetUrl))
  }

  if (disabled) {
    return attachments.length > 0 ? (
      <Space direction="vertical" size={4}>
        {attachments.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
            {getAttachmentDisplayName(url) || url}
          </a>
        ))}
      </Space>
    ) : (
      <span style={{ color: '#999' }}>暂无附件</span>
    )
  }

  return (
    <Space wrap>
      <Upload
        multiple
        beforeUpload={handleUpload}
        showUploadList={false}
        disabled={uploading}
        accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.7z"
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          {uploading ? '上传中...' : '选择文件'}
        </Button>
      </Upload>
      <span style={{ color: '#999', fontSize: 12 }}>
        支持多选；图片 / PDF / Word / Excel / CSV / ZIP / RAR / 7Z，单文件最大 100MB
      </span>
      {attachments.length > 0 ? (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {attachments.map((url) => (
            <Space key={url} size={4} wrap>
              <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                {getAttachmentDisplayName(url) || '查看附件'}
              </a>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(url)}
              />
            </Space>
          ))}
        </Space>
      ) : null}
    </Space>
  )
}
