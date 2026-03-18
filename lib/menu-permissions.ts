/**
 * 菜单权限配置
 * 策略：业务菜单全员开放，系统管理仅 ADMIN
 */

import { SystemUserRole } from '@prisma/client'

/** 所有业务角色 */
const ALL_ROLES: SystemUserRole[] = [
  SystemUserRole.ADMIN,
  SystemUserRole.PROJECT_MANAGER,
  SystemUserRole.FINANCE,
  SystemUserRole.PURCHASE,
  SystemUserRole.STAFF,
]

/** 仅管理员 */
const ADMIN_ONLY: SystemUserRole[] = [SystemUserRole.ADMIN]

/**
 * 菜单权限配置项
 */
export interface MenuPermissionConfig {
  key: string
  label: string
  path?: string
  roles: SystemUserRole[]
  children?: MenuPermissionConfig[]
}

/**
 * 菜单权限配置
 */
export const MENU_PERMISSIONS: MenuPermissionConfig[] = [
  {
    key: '/',
    label: '项目收支总览',
    path: '/',
    roles: ALL_ROLES,
  },
  {
    key: 'base-data',
    label: '基础资料',
    roles: ALL_ROLES,
    children: [
      {
        key: '/customers',
        label: '客户管理',
        path: '/customers',
        roles: ALL_ROLES,
      },
      {
        key: '/suppliers',
        label: '供应商管理',
        path: '/suppliers',
        roles: ALL_ROLES,
      },
      {
        key: '/labor-workers',
        label: '劳务人员管理',
        path: '/labor-workers',
        roles: ALL_ROLES,
      },
    ],
  },
  {
    key: 'project-mgmt',
    label: '项目管理',
    roles: ALL_ROLES,
    children: [
      {
        key: '/projects',
        label: '项目管理',
        path: '/projects',
        roles: ALL_ROLES,
      },
      {
        key: '/construction-approvals',
        label: '施工立项管理',
        path: '/construction-approvals',
        roles: ALL_ROLES,
      },
      {
        key: '/project-contracts',
        label: '项目合同管理',
        path: '/project-contracts',
        roles: ALL_ROLES,
      },
      {
        key: '/contract-receipts',
        label: '合同收款管理',
        path: '/contract-receipts',
        roles: ALL_ROLES,
      },
    ],
  },
  {
    key: 'cost-mgmt',
    label: '成本管理',
    roles: ALL_ROLES,
    children: [
      {
        key: '/procurement-contracts',
        label: '采购合同管理',
        path: '/procurement-contracts',
        roles: ALL_ROLES,
      },
      {
        key: '/procurement-payments',
        label: '采购付款管理',
        path: '/procurement-payments',
        roles: ALL_ROLES,
      },
      {
        key: '/labor-contracts',
        label: '劳务合同管理',
        path: '/labor-contracts',
        roles: ALL_ROLES,
      },
      {
        key: '/labor-payments',
        label: '劳务付款管理',
        path: '/labor-payments',
        roles: ALL_ROLES,
      },
      {
        key: '/subcontract-contracts',
        label: '分包合同管理',
        path: '/subcontract-contracts',
        roles: ALL_ROLES,
      },
      {
        key: '/subcontract-payments',
        label: '分包付款管理',
        path: '/subcontract-payments',
        roles: ALL_ROLES,
      },
    ],
  },
  {
    key: 'system-mgmt',
    label: '系统管理',
    roles: ADMIN_ONLY,
    children: [
      {
        key: '/action-logs',
        label: '操作日志',
        path: '/action-logs',
        roles: ADMIN_ONLY,
      },
      {
        key: '/system-users',
        label: '用户管理',
        path: '/system-users',
        roles: ADMIN_ONLY,
      },
      {
        key: '/regions',
        label: '区域管理',
        path: '/regions',
        roles: ADMIN_ONLY,
      },
      {
        key: '/org-units',
        label: '组织管理',
        path: '/org-units',
        roles: ADMIN_ONLY,
      },
      {
        key: '/process-definitions',
        label: '审批流程配置',
        path: '/process-definitions',
        roles: ADMIN_ONLY,
      },
      {
        key: '/form-definitions',
        label: '表单配置管理',
        path: '/form-definitions',
        roles: ADMIN_ONLY,
      },
      {
        key: '/data-exports',
        label: '数据下载中心',
        path: '/data-exports',
        roles: ADMIN_ONLY,
      },
    ],
  },
]

/**
 * 检查用户是否有权限访问菜单项
 */
export function hasMenuPermission(
  menuKey: string,
  userRole: SystemUserRole | undefined
): boolean {
  if (!userRole) return false

  const findPermission = (items: MenuPermissionConfig[]): boolean => {
    for (const item of items) {
      if (item.key === menuKey) return item.roles.includes(userRole)
      if (item.children && findPermission(item.children)) return true
    }
    return false
  }

  return findPermission(MENU_PERMISSIONS)
}

/**
 * 根据用户角色过滤菜单
 */
export function filterMenuByRole(
  items: MenuPermissionConfig[],
  userRole: SystemUserRole | undefined
): MenuPermissionConfig[] {
  if (!userRole) return []

  return items
    .filter((item) => item.roles.includes(userRole))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByRole(item.children, userRole) : undefined,
    }))
    .filter((item) => {
      if (item.children) return item.children.length > 0
      return true
    })
}
