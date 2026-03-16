/**
 * 系统用户管理 API
 * GET /api/system-users
 * 
 * 用于查询系统用户列表（管理用测试接口）
 */

import { apiHandler, success } from '@/lib/api'
import { getSystemUsers } from '@/lib/system-user'

export const GET = apiHandler(async (req) => {
  try {
    // 获取系统用户列表
    const users = await getSystemUsers()

    return success({
      users,
      total: users.length,
    })
  } catch (error) {
    console.error('获取系统用户列表失败:', error)

    return success({
      users: [],
      total: 0,
      error: error instanceof Error ? error.message : '未知错误',
    })
  }
})

