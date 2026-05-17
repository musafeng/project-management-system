/**
 * ResponsiveModalDrawer
 *
 * PC 端渲染 antd Modal，手机端渲染全屏 Drawer（placement="bottom" height="100dvh"）。
 * 仅替换容器视觉，不改变表单 children、提交逻辑、API。
 */
'use client'

import { Modal, Drawer, Button, Space } from 'antd'
import type { ButtonProps } from 'antd'
import type { ReactNode, CSSProperties } from 'react'
import { useMobile } from '@/hooks/useMobile'

const MOBILE_FULLSCREEN_CLASS = 'rmd-fullscreen-mobile'

const MOBILE_FULLSCREEN_CSS = `
.${MOBILE_FULLSCREEN_CLASS} .ant-drawer-content-wrapper {
  height: 100vh !important;
  height: 100dvh !important;
  max-height: 100vh;
  max-height: 100dvh;
}
.${MOBILE_FULLSCREEN_CLASS} .ant-drawer-content {
  border-radius: 0 !important;
}
.${MOBILE_FULLSCREEN_CLASS} .ant-drawer-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.${MOBILE_FULLSCREEN_CLASS} .ant-drawer-body {
  -webkit-overflow-scrolling: touch;
}
`

interface ResponsiveModalDrawerProps {
  open: boolean
  title?: ReactNode
  onOk?: () => void
  onCancel: () => void
  okText?: ReactNode
  cancelText?: ReactNode
  okButtonProps?: ButtonProps
  cancelButtonProps?: ButtonProps
  confirmLoading?: boolean
  /** 自定义 footer。传 null 表示无 footer。 */
  footer?: ReactNode | null
  /** PC 端 Modal 宽度。手机端忽略（始终全宽 Drawer）。 */
  width?: number | string
  /** 关闭时销毁子节点，防止表单状态残留。 */
  destroyOnClose?: boolean
  children?: ReactNode
  bodyStyle?: CSSProperties
  className?: string
  /** 手机端 Drawer 高度。默认 100dvh（带 100vh CSS 兜底）。仅在需要非全屏时覆盖。 */
  mobileHeight?: string | number
}

export default function ResponsiveModalDrawer({
  open,
  title,
  onOk,
  onCancel,
  okText = '确定',
  cancelText = '取消',
  okButtonProps,
  cancelButtonProps,
  confirmLoading,
  footer,
  width,
  destroyOnClose,
  children,
  bodyStyle,
  className,
  mobileHeight,
}: ResponsiveModalDrawerProps) {
  const isMobile = useMobile()

  if (!isMobile) {
    return (
      <Modal
        open={open}
        title={title}
        onOk={onOk}
        onCancel={onCancel}
        okText={okText}
        cancelText={cancelText}
        okButtonProps={okButtonProps}
        cancelButtonProps={cancelButtonProps}
        confirmLoading={confirmLoading}
        footer={footer}
        width={width}
        destroyOnClose={destroyOnClose}
        bodyStyle={bodyStyle}
        className={className}
      >
        {children}
      </Modal>
    )
  }

  const renderFooter = () => {
    if (footer === null) return null
    if (footer !== undefined) return footer
    return (
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} size={8}>
        <Button
          size="large"
          onClick={onCancel}
          disabled={confirmLoading}
          {...cancelButtonProps}
        >
          {cancelText}
        </Button>
        {onOk && (
          <Button
            type="primary"
            size="large"
            loading={confirmLoading}
            onClick={onOk}
            {...okButtonProps}
          >
            {okText}
          </Button>
        )}
      </Space>
    )
  }

  const useFullscreen = mobileHeight === undefined
  const mergedClassName = [className, useFullscreen ? MOBILE_FULLSCREEN_CLASS : null]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {useFullscreen && (
        <style dangerouslySetInnerHTML={{ __html: MOBILE_FULLSCREEN_CSS }} />
      )}
      <Drawer
        open={open}
        title={title}
        onClose={onCancel}
        placement="bottom"
        height={useFullscreen ? '100dvh' : mobileHeight}
        destroyOnClose={destroyOnClose}
        className={mergedClassName}
        bodyStyle={{
          padding: 16,
          paddingBottom: 24,
          ...bodyStyle,
        }}
        footer={renderFooter()}
        footerStyle={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        {children}
      </Drawer>
    </>
  )
}

