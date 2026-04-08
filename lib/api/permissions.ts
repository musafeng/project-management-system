/**
 * API 权限配置
 * 定义每个角色允许访问的 API 端点和方法
 *
 * 权限说明：
 * - 卢海霞专属写权限模块：项目、项目合同、收款、施工立项、合同变更、其他收付款
 *   对应角色：FINANCE（财务）
 * - 全员可写模块：采购/劳务/分包合同付款、报销、备用金
 *   对应角色：ADMIN、FINANCE、PURCHASE、PROJECT_MANAGER、STAFF
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

// 全员角色列表（所有角色都可写）
const ALL_ROLES: SystemUserRole[] = [
  SystemUserRole.ADMIN,
  SystemUserRole.FINANCE,
  SystemUserRole.PURCHASE,
  SystemUserRole.PROJECT_MANAGER,
  SystemUserRole.STAFF,
]

// 卢海霞专属模块角色（ADMIN + FINANCE）
const FINANCE_ROLES: SystemUserRole[] = [
  SystemUserRole.ADMIN,
  SystemUserRole.FINANCE,
]

/**
 * API 权限规则列表
 * 规则按优先级从上到下匹配
 */
export const API_PERMISSION_RULES: ApiPermissionRule[] = [
  // ============================================================================
  // 基础资料 API
  // ============================================================================

  // 客户管理 - 全员可写
  {
    pattern: /^\/api\/customers(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 供应商管理 - 全员可写
  {
    pattern: /^\/api\/suppliers(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 劳务人员管理 - 全员可写
  {
    pattern: /^\/api\/labor-workers(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // ============================================================================
  // 项目管理 API（卢海霞专属：FINANCE 角色）
  // ============================================================================

  // 项目管理 - FINANCE 专属写权限
  {
    pattern: /^\/api\/projects(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 项目合同管理 - FINANCE 专属写权限
  {
    pattern: /^\/api\/project-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 项目合同变更 - FINANCE 专属写权限
  {
    pattern: /^\/api\/project-contract-changes(?:\/[^/]+)?(?:\/[^/]+)?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 旧项目合同变更兼容接口 - FINANCE 专属写权限
  {
    pattern: /^\/api\/project-contracts\/[^/]+\/changes$/,
    methods: ['POST', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 合同收款管理 - FINANCE 专属写权限
  {
    pattern: /^\/api\/contract-receipts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 施工立项管理 - FINANCE 专属写权限
  {
    pattern: /^\/api\/construction-approvals(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 其他收款 - FINANCE 专属写权限
  {
    pattern: /^\/api\/other-receipts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // 其他付款 - FINANCE 专属写权限
  {
    pattern: /^\/api\/other-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: FINANCE_ROLES,
  },

  // ============================================================================
  // 成本管理 API（全员可写）
  // ============================================================================

  // 采购合同管理 - 全员可写
  {
    pattern: /^\/api\/procurement-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 采购付款管理 - 全员可写
  {
    pattern: /^\/api\/procurement-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 劳务合同管理 - 全员可写
  {
    pattern: /^\/api\/labor-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 劳务付款管理 - 全员可写
  {
    pattern: /^\/api\/labor-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 分包合同管理 - 全员可写
  {
    pattern: /^\/api\/subcontract-contracts(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 分包付款管理 - 全员可写
  {
    pattern: /^\/api\/subcontract-payments(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // ============================================================================
  // 报销 & 备用金 API（全员可写）
  // ============================================================================

  // 项目费用报销 - 全员可写
  {
    pattern: /^\/api\/project-expenses(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 管理费用报销 - 全员可写
  {
    pattern: /^\/api\/management-expenses(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 销售费用报销 - 全员可写
  {
    pattern: /^\/api\/sales-expenses(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
  },

  // 备用金申请 - 全员可写
  {
    pattern: /^\/api\/petty-cashes(\/\[id\])?$/,
    methods: ['POST', 'PUT', 'DELETE'],
    roles: ALL_ROLES,
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
    [SystemUserRole.FINANCE]: '财务人员 - 可管理项目、合同、收款及所有写操作（对应卢海霞专属模块）',
    [SystemUserRole.PURCHASE]: '采购人员 - 可管理采购合同、劳务、分包、报销',
    [SystemUserRole.PROJECT_MANAGER]: '项目经理 - 可管理项目成本相关模块',
    [SystemUserRole.STAFF]: '普通员工 - 可提交报销、备用金申请',
  }
  return descriptions[role] || '未知角色'
}
