'use client'

import { useState } from 'react'
import { Button } from 'antd'
import type { ButtonProps } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import BusinessRecordDetailModal from './BusinessRecordDetailModal'

interface ViewRecordButtonProps extends Omit<ButtonProps, 'onClick'> {
  resource: string
  id: string
  label?: string
}

export default function ViewRecordButton({
  resource,
  id,
  label = '查看',
  size = 'small',
  type = 'link',
  icon = <EyeOutlined />,
  ...buttonProps
}: ViewRecordButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        {...buttonProps}
        type={type}
        size={size}
        icon={icon}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <BusinessRecordDetailModal
        open={open}
        resource={resource}
        id={id}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
