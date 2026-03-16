/**
 * 统一 API 请求处理器
 * 自动处理 try/catch、错误转换、返回格式统一
 */

import { NextResponse } from 'next/server'
import { ApiError } from './errors'
import { error as errorResponse, success as successResponse } from './response'

export type ApiHandlerFn = (req: Request) => Promise<any>

/**
 * API 处理器包装函数
 * 
 * 使用方式：
 * export const GET = apiHandler(async (req) => {
 *   const data = await db.project.findMany()
 *   return successResponse(data)
 * })
 */
export function apiHandler(fn: ApiHandlerFn) {
  return async (req: Request) => {
    try {
      const result = await fn(req)
      
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
      
      // 处理 Prisma 错误
      if (err instanceof Error) {
        const message = err.message || 'Internal Server Error'
        
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

/**
 * 异步 API 处理器（用于 POST、PUT、DELETE 等）
 */
export function apiHandlerWithMethod(
  methods: {
    GET?: ApiHandlerFn
    POST?: ApiHandlerFn
    PUT?: ApiHandlerFn
    DELETE?: ApiHandlerFn
    PATCH?: ApiHandlerFn
  }
) {
  return async (req: Request) => {
    const method = req.method as keyof typeof methods
    const handler = methods[method]
    
    if (!handler) {
      return NextResponse.json(
        errorResponse(`Method ${method} not allowed`),
        { status: 405 }
      )
    }
    
    return apiHandler(handler)(req)
  }
}


