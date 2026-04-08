/**
 * 操作日志工具
 * 用于记录系统中的关键操作，便于审计和追踪
 */

import { db } from './db'
import { getCurrentUser, checkAuth } from './api/auth'
import { ActionType } from '@prisma/client'

/**
 * 操作日志参数
 */
export interface CreateActionLogParams {
  action: ActionType
  resource: string
  resourceId?: string | null
  method: string
  path: string
  detail?: string | null
}

/**
 * 获取当前系统用户信息用于日志记录
 * 如果获取失败，返回默认值
 */
export async function getCurrentSystemUserForLog() {
  try {
    const user = await checkAuth()
    if (user) {
      return {
        userId: user.userid,
        userName: user.name,
        userRole: user.systemRole,
      }
    }
  } catch (error) {
    console.warn('获取当前用户信息失败:', error)
  }

  // 返回默认值
  return {
    userId: null,
    userName: '未知用户',
    userRole: 'UNKNOWN',
  }
}

/**
 * 构建操作日志详情
 * 将操作信息转换为可读的文本
 */
export function buildActionLogDetail(
  action: ActionType,
  resource: string,
  resourceId?: string | null,
  additionalInfo?: Record<string, any>
): string {
  const actionText = {
    CREATE: '创建',
    UPDATE: '更新',
    DELETE: '删除',
  }[action] || action

  let detail = `${actionText}了${resource}`

  if (resourceId) {
    detail += `（ID: ${resourceId}）`
  }

  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    const infoStr = Object.entries(additionalInfo)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')
    detail += ` - ${infoStr}`
  }

  return detail
}

/**
 * 创建操作日志
 * 日志写入失败不会影响主业务
 */
export async function createActionLog(params: CreateActionLogParams): Promise<void> {
  try {
    const userInfo = await getCurrentSystemUserForLog()

    await db.actionLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: userInfo.userId,
        userName: userInfo.userName,
        userRole: userInfo.userRole,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        method: params.method,
        path: params.path,
        detail: params.detail || null,
      },
    })
  } catch (error) {
    // 日志写入失败不影响主业务
    console.error('写入操作日志失败:', error)
  }
}

/**
 * 批量创建操作日志
 * 用于一个请求中有多个操作的情况
 */
export async function createActionLogs(
  paramsList: CreateActionLogParams[]
): Promise<void> {
  try {
    const userInfo = await getCurrentSystemUserForLog()

    await db.actionLog.createMany({
      data: paramsList.map((params) => ({
        id: crypto.randomUUID(),
        userId: userInfo.userId,
        userName: userInfo.userName,
        userRole: userInfo.userRole,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        method: params.method,
        path: params.path,
        detail: params.detail || null,
      })),
    })
  } catch (error) {
    // 日志写入失败不影响主业务
    console.error('批量写入操作日志失败:', error)
  }
}

/**
 * 获取操作日志列表
 */
export async function getActionLogs(options?: {
  keyword?: string
  action?: ActionType
  resource?: string
  limit?: number
  offset?: number
}) {
  const { keyword, action, resource, limit = 50, offset = 0 } = options || {}

  const where: any = {}

  if (keyword) {
    where.OR = [
      { userName: { contains: keyword } },
      { resource: { contains: keyword } },
      { detail: { contains: keyword } },
    ]
  }

  if (action) {
    where.action = action
  }

  if (resource) {
    where.resource = resource
  }

  const logs = await db.actionLog.findMany({
    where,
    select: {
      id: true,
      userName: true,
      userRole: true,
      action: true,
      resource: true,
      resourceId: true,
      method: true,
      path: true,
      detail: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return logs
}

/**
 * 获取操作日志总数
 */
export async function getActionLogsCount(options?: {
  keyword?: string
  action?: ActionType
  resource?: string
}): Promise<number> {
  const { keyword, action, resource } = options || {}

  const where: any = {}

  if (keyword) {
    where.OR = [
      { userName: { contains: keyword } },
      { resource: { contains: keyword } },
      { detail: { contains: keyword } },
    ]
  }

  if (action) {
    where.action = action
  }

  if (resource) {
    where.resource = resource
  }

  return await db.actionLog.count({ where })
}
