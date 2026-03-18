'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Button, Typography, Space, Tag, Spin, Result } from 'antd'
import { useRouter } from 'next/navigation'
import {
  UserOutlined,
  ApartmentOutlined,
  SettingOutlined,
  FormOutlined,
  GlobalOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { getCurrentAuthUser, logout } from '@/lib/auth-client'
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

const ADMIN_CARDS = [
  {
    title: '用户管理',
    desc: '查看和管理系统用户、角色配置',
    icon: <UserOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
    href: '/system-users',
    color: '#e8f4ff',
  },
  {
    title: '组织管理',
    desc: '维护组织架构和成员归属',
    icon: <ApartmentOutlined style={{ fontSize: 28, color: '#52c41a' }} />,
    href: '/org-units',
    color: '#f0fff0',
  },
  {
    title: '审批流程配置',
    desc: '配置各业务模块的审批节点和审批人',
    icon: <SettingOutlined style={{ fontSize: 28, color: '#faad14' }} />,
    href: '/process-definitions',
    color: '#fffbe6',
  },
  {
    title: '表单配置管理',
    desc: '配置业务表单字段，支持动态渲染',
    icon: <FormOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
    href: '/form-definitions',
    color: '#f9f0ff',
  },
  {
    title: '区域管理',
    desc: '配置工作空间区域，管理数据归属',
    icon: <GlobalOutlined style={{ fontSize: 28, color: '#13c2c2' }} />,
    href: '/regions',
    color: '#e6fffb',
  },
  {
    title: '数据下载中心',
    desc: '按模块和区域导出业务数据 CSV',
    icon: <DownloadOutlined style={{ fontSize: 28, color: '#eb2f96' }} />,
    href: '/data-exports',
    color: '#fff0f6',
  },
  {
    title: '操作日志',
    desc: '查看系统操作审计记录',
    icon: <FileTextOutlined style={{ fontSize: 28, color: '#fa8c16' }} />,
    href: '/action-logs',
    color: '#fff7e6',
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getCurrentAuthUser().then((u) => {
      setUser(u)
      setChecking(false)
    })
  }, [])

  const handleLogout = async () => {
    await logout()
    router.replace('/api/auth/dingtalk-web/start')
  }

  if (checking) {
    return (
      <div style={containerStyle}>
        <Spin size="large" tip="加载中…" />
      </div>
    )
  }

  if (!user || !checkIsSystemManagerClient(user)) {
    return (
      <div style={containerStyle}>
        <Result
          status="403"
          title="无访问权限"
          subTitle="请使用管理员账号通过钉钉扫码登录"
          extra={
            <Button type="primary" onClick={() => router.replace('/api/auth/dingtalk-web/start')}>
              钉钉扫码登录
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: 960 }}>
        {/* 顶部 Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          padding: '16px 24px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <Space size={12}>
            <span style={{ fontSize: 22 }}>🏗️</span>
            <div>
              <Title level={5} style={{ margin: 0, color: '#1d1d1f' }}>工程项目管理系统 — 管理后台</Title>
              <Text style={{ fontSize: 12, color: '#8c8c8c' }}>系统管理员专属入口</Text>
            </div>
          </Space>
          <Space size={12}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{user.name}</div>
              <Tag color={user.systemRole === 'ADMIN' ? 'blue' : 'purple'} style={{ fontSize: 11 }}>
                {user.systemRole === 'ADMIN' ? '系统管理员' : '授权管理员'}
              </Tag>
            </div>
            <Button
              icon={<LogoutOutlined />}
              size="small"
              onClick={handleLogout}
            >
              退出
            </Button>
          </Space>
        </div>

        {/* 功能卡片 */}
        <Row gutter={[16, 16]}>
          {ADMIN_CARDS.map((card) => (
            <Col key={card.title} xs={24} sm={12} md={8}>
              <Card
                hoverable
                onClick={() => router.push(card.href)}
                style={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                bodyStyle={{ padding: '24px 20px' }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  {card.icon}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1d1d1f', marginBottom: 6 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 13, color: '#8c8c8c', lineHeight: '20px' }}>
                  {card.desc}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Text style={{ fontSize: 12, color: '#bbb' }}>
            点击卡片进入对应管理页面 · 业务员工请从钉钉工作台进入系统
          </Text>
        </div>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 60%, #f5f7ff 100%)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 24px',
}

