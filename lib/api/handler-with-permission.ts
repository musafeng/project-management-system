/**
 * 带权限控制的 API 处理器
 * 在现有 apiHandlerWithMethod 基础上添加权限校验
 */

import { NextResponse } from 'next/server'
import { getCurrentUser, checkAuth } from './auth'
import { canAccessApi } from './permissions'
import { ApiError } from './errors'
import { error as errorResponse, success as successResponse } from './response'

export type ApiHandlerFn = (req: Request) => Promise<any>

/**
 * 权限校验选项
 */
export interface PermissionOptions {
  requireAuth?: boolean // 是否要求登录（默认 true）
  checkWritePermission?: boolean // 是否检查写操作权限（默认 true）
}

/**
 * 为 API handler 添加权限校验
 */
async function checkPermission(
  req: Request,
  options: PermissionOptions = {}
): Promise<void> {
  const { requireAuth = true, checkWritePermission = true } = options

  // 获取当前用户
  const user = requireAuth ? await getCurrentUser() : await checkAuth()

  // 如果需要检查写操作权限
  if (checkWritePermission && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const pathname = new URL(req.url).pathname
    const hasPermission = canAccessApi(user?.systemRole, req.method, pathname)

    if (!hasPermission) {
      throw new ApiError('无权限执行此操作', 403)
    }
  }
}

/**
 * 带权限控制的 API 处理器
 * 
 * 使用方式：
 * export const { GET, POST } = apiHandlerWithPermission({
 *   GET: async (req) => { ... },
 *   POST: async (req) => { ... },
 * })
 */
export function apiHandlerWithPermission(
  methods: {
    GET?: ApiHandlerFn
    POST?: ApiHandlerFn
    PUT?: ApiHandlerFn
    DELETE?: ApiHandlerFn
    PATCH?: ApiHandlerFn
  },
  permissionOptions: PermissionOptions = {}
) {
  const createHandlerWrapper = (method: string) => {
    return async (req: Request) => {
      try {
        const handler = methods[method as keyof typeof methods]

        if (!handler) {
          return NextResponse.json(
            errorResponse(`Method ${method} not allowed`),
            { status: 405 }
          )
        }

        // 执行权限校验
        await checkPermission(req, permissionOptions)

        // 执行原始 handler
        const result = await handler(req)

        // 如果已经是 NextResponse，直接返回
        if (result instanceof NextResponse) {
          return result
        }

        // 如果是 ApiResponse 格式，转换为 NextResponse
        if (result && typeof result === 'object' && 'success' in result) {
          const statusCode = result.success ? 200 : 400
          return NextResponse.json(result, { status: statusCode })
        }

        // 其他情况，包装为成功响应
        return NextResponse.json(successResponse(result), { status: 200 })
      } catch (err) {
        console.error('[API Error]', err)

        // 处理 ApiError
        if (err instanceof ApiError) {
          return NextResponse.json(
            errorResponse(err.message),
            { status: err.statusCode }
          )
        }

        // 处理权限错误
        if (err instanceof Error) {
          const message = err.message

          // 账号被禁用
          if (message.includes('已被禁用')) {
            return NextResponse.json(
              errorResponse('当前账号已被禁用'),
              { status: 403 }
            )
          }

          // 未登录
          if (message.includes('未登录') || message.includes('登录已失效')) {
            return NextResponse.json(
              errorResponse('未登录或登录已失效'),
              { status: 401 }
            )
          }

          // 无权限
          if (message.includes('无权限')) {
            return NextResponse.json(
              errorResponse('无权限执行此操作'),
              { status: 403 }
            )
          }

          // Prisma 唯一性约束错误
          if (message.includes('Unique constraint failed')) {
            return NextResponse.json(
              errorResponse('数据已存在，请检查唯一字段'),
              { status: 409 }
            )
          }

          // Prisma 外键约束错误
          if (message.includes('Foreign key constraint failed')) {
            return NextResponse.json(
              errorResponse('关联数据不存在或已被删除'),
              { status: 400 }
            )
          }

          // 其他错误
          return NextResponse.json(
            errorResponse(message),
            { status: 500 }
          )
        }

        // 未知错误
        return NextResponse.json(
          errorResponse('Unknown error occurred'),
          { status: 500 }
        )
      }
    }
  }

  return {
    GET: methods.GET ? createHandlerWrapper('GET') : undefined,
    POST: methods.POST ? createHandlerWrapper('POST') : undefined,
    PUT: methods.PUT ? createHandlerWrapper('PUT') : undefined,
    DELETE: methods.DELETE ? createHandlerWrapper('DELETE') : undefined,
    PATCH: methods.PATCH ? createHandlerWrapper('PATCH') : undefined,
  }
}

/**
 * 仅检查登录状态，不检查权限
 * 用于 GET 查询操作
 */
export function apiHandlerWithAuth(
  methods: {
    GET?: ApiHandlerFn
    POST?: ApiHandlerFn
    PUT?: ApiHandlerFn
    DELETE?: ApiHandlerFn
    PATCH?: ApiHandlerFn
  }
) {
  return apiHandlerWithPermission(methods, {
    requireAuth: true,
    checkWritePermission: false,
  })
}

/**
 * 不检查任何权限，仅执行 handler
 * 用于公开接口
 */
export function apiHandlerWithoutPermission(
  methods: {
    GET?: ApiHandlerFn
    POST?: ApiHandlerFn
    PUT?: ApiHandlerFn
    DELETE?: ApiHandlerFn
    PATCH?: ApiHandlerFn
  }
) {
  return apiHandlerWithPermission(methods, {
    requireAuth: false,
    checkWritePermission: false,
  })
}

