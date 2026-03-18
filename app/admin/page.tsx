'use client'

import { Suspense, useEffect, useState } from 'react'
import { Button, Result, Spin, Typography, Alert } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentAuthUser } from '@/lib/auth-client'
import { clientEnv } from '@/lib/env'
import type { AuthUser } from '@/lib/auth-client'

const { Title, Text } = Typography

function checkIsSystemManagerClient(user: AuthUser | null): boolean {
  if (!user) return false
  if (user.systemRole === 'ADMIN') return true
  if (user.userid && clientEnv.systemManagerIds.length > 0) {
    return clientEnv.systemManagerIds.includes(user.userid)
  }
  return false
}

// 内部组件：使用 useSearchParams，必须在 Suspense 内
function AdminPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorMsg = searchParams.get('error')

  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    getCurrentAuthUser().then((u) => {
      setUser(u)
      setChecking(false)
      if (u && checkIsSystemManagerClient(u)) {
        router.replace('/admin/dashboard')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div style={containerStyle}>
        <Spin size="large" tip="正在检查登录状态…" />
      </div>
    )
  }

  // 已登录但无权限
  if (user && !checkIsSystemManagerClient(user)) {
    return (
      <div style={containerStyle}>
        <Result
          status="403"
          title="无权限访问管理后台"
          subTitle={`当前登录用户「${user.name}」不是系统管理员，如需访问请联系管理员。`}
          extra={
            <Button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                setUser(null)
              }}
            >
              退出并重新登录
            </Button>
          }
        />
      </div>
    )
  }

  // 未登录，显示登录入口
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Logo 区 */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
          }}>
            🏗️
          </div>
          <Title level={3} style={{ margin: 0, color: '#1d1d1f' }}>工程项目管理系统</Title>
          <Text style={{ color: '#8c8c8c', fontSize: 14 }}>管理后台</Text>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <Alert
            type="error"
            message={decodeURIComponent(errorMsg)}
            style={{ marginBottom: 24, borderRadius: 8 }}
            showIcon
          />
        )}

        {/* 登录说明 */}
        <div style={{
          background: '#f6f9ff',
          border: '1px solid #d6e4ff',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <Text style={{ color: '#555', fontSize: 13, lineHeight: '22px' }}>
            管理后台仅供系统管理员使用。<br />
            点击下方按钮，使用钉钉账号扫码或手机授权登录。
          </Text>
        </div>

        {/* 登录按钮 */}
        <Button
          type="primary"
          size="large"
          block
          style={{
            height: 48,
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            border: 'none',
          }}
          onClick={() => { window.location.href = '/api/auth/dingtalk-web/start' }}
        >
          使用钉钉登录
        </Button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text style={{ fontSize: 12, color: '#bbb' }}>
            仅限系统管理员访问 · 业务端请从钉钉工作台进入
          </Text>
        </div>
      </div>
    </div>
  )
}

// 导出页面：用 Suspense 包裹使用 useSearchParams 的内部组件
export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div style={containerStyle}>
          <Spin size="large" />
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  )
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f7ff 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: '40px 36px',
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 8px 40px rgba(22, 119, 255, 0.10)',
}
