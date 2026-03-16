/**
 * API 权限包装器
 * 用于为现有 API handler 添加权限校验
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, checkAuth } from './auth'
import { canAccessApi } from './permissions'
import { ForbiddenError, UnauthorizedError } from './errors'

/**
 * 权限校验选项
 */
export interface PermissionCheckOptions {
  requireAuth?: boolean // 是否要求登录（默认 true）
  checkWritePermission?: boolean // 是否检查写操作权限（默认 true）
}

/**
 * 为 API handler 添加权限校验
 * 使用方式：
 * export const POST = withApiPermission(async (req) => { ... })
 * export const DELETE = withApiPermission(async (req) => { ... })
 */
export function withApiPermission(
  handler: (req: NextRequest) => Promise<Response>,
  options: PermissionCheckOptions = {}
) {
  const { requireAuth = true, checkWritePermission = true } = options

  return async (req: NextRequest) => {
    try {
      // 获取当前用户
      const user = requireAuth ? await getCurrentUser() : await checkAuth()

      // 如果需要检查写操作权限
      if (checkWritePermission && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const pathname = new URL(req.url).pathname
        const hasPermission = canAccessApi(user?.systemRole, req.method, pathname)

        if (!hasPermission) {
          return NextResponse.json(
            {
              success: false,
              error: '无权限执行此操作',
            },
            { status: 403 }
          )
        }
      }

      // 调用原始 handler
      return await handler(req)
    } catch (error) {
      // 处理认证错误
      if (error instanceof Error) {
        const message = error.message

        // 账号被禁用
        if (message.includes('已被禁用')) {
          return NextResponse.json(
            {
              success: false,
              error: '当前账号已被禁用',
            },
            { status: 403 }
          )
        }

        // 未登录
        if (message.includes('未登录') || message.includes('登录已失效')) {
          return NextResponse.json(
            {
              success: false,
              error: '未登录或登录已失效',
            },
            { status: 401 }
          )
        }

        // 其他错误
        return NextResponse.json(
          {
            success: false,
            error: message,
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: '服务器错误',
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 仅检查登录状态，不检查权限
 * 用于 GET 查询操作
 */
export function withAuthCheck(
  handler: (req: NextRequest) => Promise<Response>
) {
  return withApiPermission(handler, {
    requireAuth: true,
    checkWritePermission: false,
  })
}

/**
 * 不检查任何权限，仅执行 handler
 * 用于公开接口
 */
export function withoutPermission(
  handler: (req: NextRequest) => Promise<Response>
) {
  return withApiPermission(handler, {
    requireAuth: false,
    checkWritePermission: false,
  })
}

