'use client'

import { useEffect, useState } from 'react'
import { Button, Upload, message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

function buildUploadedFile(url: string): UploadFile {
  return {
    uid: url,
    name: decodeURIComponent(url.split('/').pop() || '附件'),
    status: 'done',
    url,
  }
}

export default function AttachmentField({
  value,
  onChange,
  disabled,
}: {
  value?: string | null
  onChange?: (val: string | null) => void
  disabled?: boolean
}) {
  const [fileList, setFileList] = useState<UploadFile[]>(value ? [buildUploadedFile(value)] : [])

  useEffect(() => {
    setFileList(value ? [buildUploadedFile(value)] : [])
  }, [value])

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/upload',
    fileList,
    maxCount: 1,
    disabled,
    onChange(info) {
      const nextFileList = info.fileList.slice(-1)

      if (info.file.status === 'done') {
        const resp = info.file.response
        const url = resp?.data?.url || resp?.url
        if (url) {
          const uploadedFile = buildUploadedFile(url)
          setFileList([uploadedFile])
          onChange?.(url)
          message.success('上传成功')
          return
        }

        setFileList([])
        onChange?.(null)
        message.error('上传返回异常')
        return
      }

      if (info.file.status === 'error') {
        setFileList(nextFileList)
        const errMsg = info.file.response?.error || '上传失败'
        message.error(errMsg)
        return
      }

      setFileList(nextFileList)
    },
    onRemove() {
      setFileList([])
      onChange?.(null)
      return true
    },
  }

  return (
    <Upload {...uploadProps}>
      <Button icon={<UploadOutlined />} disabled={disabled}>
        上传附件
      </Button>
    </Upload>
  )
}
