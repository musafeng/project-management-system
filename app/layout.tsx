import type { Metadata, Viewport } from 'next'
import './globals.css'
import LayoutProvider from './layout-provider'

export const metadata: Metadata = {
  title: '工程项目管理系统 v1-mobile-fix',
  description: '基于 Next.js + TypeScript + Ant Design + Prisma 的工程项目管理系统',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <LayoutProvider>{children}</LayoutProvider>
      </body>
    </html>
  )
}
