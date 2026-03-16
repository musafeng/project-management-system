/**
 * API 鉴权工具
 * 用于在服务端验证用户身份和权限
 */

import { cookies } from 'next/headers'
import { SystemUserRole } from '@prisma/client'
import { getSystemUserRoleAndStatus } from '@/lib/system-user'

/**
 * 当前认证用户信息
 */
export interface AuthenticatedUser {
  userid: string
  name: string
  mobile?: string
  unionid?: string
  systemRole: SystemUserRole
  isActive: boolean
}

/**
 * 从请求中获取当前认证用户
 * @throws Error 如果未登录或用户被禁用
 */
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  // 从 cookie 中读取登录态
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('auth')

  if (!authCookie) {
    throw new Error('未登录或登录已失效')
  }

  let authData: any
  try {
    authData = JSON.parse(authCookie.value)
  } catch (error) {
    throw new Error('登录信息无效')
  }

  if (!authData.userid) {
    throw new Error('登录信息不完整')
  }

  // 获取系统用户信息
  const systemUserInfo = await getSystemUserRoleAndStatus(authData.userid)

  if (!systemUserInfo) {
    throw new Error('系统用户不存在，请联系管理员')
  }

  // 检查用户是否被禁用
  if (!systemUserInfo.isActive) {
    throw new Error('当前账号已被禁用')
  }

  return {
    userid: authData.userid,
    name: authData.name,
    mobile: authData.mobile,
    unionid: authData.unionid,
    systemRole: systemUserInfo.systemRole,
    isActive: systemUserInfo.isActive,
  }
}

/**
 * 检查当前用户是否已登录（不抛出错误）
 */
export async function checkAuth(): Promise<AuthenticatedUser | null> {
  try {
    return await getCurrentUser()
  } catch (error) {
    return null
  }
}

/**
 * 要求用户必须登录
 * @throws Error 如果未登录
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  return await getCurrentUser()
}

/**
 * 要求用户必须是指定角色之一
 * @throws Error 如果未登录或角色不匹配
 */
export async function requireRole(
  allowedRoles: SystemUserRole[]
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()

  if (!allowedRoles.includes(user.systemRole)) {
    throw new Error('无权限执行此操作')
  }

  return user
}

/**
 * 要求用户必须是管理员
 * @throws Error 如果未登录或不是管理员
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return await requireRole([SystemUserRole.ADMIN])
}

