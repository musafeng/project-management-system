/**
 * 操作日志查询 API
 * GET /api/action-logs
 * 
 * 支持参数：
 * - keyword: 搜索用户名、资源、详情
 * - action: 按操作类型过滤（CREATE / UPDATE / DELETE）
 * - resource: 按资源类型过滤
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20）
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api/auth'
import { success, error as errorResponse } from '@/lib/api'
import { getActionLogs, getActionLogsCount } from '@/lib/action-log'

type ActionTypeValue = 'CREATE' | 'UPDATE' | 'DELETE'

export async function GET(request: Request) {
  try {
    // 权限校验：要求登录
    const user = await getCurrentUser()

    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || undefined
    const action = searchParams.get('action') as ActionTypeValue | undefined
    const resource = searchParams.get('resource') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // 验证分页参数
    const validPage = Math.max(1, page)
    const validPageSize = Math.min(Math.max(1, pageSize), 100) // 最多 100 条

    const offset = (validPage - 1) * validPageSize

    // 获取日志列表
    const logs = await getActionLogs({
      keyword,
      action,
      resource,
      limit: validPageSize,
      offset,
    })

    // 获取总数
    const total = await getActionLogsCount({
      keyword,
      action,
      resource,
    })

    return NextResponse.json(
      success({
        logs,
        pagination: {
          page: validPage,
          pageSize: validPageSize,
          total,
          totalPages: Math.ceil(total / validPageSize),
        },
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('[API Error]', err)

    if (err instanceof Error) {
      const message = err.message

      // 未登录
      if (message.includes('未登录') || message.includes('登录已失效')) {
        return NextResponse.json(
          errorResponse('未登录或登录已失效'),
          { status: 401 }
        )
      }

      // 账号被禁用
      if (message.includes('已被禁用')) {
        return NextResponse.json(
          errorResponse('当前账号已被禁用'),
          { status: 403 }
        )
      }

      // 其他错误
      return NextResponse.json(
        errorResponse(message),
        { status: 500 }
      )
    }

    return NextResponse.json(
      errorResponse('Unknown error occurred'),
      { status: 500 }
    )
  }
}
