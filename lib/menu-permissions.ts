/**
 * 菜单权限配置
 * 定义每个菜单项允许访问的角色
 */

import { SystemUserRole } from '@prisma/client'

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
 * 定义了每个菜单项允许访问的角色
 */
export const MENU_PERMISSIONS: MenuPermissionConfig[] = [
  {
    key: '/',
    label: '项目收支总览',
    path: '/',
    roles: [
      SystemUserRole.ADMIN,
      SystemUserRole.FINANCE,
      SystemUserRole.PURCHASE,
      SystemUserRole.PROJECT_MANAGER,
      SystemUserRole.STAFF,
    ],
  },
  {
    key: 'base-data',
    label: '基础资料',
    roles: [SystemUserRole.ADMIN, SystemUserRole.PURCHASE, SystemUserRole.STAFF],
    children: [
      {
        key: '/customers',
        label: '客户管理',
        path: '/customers',
        roles: [SystemUserRole.ADMIN, SystemUserRole.STAFF],
      },
      {
        key: '/suppliers',
        label: '供应商管理',
        path: '/suppliers',
        roles: [SystemUserRole.ADMIN, SystemUserRole.PURCHASE, SystemUserRole.STAFF],
      },
      {
        key: '/labor-workers',
        label: '劳务人员管理',
        path: '/labor-workers',
        roles: [SystemUserRole.ADMIN],
      },
    ],
  },
  {
    key: 'project-mgmt',
    label: '项目管理',
    roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER],
    children: [
      {
        key: '/projects',
        label: '项目管理',
        path: '/projects',
        roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER],
      },
      {
        key: '/construction-approvals',
        label: '施工立项管理',
        path: '/construction-approvals',
        roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER],
      },
      {
        key: '/project-contracts',
        label: '项目合同管理',
        path: '/project-contracts',
        roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE, SystemUserRole.PROJECT_MANAGER],
      },
      {
        key: '/contract-receipts',
        label: '合同收款管理',
        path: '/contract-receipts',
        roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE, SystemUserRole.PROJECT_MANAGER],
      },
    ],
  },
  {
    key: 'cost-mgmt',
    label: '成本管理',
    roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE, SystemUserRole.PURCHASE],
    children: [
      {
        key: '/procurement-contracts',
        label: '采购合同管理',
        path: '/procurement-contracts',
        roles: [SystemUserRole.ADMIN, SystemUserRole.PURCHASE],
      },
      {
        key: '/procurement-payments',
        label: '采购付款管理',
        path: '/procurement-payments',
        roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE, SystemUserRole.PURCHASE],
      },
      {
        key: '/labor-contracts',
        label: '劳务合同管理',
        path: '/labor-contracts',
        roles: [SystemUserRole.ADMIN],
      },
      {
        key: '/labor-payments',
        label: '劳务付款管理',
        path: '/labor-payments',
        roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE],
      },
      {
        key: '/subcontract-contracts',
        label: '分包合同管理',
        path: '/subcontract-contracts',
        roles: [SystemUserRole.ADMIN],
      },
      {
        key: '/subcontract-payments',
        label: '分包付款管理',
        path: '/subcontract-payments',
        roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE],
      },
    ],
  },
  {
    key: 'system-mgmt',
    label: '系统管理',
    roles: [SystemUserRole.ADMIN],
    children: [
      {
        key: '/action-logs',
        label: '操作日志',
        path: '/action-logs',
        roles: [SystemUserRole.ADMIN],
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
  if (!userRole) {
    return false
  }

  const findPermission = (items: MenuPermissionConfig[]): boolean => {
    for (const item of items) {
      if (item.key === menuKey) {
        return item.roles.includes(userRole)
      }
      if (item.children) {
        if (findPermission(item.children)) {
          return true
        }
      }
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
  if (!userRole) {
    return []
  }

  return items
    .filter((item) => item.roles.includes(userRole))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByRole(item.children, userRole) : undefined,
    }))
    .filter((item) => {
      // 如果是分组菜单，必须有子菜单才显示
      if (item.children) {
        return item.children.length > 0
      }
      return true
    })
}

