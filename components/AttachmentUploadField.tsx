'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Space, Upload, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadRequestOption as RcCustomRequestOptions } from 'rc-upload/lib/interface'
import { toChineseErrorMessage } from '@/lib/api/error-message'
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

function resolveUploadFile(input: unknown): File | null {
  const candidate = (input as { originFileObj?: unknown } | null)?.originFileObj ?? input
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as File).arrayBuffer === 'function' &&
    typeof (candidate as File).name === 'string'
  ) {
    return candidate as File
  }
  return null
}

export default function AttachmentUploadField({
  value,
  onChange,
  disabled,
}: AttachmentUploadFieldProps) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const attachments = useMemo(() => parseAttachmentUrls(value), [value])
  const attachmentsRef = useRef<string[]>(attachments)
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve())
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

  const uploadSingleFile = async (file: File) => {
    setUploadingCount((count) => count + 1)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(getFriendlyUploadErrorMessage((json as { error?: unknown }).error))
      }
      if (!json.url || typeof json.url !== 'string') {
        throw new Error('上传成功但未返回附件地址')
      }
      emitChange([...attachmentsRef.current, json.url])
      message.success(`${json.name || '文件'} 上传成功`)
      return json.url
    } catch (err) {
      message.error(getFriendlyUploadErrorMessage(err))
      throw err
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1))
    }
  }

  const enqueueUpload = (file: File) => {
    uploadQueueRef.current = uploadQueueRef.current
      .catch(() => undefined)
      .then(() => uploadSingleFile(file))

    return uploadQueueRef.current
  }

  const handleCustomRequest = (options: RcCustomRequestOptions) => {
    const file = resolveUploadFile(options.file)
    if (!file) {
      options.onError?.(new Error('未识别到待上传文件'))
      return {
        abort() {},
      }
    }

    enqueueUpload(file)
      .then((url) => {
        options.onSuccess?.({ url }, file)
      })
      .catch((error: unknown) => {
        options.onError?.(error instanceof Error ? error : new Error('上传失败'))
      })

    return {
      abort() {},
    }
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
        customRequest={handleCustomRequest}
        showUploadList={false}
        fileList={[]}
        accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.7z"
      >
        <Button icon={<UploadOutlined />} loading={uploading} disabled={disabled}>
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
