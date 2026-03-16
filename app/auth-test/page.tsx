'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Space, Spin, Alert, Descriptions, Empty, Tag } from 'antd'
import { isDingTalkEnvironment, getCurrentUser } from '@/lib/dingtalk-client'
import { getCurrentAuthUser } from '@/lib/auth-client'

/**
 * 用户信息类型
 */
interface UserInfo {
  userid: string
  name: string
  mobile?: string
  unionid?: string
  deptIds?: number[]
  email?: string
  avatar?: string
}

export default function AuthTestPage() {
  const [inDingTalk, setInDingTalk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [hasAuthCookie, setHasAuthCookie] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  /**
   * 检查是否在钉钉环境
   */
  useEffect(() => {
    setMounted(true)
    const isDT = isDingTalkEnvironment()
    setInDingTalk(isDT)
  }, [])

  /**
   * 检查是否已有登录态
   */
  useEffect(() => {
    if (!mounted) return

    const checkAuth = async () => {
      try {
        setCheckingAuth(true)
        const user = await getCurrentAuthUser()
        if (user) {
          setHasAuthCookie(true)
          setUserInfo(user)
        } else {
          setHasAuthCookie(false)
        }
      } catch (error) {
        setHasAuthCookie(false)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [mounted])

  /**
   * 获取当前登录人并写入登录态
   */
  const handleGetCurrentUser = async () => {
    try {
      setLoading(true)
      setError(null)
      setUserInfo(null)

      const user = await getCurrentUser()
      setUserInfo(user)
      setHasAuthCookie(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      console.error('获取用户信息失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#f5f5f5',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        {/* 标题 */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 24,
            color: '#1d1d1f',
          }}
        >
          钉钉免登录测试
        </h1>

        {/* 登录态状态 */}
        {checkingAuth ? (
          <Card style={{ marginBottom: 20 }}>
            <Space>
              <Spin size="small" />
              <span>正在检查登录态...</span>
            </Space>
          </Card>
        ) : hasAuthCookie ? (
          <Alert
            message="当前已写入系统登录态"
            description="系统已识别到您的登录信息，可以在全局 Header 中看到您的用户名。"
            type="success"
            showIcon
            style={{ marginBottom: 20 }}
            action={
              <Tag color="green">已登录</Tag>
            }
          />
        ) : (
          <Alert
            message="当前未登录"
            description="点击下方按钮进行免登录认证，成功后会自动写入系统登录态。"
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {/* 环境检测 */}
        {!inDingTalk && (
          <Alert
            message="请在钉钉微应用中打开本页面进行测试"
            description="当前不在钉钉环境中，无法进行免登录认证。请在钉钉客户端中打开此页面。"
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {inDingTalk && (
          <Alert
            message="已检测到钉钉环境"
            description="当前在钉钉微应用环境中，可以进行免登录认证。"
            type="success"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {/* 操作卡片 */}
        <Card
          style={{
            marginBottom: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <p style={{ color: '#595959', marginBottom: 12 }}>
                点击下方按钮获取当前登录人的身份信息并写入系统登录态
              </p>
              <Button
                type="primary"
                size="large"
                onClick={handleGetCurrentUser}
                loading={loading}
                disabled={!inDingTalk}
                style={{ width: '100%' }}
              >
                {loading ? '正在获取...' : '获取当前登录人并写入登录态'}
              </Button>
            </div>
          </Space>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="获取失败"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 20 }}
          />
        )}

        {/* 用户信息展示 */}
        {userInfo && (
          <Card
            title="当前登录用户信息"
            style={{
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="用户 ID">
                <code>{userInfo.userid}</code>
              </Descriptions.Item>
              <Descriptions.Item label="用户名">
                {userInfo.name}
              </Descriptions.Item>
              {userInfo.mobile && (
                <Descriptions.Item label="手机号">
                  {userInfo.mobile}
                </Descriptions.Item>
              )}
              {userInfo.email && (
                <Descriptions.Item label="邮箱">
                  {userInfo.email}
                </Descriptions.Item>
              )}
              {userInfo.unionid && (
                <Descriptions.Item label="Union ID">
                  <code>{userInfo.unionid}</code>
                </Descriptions.Item>
              )}
              {userInfo.deptIds && userInfo.deptIds.length > 0 && (
                <Descriptions.Item label="部门 ID">
                  {userInfo.deptIds.join(', ')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Button onClick={() => setUserInfo(null)}>清除信息</Button>
            </div>
          </Card>
        )}

        {/* 空状态 */}
        {!userInfo && !error && !loading && !checkingAuth && (
          <Card
            style={{
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <Empty
              description="暂无用户信息"
              style={{ marginTop: 20, marginBottom: 20 }}
            />
          </Card>
        )}

        {/* 说明文档 */}
        <Card
          title="使用说明"
          style={{
            marginTop: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <ol style={{ color: '#595959', lineHeight: 1.8 }}>
            <li>确保在钉钉客户端中打开此页面</li>
            <li>点击{'"'}获取当前登录人并写入登录态{'"'}按钮</li>
            <li>系统会自动获取免登授权码</li>
            <li>后端通过授权码换取用户身份信息</li>
            <li>成功后会自动写入系统登录态（HttpOnly Cookie）</li>
            <li>页面显示当前登录用户的详细信息</li>
            <li>刷新页面后，全局 Header 会显示您的用户名</li>
            <li>点击用户名可以退出登录</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}

