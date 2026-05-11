'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Progress, Space, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { toChineseErrorMessage } from '@/lib/api/error-message'
import {
  getAttachmentDisplayName,
  getAttachmentOpenUrl,
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const attachments = useMemo(() => parseAttachmentUrls(value), [value])
  const attachmentsRef = useRef<string[]>(attachments)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploading = uploadingCount > 0

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  const emitChange = (nextUrls: string[]) => {
    const serialized = serializeAttachmentUrls(nextUrls)
    attachmentsRef.current = parseAttachmentUrls(serialized)
    onChange?.(serialized)
  }

  const getFriendlyUploadErrorMessage = (input: unknown) => {
    const text = typeof input === 'string' ? input : input instanceof Error ? input.message : ''
    const translated = toChineseErrorMessage(text)
    if (/[\u4e00-\u9fa5]/.test(translated)) {
      return translated
    }
    return '上传失败，请检查网络后重试'
  }

  const uploadSingleFile = (file: File): Promise<string | undefined> => {
    const key = `${file.name}-${Date.now()}`
    setUploadingCount((c) => c + 1)
    setUploadProgress((prev) => ({ ...prev, [key]: 0 }))

    return new Promise((resolve) => {
      const fd = new FormData()
      fd.append('file', file)
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploadProgress((prev) => ({ ...prev, [key]: pct }))
        }
      }

      xhr.onload = () => {
        setUploadingCount((c) => Math.max(0, c - 1))
        setUploadProgress((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
        try {
          const json = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            if (!json.url || typeof json.url !== 'string') {
              message.error('上传成功但未返回附件地址')
              resolve(undefined)
              return
            }
            emitChange([...attachmentsRef.current, json.url])
            message.success(`${json.name || '文件'} 上传成功`)
            resolve(json.url)
          } else {
            message.error(getFriendlyUploadErrorMessage(json.error))
            resolve(undefined)
          }
        } catch {
          message.error('上传失败，请检查网络后重试')
          resolve(undefined)
        }
      }

      xhr.onerror = () => {
        setUploadingCount((c) => Math.max(0, c - 1))
        setUploadProgress((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
        message.error('上传失败，请检查网络后重试')
        resolve(undefined)
      }

      xhr.open('POST', '/api/upload')
      xhr.send(fd)
    })
  }

  const enqueueUpload = (file: File) => {
    return uploadSingleFile(file)
  }

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    for (const file of files) {
      void enqueueUpload(file)
    }

    // 同一批文件再次选择时，也要确保 change 事件还能触发
    event.target.value = ''
  }

  const handleRemove = (targetUrl: string) => {
    emitChange(attachmentsRef.current.filter((url) => url !== targetUrl))
  }

  if (disabled) {
    return attachments.length > 0 ? (
      <Space direction="vertical" size={4}>
        {attachments.map((url) => (
          <a key={url} href={getAttachmentOpenUrl(url)} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
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
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.7z"
        style={{ display: 'none' }}
        onChange={handleSelectFiles}
        disabled={disabled}
      />
      <Button
        icon={<UploadOutlined />}
        loading={uploading}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? '上传中...' : '选择文件'}
      </Button>
      <span style={{ color: '#999', fontSize: 12 }}>
        支持多选；图片 / PDF / Word / Excel / CSV / ZIP / RAR / 7Z，单文件最大 100MB
      </span>
      {Object.entries(uploadProgress).map(([key, pct]) => (
        <div key={key} style={{ width: '100%', minWidth: 200 }}>
          <Progress percent={pct} size="small" status={pct < 100 ? 'active' : 'success'} />
        </div>
      ))}
      {attachments.length > 0 ? (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {attachments.map((url) => (
            <Space key={url} size={4} wrap>
              <a href={getAttachmentOpenUrl(url)} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
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
