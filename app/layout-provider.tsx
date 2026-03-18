'use client'

import { useEffect, useState } from 'react'
import { Layout, Menu, ConfigProvider, theme as antTheme, Button, Dropdown, Space, Spin, message, Drawer } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ProjectOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { getCurrentAuthUser, logout } from '@/lib/auth-client'
import type { AuthUser } from '@/lib/auth-client'
import { isDingTalkEnvironment, getCurrentUser as getDingTalkUser } from '@/lib/dingtalk-client'
import { MENU_PERMISSIONS } from '@/lib/menu-permissions'
import type { MenuPermissionConfig } from '@/lib/menu-permissions'

const { Sider, Header, Content } = Layout

// 版本号，用于确认钉钉打开的是最新部署
export const APP_VERSION = 'v1-mobile-fix'

interface MenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  children?: MenuItem[]
  disabled?: boolean
}

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
      { key: '/customers', label: '客户管理' },
      { key: '/suppliers', label: '供应商管理' },
      { key: '/labor-workers', label: '劳务人员管理' },
    ],
  },
  {
    key: 'project-mgmt',
    label: '项目管理',
    icon: <ProjectOutlined />,
    children: [
      { key: '/projects', label: '项目管理' },
      { key: '/construction-approvals', label: '施工立项管理' },
      { key: '/project-contracts', label: '项目合同管理' },
      { key: '/contract-receipts', label: '合同收款管理' },
    ],
  },
  {
    key: 'cost-mgmt',
    label: '成本管理',
    icon: <DollarOutlined />,
    children: [
      { key: '/procurement-contracts', label: '采购合同管理' },
      { key: '/procurement-payments', label: '采购付款管理' },
      { key: '/labor-contracts', label: '劳务合同管理' },
      { key: '/labor-payments', label: '劳务付款管理' },
      { key: '/subcontract-contracts', label: '分包合同管理' },
      { key: '/subcontract-payments', label: '分包付款管理' },
    ],
  },
  {
    key: 'system-mgmt',
    label: '系统管理',
    icon: <SettingOutlined />,
    children: [
      { key: '/action-logs', label: '操作日志' },
      { key: '/system-users', label: '用户管理' },
      { key: '/regions', label: '区域管理' },
      { key: '/org-units', label: '组织管理' },
    ],
  },
]

function filterMenuItemsByRole(items: MenuItem[], userRole: string | undefined): MenuItem[] {
  if (!userRole) return []
  return items
    .filter((item) => {
      const permConfig = findPermissionConfig(item.key, MENU_PERMISSIONS)
      if (!permConfig) return false
      return permConfig.roles.includes(userRole as any)
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuItemsByRole(item.children, userRole) : undefined,
    }))
    .filter((item) => {
      if (item.children) return item.children.length > 0
      return true
    })
}

function findPermissionConfig(
  key: string,
  configs: MenuPermissionConfig[]
): MenuPermissionConfig | null {
  for (const config of configs) {
    if (config.key === key) return config
    if (config.children) {
      const found = findPermissionConfig(key, config.children)
      if (found) return found
    }
  }
  return null
}

function transformMenuItems(items: MenuItem[]): MenuProps['items'] {
  return items.map((item) => {
    if (item.children) {
      return { key: item.key, label: item.label, icon: item.icon, children: transformMenuItems(item.children) }
    }
    return { key: item.key, label: item.label, icon: item.icon, disabled: item.disabled }
  })
}

function getSelectedKey(pathname: string): string[] {
  for (const item of MENU_ITEMS) {
    if (item.key === pathname) return [item.key]
    if (item.children) {
      for (const child of item.children) {
        if (child.key === pathname) return [child.key]
      }
    }
  }
  return ['/']
}

function getOpenKeys(pathname: string): string[] {
  for (const item of MENU_ITEMS) {
    if (item.children) {
      for (const child of item.children) {
        if (child.key === pathname) return [item.key]
      }
    }
  }
  return []
}

function getPageTitle(pathname: string): string {
  const findTitle = (items: MenuItem[]): string | null => {
    for (const item of items) {
      if (item.key === pathname) return item.label
      if (item.children) {
        const found = findTitle(item.children)
        if (found) return found
      }
    }
    return null
  }
  return findTitle(MENU_ITEMS) || '工程项目管理系统'
}

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [regions, setRegions] = useState<{ id: string; name: string; isActive: boolean }[]>([])
  const [currentRegionId, setCurrentRegionId] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    // 加载区域列表 + 当前区域 cookie
    const loadRegions = async () => {
      try {
        const res = await fetch('/api/regions', { credentials: 'include' })
        const json = await res.json()
        if (json.success) {
          setRegions(json.data.filter((r: any) => r.isActive))
        }
      } catch { /* 静默失败 */ }
      // 读取 cookie 中的当前区域
      const match = document.cookie.match(/(?:^|;\s*)current_region_id=([^;]*)/)
      if (match) setCurrentRegionId(decodeURIComponent(match[1]))
    }
    loadRegions()
  }, [mounted])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const loadCurrentUser = async () => {
      try {
        setUserLoading(true)

        // 1. 先尝试从 cookie 读取已有登录态
        let user = await getCurrentAuthUser()

        // 2. 如果未登录，且在钉钉环境中，自动触发免登录
        if (!user && isDingTalkEnvironment()) {
          try {
            console.log('[Auth] 未登录，尝试钉钉自动免登录...')
            await getDingTalkUser() // 内部：获取 authCode -> POST /api/auth/dingtalk -> 写入 cookie
            // 3. 免登录成功后再次获取用户信息
            user = await getCurrentAuthUser()
            console.log('[Auth] 钉钉自动免登录成功:', user?.name)
          } catch (dtError) {
            // 免登录失败不影响页面正常展示，保持浏览器模式
            console.warn('[Auth] 钉钉自动免登录失败:', dtError)
          }
        }

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

  const filteredMenuItems = currentUser?.systemRole
    ? filterMenuItemsByRole(MENU_ITEMS, currentUser.systemRole)
    : MENU_ITEMS

  const selectedKey = getSelectedKey(pathname)
  const openKeys = getOpenKeys(pathname)
  const pageTitle = getPageTitle(pathname)

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const key = e.key as string
    if (MENU_ITEMS.some((item) => item.key === key)) return
    if (isMobile) setDrawerOpen(false)
    router.push(key)
  }

  const handleSwitchRegion = async (regionId: string) => {
    try {
      const res = await fetch('/api/current-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ regionId }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentRegionId(regionId)
        message.success(`已切换到：${json.data.regionName}`)
        router.refresh()
      } else {
        message.error(json.error || '切换失败')
      }
    } catch {
      message.error('切换区域失败')
    }
  }

  const handleLogout = async () => {
    try {
      const success = await logout()
      if (success) {
        message.success('已退出登录')
        setCurrentUser(null)
        router.refresh()
      } else {
        message.error('退出登录失败')
      }
    } catch (error) {
      console.error('退出登录失败:', error)
      message.error('退出登录失败')
    }
  }

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: `用户: ${currentUser?.name || '未知'}`, disabled: true },
    { type: 'divider' },
    { key: 'role', label: `角色: ${currentUser?.systemRole || '未知'}`, disabled: true },
    { type: 'divider' },
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: handleLogout },
  ]

  const menuContent = (
    <>
      {/* Logo */}
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
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1677ff', whiteSpace: 'nowrap' }}>
          {collapsed && !isMobile ? '' : '工程管理'}
        </div>
      </div>
      {/* 菜单 */}
      <Menu
        mode="inline"
        selectedKeys={selectedKey}
        defaultOpenKeys={openKeys}
        items={transformMenuItems(filteredMenuItems)}
        onClick={handleMenuClick}
        style={{ border: 'none', background: '#fff' }}
      />
    </>
  )

  if (!mounted) return <>{children}</>

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14 },
        algorithm: antTheme.defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 桌面端左侧固定 Sider */}
        {!isMobile && (
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
            {menuContent}
          </Sider>
        )}

        {/* 移动端抽屉菜单 */}
        {isMobile && (
          <Drawer
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            width={240}
            styles={{ body: { padding: 0 } }}
            title="工程管理"
          >
            <Menu
              mode="inline"
              selectedKeys={selectedKey}
              defaultOpenKeys={openKeys}
              items={transformMenuItems(filteredMenuItems)}
              onClick={handleMenuClick}
              style={{ border: 'none' }}
            />
          </Drawer>
        )}

        {/* 右侧内容区 */}
        <Layout
          style={{
            marginLeft: isMobile ? 0 : collapsed ? 80 : 220,
            transition: isMobile ? 'none' : 'margin-left 0.2s',
          }}
        >
          {/* 顶部 Header */}
          <Header
            style={{
              background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 56,
              position: 'sticky',
              top: 0,
              zIndex: 99,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 移动端汉堡按钮 */}
              {isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerOpen(true)}
                  style={{ fontSize: 18 }}
                />
              )}
              {/* 桌面端折叠按钮 */}
              {!isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                />
              )}
              <span style={{ fontSize: isMobile ? 15 : 16, fontWeight: 600, color: '#1d1d1f' }}>
                {pageTitle}
              </span>
            </div>

            {/* 右侧用户信息 */}
            <Space>
            {/* 区域切换 */}
              {regions.length > 0 && (
                <Dropdown
                  menu={{
                    items: regions.map((r) => ({
                      key: r.id,
                      label: r.name,
                      onClick: () => handleSwitchRegion(r.id),
                    })),
                    selectedKeys: currentRegionId ? [currentRegionId] : [],
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    size="small"
                    style={{ fontSize: 12, color: '#595959', border: '1px solid #d9d9d9', borderRadius: 4, padding: '0 8px' }}
                  >
                    {regions.find((r) => r.id === currentRegionId)?.name || '选择区域'} ▾
                  </Button>
                </Dropdown>
              )}
              {!isMobile && (
                <span style={{ fontSize: 13, color: '#8c8c8c' }}>工程项目管理系统</span>
              )}
              {userLoading ? (
                <Spin size="small" />
              ) : currentUser ? (
                <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                  <Button type="text" icon={<UserOutlined />} style={{ color: '#1677ff', fontSize: 12 }}>
                    {isMobile ? '' : `${currentUser.name}（${currentUser.systemRole || '无角色'}）`}
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
              padding: isMobile ? '12px' : '16px 24px',
              minHeight: 'calc(100vh - 56px)',
              overflow: 'auto',
              // 移动端不限制最小宽度，让内容自然适应屏幕
              minWidth: 0,
            }}
          >
            {/* 隐藏版本号，便于确认钉钉打开的是否最新版本 */}
            <span style={{ display: 'none' }} data-version={APP_VERSION} />
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
