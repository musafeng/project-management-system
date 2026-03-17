import type { Metadata } from 'next'
import './globals.css'
import LayoutProvider from './layout-provider'

export const metadata: Metadata = {
  title: '工程项目管理系统',
  description: '基于 Next.js + TypeScript + Ant Design + Prisma 的工程项目管理系统',
  viewport: 'width=device-width, initial-scale=1',
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
