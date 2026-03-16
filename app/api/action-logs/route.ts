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

import { apiHandlerWithPermission, success } from '@/lib/api'
import { getActionLogs, getActionLogsCount } from '@/lib/action-log'
import { ActionType } from '@prisma/client'

export const GET = apiHandlerWithPermission({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword') || undefined
    const action = searchParams.get('action') as ActionType | undefined
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

    return success({
      logs,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages: Math.ceil(total / validPageSize),
      },
    })
  },
})

