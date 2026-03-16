'use client'

import { useEffect, useState } from 'react'
import { Layout, Menu, ConfigProvider, theme as antTheme, Button, Dropdown, Space, Spin, message } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ProjectOutlined,
  DollarOutlined,
  UserOutlined,
  BankOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { getCurrentAuthUser, logout } from '@/lib/auth-client'
import type { AuthUser } from '@/lib/auth-client'
import { filterMenuByRole } from '@/lib/menu-permissions'
import type { MenuPermissionConfig } from '@/lib/menu-permissions'
import { MENU_PERMISSIONS } from '@/lib/menu-permissions'

const { Sider, Header, Content } = Layout

/**
 * 菜单项类型
 */
interface MenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  children?: MenuItem[]
  disabled?: boolean
}

/**
 * 菜单配置（包含所有菜单，不做权限过滤）
 */
const MENU_ITEMS: MenuItem[] = [
  {
    key: '/',
    label: '项目收支总览',
    icon: <DashboardOutlined />,
  },
  {
    key: 'base-data',
    label: '基础资料',
    icon: <FileTextOutlined />,
    children: [
      {
        key: '/customers',
        label: '客户管理',
      },
      {
        key: '/suppliers',
        label: '供应商管理',
      },
      {
        key: '/labor-workers',
        label: '劳务人员管理',
      },
    ],
  },
  {
    key: 'project-mgmt',
    label: '项目管理',
    icon: <ProjectOutlined />,
    children: [
      {
        key: '/projects',
        label: '项目管理',
      },
      {
        key: '/construction-approvals',
        label: '施工立项管理',
      },
      {
        key: '/project-contracts',
        label: '项目合同管理',
      },
      {
        key: '/contract-receipts',
        label: '合同收款管理',
      },
    ],
  },
  {
    key: 'cost-mgmt',
    label: '成本管理',
    icon: <DollarOutlined />,
    children: [
      {
        key: '/procurement-contracts',
        label: '采购合同管理',
      },
      {
        key: '/procurement-payments',
        label: '采购付款管理',
      },
      {
        key: '/labor-contracts',
        label: '劳务合同管理',
      },
      {
        key: '/labor-payments',
        label: '劳务付款管理',
      },
      {
        key: '/subcontract-contracts',
        label: '分包合同管理',
      },
      {
        key: '/subcontract-payments',
        label: '分包付款管理',
      },
    ],
  },
  {
    key: 'system-mgmt',
    label: '系统管理',
    icon: <SettingOutlined />,
    children: [
      {
        key: '/action-logs',
        label: '操作日志',
      },
    ],
  },
]

/**
 * 根据权限配置过滤菜单项
 */
function filterMenuItemsByRole(items: MenuItem[], userRole: string | undefined): MenuItem[] {
  if (!userRole) {
    return []
  }

  return items
    .filter((item) => {
      // 查找权限配置
      const permConfig = findPermissionConfig(item.key, MENU_PERMISSIONS)
      if (!permConfig) {
        return false
      }
      return permConfig.roles.includes(userRole as any)
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuItemsByRole(item.children, userRole) : undefined,
    }))
    .filter((item) => {
      // 如果是分组菜单，必须有子菜单才显示
      if (item.children) {
        return item.children.length > 0
      }
      return true
    })
}

/**
 * 在权限配置中查找菜单项
 */
function findPermissionConfig(
  key: string,
  configs: MenuPermissionConfig[]
): MenuPermissionConfig | null {
  for (const config of configs) {
    if (config.key === key) {
      return config
    }
    if (config.children) {
      const found = findPermissionConfig(key, config.children)
      if (found) return found
    }
  }
  return null
}

/**
 * 转换菜单项为 Ant Design Menu 格式
 */
function transformMenuItems(items: MenuItem[]): MenuProps['items'] {
  return items.map((item) => {
    if (item.children) {
      return {
        key: item.key,
        label: item.label,
        icon: item.icon,
        children: transformMenuItems(item.children),
      }
    }
    return {
      key: item.key,
      label: item.label,
      icon: item.icon,
      disabled: item.disabled,
    }
  })
}

/**
 * 获取当前路由对应的菜单 key
 */
function getSelectedKey(pathname: string): string[] {
  // 精确匹配
  for (const item of MENU_ITEMS) {
    if (item.key === pathname) {
      return [item.key]
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.key === pathname) {
          return [child.key]
        }
      }
    }
  }
  return ['/']
}

/**
 * 获取当前路由对应的打开菜单组
 */
function getOpenKeys(pathname: string): string[] {
  for (const item of MENU_ITEMS) {
    if (item.children) {
      for (const child of item.children) {
        if (child.key === pathname) {
          return [item.key]
        }
      }
    }
  }
  return []
}

/**
 * 获取页面标题
 */
function getPageTitle(pathname: string): string {
  const findTitle = (items: MenuItem[]): string | null => {
    for (const item of items) {
      if (item.key === pathname) {
        return item.label
      }
      if (item.children) {
        const found = findTitle(item.children)
        if (found) return found
      }
    }
    return null
  }
  return findTitle(MENU_ITEMS) || '工程项目管理系统'
}

export default function LayoutProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [userLoading, setUserLoading] = useState(true)

  // 防止 hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // 加载当前登录用户
  useEffect(() => {
    if (!mounted) return

    const loadCurrentUser = async () => {
      try {
        setUserLoading(true)
        const user = await getCurrentAuthUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('加载当前用户失败:', error)
        setCurrentUser(null)
      } finally {
        setUserLoading(false)
      }
    }

    loadCurrentUser()
  }, [mounted])

  // 根据用户角色过滤菜单
  const filteredMenuItems = currentUser?.systemRole
    ? filterMenuItemsByRole(MENU_ITEMS, currentUser.systemRole)
    : MENU_ITEMS

  const selectedKey = getSelectedKey(pathname)
  const openKeys = getOpenKeys(pathname)
  const pageTitle = getPageTitle(pathname)

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const key = e.key as string
    // 如果是分组菜单，不跳转
    if (MENU_ITEMS.some((item) => item.key === key)) {
      return
    }
    router.push(key)
  }

  /**
   * 处理退出登录
   */
  const handleLogout = async () => {
    try {
      const success = await logout()
      if (success) {
        message.success('已退出登录')
        setCurrentUser(null)
        // 刷新页面
        router.refresh()
      } else {
        message.error('退出登录失败')
      }
    } catch (error) {
      console.error('退出登录失败:', error)
      message.error('退出登录失败')
    }
  }

  /**
   * 用户菜单项
   */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: `用户: ${currentUser?.name || '未知'}`,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'role',
      label: `角色: ${currentUser?.systemRole || '未知'}`,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontSize: 14,
        },
        algorithm: antTheme.defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 左侧菜单 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={220}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            overflow: 'auto',
          }}
          trigger={null}
        >
          {/* Logo 区域 */}
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #f0f0f0',
              padding: '0 16px',
            }}
          >
            <div
              style={{
                fontSize: collapsed ? 0 : 14,
                fontWeight: 600,
                color: '#1677ff',
                textAlign: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'font-size 0.2s',
              }}
            >
              {collapsed ? '' : '工程管理'}
            </div>
          </div>

          {/* 菜单 */}
          <Menu
            mode="inline"
            selectedKeys={selectedKey}
            defaultOpenKeys={openKeys}
            items={transformMenuItems(filteredMenuItems)}
            onClick={handleMenuClick}
            style={{
              border: 'none',
              background: '#fff',
            }}
          />
        </Sider>

        {/* 右侧内容区 */}
        <Layout
          style={{
            marginLeft: collapsed ? 80 : 220,
            transition: 'margin-left 0.2s',
          }}
        >
          {/* 顶部 Header */}
          <Header
            style={{
              background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 64,
              position: 'sticky',
              top: 0,
              zIndex: 99,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#1d1d1f',
              }}
            >
              {pageTitle}
            </div>

            {/* 右侧用户信息区 */}
            <Space>
              <div
                style={{
                  fontSize: 13,
                  color: '#8c8c8c',
                }}
              >
                工程项目管理系统
              </div>

              {/* 用户信息和退出按钮 */}
              {userLoading ? (
                <Spin size="small" />
              ) : currentUser ? (
                <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                  <Button
                    type="text"
                    icon={<UserOutlined />}
                    style={{
                      color: '#1677ff',
                      fontSize: 12,
                    }}
                  >
                    {currentUser.name}
                  </Button>
                </Dropdown>
              ) : (
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>浏览器模式</span>
              )}
            </Space>
          </Header>

          {/* 内容区 */}
          <Content
            style={{
              background: '#f5f5f5',
              padding: '16px 24px',
              minHeight: 'calc(100vh - 64px)',
              overflow: 'auto',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

