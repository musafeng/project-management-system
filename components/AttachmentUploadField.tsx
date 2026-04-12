'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Space, Upload, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'

interface AttachmentUploadFieldProps {
  value?: string | null
  onChange?: (value: string | null) => void
  disabled?: boolean
}

function getDisplayName(url?: string | null) {
  if (!url) return ''
  const parts = url.split('/')
  const raw = parts[parts.length - 1] || ''
  const name = raw.replace(/^\d+-/, '')
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

export default function AttachmentUploadField({
  value,
  onChange,
  disabled,
}: AttachmentUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')

  const currentUrl = value || ''
  const fallbackName = useMemo(() => getDisplayName(currentUrl), [currentUrl])

  useEffect(() => {
    setFileName(fallbackName)
  }, [fallbackName])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        message.error(json.error || '上传失败')
        return false
      }
      onChange?.(json.url)
      setFileName(json.name || getDisplayName(json.url))
      message.success(`${json.name || '文件'} 上传成功`)
    } catch {
      message.error('上传失败，请检查网络')
    } finally {
      setUploading(false)
    }
    return false
  }

  const handleClear = () => {
    onChange?.(null)
    setFileName('')
  }

  if (disabled) {
    return currentUrl ? (
      <a href={currentUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
        {fileName || fallbackName || currentUrl}
      </a>
    ) : (
      <span style={{ color: '#999' }}>暂无附件</span>
    )
  }

  return (
    <Space wrap>
      <Upload
        beforeUpload={handleUpload}
        showUploadList={false}
        disabled={uploading}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          {uploading ? '上传中...' : '选择文件'}
        </Button>
      </Upload>
      {currentUrl ? (
        <Space size={4}>
          <a href={currentUrl} target="_blank" rel="noreferrer">
            {fileName || fallbackName || '查看附件'}
          </a>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={handleClear} />
        </Space>
      ) : (
        <span style={{ color: '#999', fontSize: 12 }}>支持 图片 / PDF / Word / Excel / ZIP，最大 100MB</span>
      )}
    </Space>
  )
}
