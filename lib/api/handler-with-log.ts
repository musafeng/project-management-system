/**
 * 带权限控制和操作日志的 API 处理器
 * 在 apiHandlerWithPermission 基础上添加日志能力
 */

import { NextResponse } from 'next/server'
import { getCurrentUser, checkAuth } from './auth'
import { canAccessApi } from './permissions'
import { createActionLog, buildActionLogDetail } from '@/lib/action-log'
import { ActionType } from '@prisma/client'
import { ApiError } from './errors'
import { toChineseErrorMessage } from './error-message'
import { error as errorResponse, success as successResponse } from './response'

export type ApiHandlerFn = (req: Request) => Promise<any>

/**
 * 权限和日志选项
 */
export interface PermissionAndLogOptions {
  requireAuth?: boolean // 是否要求登录（默认 true）
  checkWritePermission?: boolean // 是否检查写操作权限（默认 true）
  resource?: string // 资源名称，用于日志记录
  resourceIdExtractor?: (req: Request, result?: any) => string | null // 提取 resourceId 的函数
}

function toUserFacingErrorMessage(message: string | null | undefined) {
  const translated = toChineseErrorMessage(message)
  return /[\u4e00-\u9fa5]/.test(translated) ? translated : '操作失败，请稍后重试'
}

/**
 * 将 HTTP 方法映射到 ActionType
 */
function mapMethodToActionType(method: string): ActionType | null {
  switch (method) {
    case 'POST':
      return ActionType.CREATE
    case 'PUT':
      return ActionType.UPDATE
    case 'DELETE':
      return ActionType.DELETE
    default:
      return null
  }
}

/**
 * 为 API handler 添加权限控制和日志能力
 * 
 * 使用方式：
 * export const { GET, POST } = apiHandlerWithPermissionAndLog({
 *   GET: async (req) => { ... },
 *   POST: async (req) => { ... },
 * }, {
 *   resource: 'customers',
 *   resourceIdExtractor: (req, result) => result?.id,
 * })
 */
export function apiHandlerWithPermissionAndLog(
  methods: {
    GET?: ApiHandlerFn
    POST?: ApiHandlerFn
    PUT?: ApiHandlerFn
    DELETE?: ApiHandlerFn
    PATCH?: ApiHandlerFn
  },
  logOptions: PermissionAndLogOptions = {}
) {
  const {
    requireAuth = true,
    checkWritePermission = true,
    resource,
    resourceIdExtractor,
  } = logOptions

  const createHandlerWrapper = (method: string) => {
    return async (req: Request) => {
      try {
        const handler = methods[method as keyof typeof methods]

        if (!handler) {
          return NextResponse.json(
            errorResponse(toChineseErrorMessage(`Method ${method} not allowed`)),
            { status: 405 }
          )
        }

        // 执行权限校验
        const user = requireAuth ? await getCurrentUser() : await checkAuth()

        if (checkWritePermission && ['POST', 'PUT', 'DELETE'].includes(method)) {
          const pathname = new URL(req.url).pathname
          const hasPermission = canAccessApi(user?.systemRole, method, pathname)

          if (!hasPermission) {
            throw new ApiError('无权限执行此操作', 403)
          }
        }

        // 执行原始 handler
        const result = await handler(req)

        // 如果是成功的写操作，记录日志
        if (
          resource &&
          ['POST', 'PUT', 'DELETE'].includes(method) &&
          result instanceof NextResponse
        ) {
          const statusCode = result.status
          // 只记录成功的操作（2xx）
          if (statusCode >= 200 && statusCode < 300) {
            const actionType = mapMethodToActionType(method)
            if (actionType) {
              const pathname = new URL(req.url).pathname
              let resourceId: string | null = null

              // 尝试提取 resourceId
              if (resourceIdExtractor) {
                try {
                  // 如果 result 是 NextResponse，需要克隆并解析
                  const clonedResponse = result.clone()
                  const responseData = await clonedResponse.json()
                  resourceId = resourceIdExtractor(req, responseData)
                } catch (error) {
                  // 提取失败，继续记录日志但不包含 resourceId
                  console.warn('提取 resourceId 失败:', error)
                }
              }

              const detail = buildActionLogDetail(actionType, resource, resourceId)

              // 异步记录日志，不阻塞响应
              createActionLog({
                action: actionType,
                resource,
                resourceId,
                method,
                path: pathname,
                detail,
              }).catch((error) => {
                console.error('记录操作日志失败:', error)
              })
            }
          }
        }

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
              errorResponse(toChineseErrorMessage(message)),
              { status: 409 }
            )
          }

          // Prisma 外键约束错误
          if (message.includes('Foreign key constraint failed')) {
            return NextResponse.json(
              errorResponse(toChineseErrorMessage(message)),
              { status: 400 }
            )
          }

          // 其他错误
          return NextResponse.json(
            errorResponse(toUserFacingErrorMessage(message)),
            { status: 500 }
          )
        }

        // 未知错误
        return NextResponse.json(
          errorResponse(toChineseErrorMessage('Unknown error occurred')),
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
