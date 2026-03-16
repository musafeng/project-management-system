/**
 * API 权限配置
 * 定义每个角色允许访问的 API 端点和方法
 */

import { SystemUserRole } from '@prisma/client'

/**
 * API 权限配置项
 */
export interface ApiPermissionRule {
  pattern: RegExp | string // 路径模式，支持正则或字符串
  methods: string[] // 允许的 HTTP 方法
  roles: SystemUserRole[] // 允许的角色
}

/**
 * API 权限规则列表
 * 规则按优先级从上到下匹配
 */
export const API_PERMISSION_RULES: ApiPermissionRule[] = [
  // ============================================================================
  // 基础资料 API
  // ============================================================================

  // 客户管理 - ADMIN, STAFF 可写
  {
    pattern: /^\/api\/customers(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.STAFF],
  },

  // 供应商管理 - ADMIN, PURCHASE, STAFF 可写
  {
    pattern: /^\/api\/suppliers(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PURCHASE, SystemUserRole.STAFF],
  },

  // 劳务人员管理 - ADMIN 可写
  {
    pattern: /^\/api\/labor-workers(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN],
  },

  // ============================================================================
  // 项目管理 API
  // ============================================================================

  // 项目管理 - ADMIN, PROJECT_MANAGER 可写
  {
    pattern: /^\/api\/projects(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER],
  },

  // 项目合同管理 - ADMIN, PROJECT_MANAGER, FINANCE 可写
  {
    pattern: /^\/api\/project-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER, SystemUserRole.FINANCE],
  },

  // 项目合同变更 - ADMIN, PROJECT_MANAGER 可写
  {
    pattern: /^\/api\/project-contracts\/\[id\]\/changes$/,
    methods: ['POST', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER],
  },

  // 合同收款管理 - ADMIN, PROJECT_MANAGER, FINANCE 可写
  {
    pattern: /^\/api\/contract-receipts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER, SystemUserRole.FINANCE],
  },

  // 施工立项管理 - ADMIN, PROJECT_MANAGER 可写
  {
    pattern: /^\/api\/construction-approvals(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PROJECT_MANAGER],
  },

  // ============================================================================
  // 成本管理 API
  // ============================================================================

  // 采购合同管理 - ADMIN, PURCHASE 可写
  {
    pattern: /^\/api\/procurement-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PURCHASE],
  },

  // 采购付款管理 - ADMIN, PURCHASE, FINANCE 可写
  {
    pattern: /^\/api\/procurement-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.PURCHASE, SystemUserRole.FINANCE],
  },

  // 劳务合同管理 - ADMIN 可写
  {
    pattern: /^\/api\/labor-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN],
  },

  // 劳务付款管理 - ADMIN, FINANCE 可写
  {
    pattern: /^\/api\/labor-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE],
  },

  // 分包合同管理 - ADMIN 可写
  {
    pattern: /^\/api\/subcontract-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN],
  },

  // 分包付款管理 - ADMIN, FINANCE 可写
  {
    pattern: /^\/api\/subcontract-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: [SystemUserRole.ADMIN, SystemUserRole.FINANCE],
  },
]

/**
 * 检查用户是否有权限访问 API
 * @param role 用户角色
 * @param method HTTP 方法
 * @param pathname 请求路径
 * @returns 是否有权限
 */
export function canAccessApi(
  role: SystemUserRole | undefined,
  method: string,
  pathname: string
): boolean {
  // ADMIN 默认全部放行
  if (role === SystemUserRole.ADMIN) {
    return true
  }

  if (!role) {
    return false
  }

  // 查找匹配的权限规则
  for (const rule of API_PERMISSION_RULES) {
    const isMatch =
      typeof rule.pattern === 'string'
        ? rule.pattern === pathname
        : rule.pattern.test(pathname)

    if (isMatch) {
      // 检查方法是否在允许列表中
      if (!rule.methods.includes(method)) {
        return true // 方法不在限制列表中，允许访问
      }

      // 检查角色是否在允许列表中
      return rule.roles.includes(role)
    }
  }

  // 未找到规则，默认允许（GET 等查询操作）
  return true
}

/**
 * 获取角色的权限描述
 */
export function getRolePermissionDescription(role: SystemUserRole): string {
  const descriptions: Record<SystemUserRole, string> = {
    [SystemUserRole.ADMIN]: '系统管理员 - 拥有所有权限',
    [SystemUserRole.FINANCE]: '财务人员 - 可管理收款和付款',
    [SystemUserRole.PURCHASE]: '采购人员 - 可管理采购合同和供应商',
    [SystemUserRole.PROJECT_MANAGER]: '项目经理 - 可管理项目和合同',
    [SystemUserRole.STAFF]: '普通员工 - 可管理基础资料',
  }
  return descriptions[role] || '未知角色'
}

