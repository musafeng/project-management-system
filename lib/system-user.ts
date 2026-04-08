/**
 * 系统用户管理工具
 * 用于管理系统用户和钉钉用户的同步
 */

import { db } from './db'
import type { DingTalkUser } from './dingtalk'
import { getDepartmentNames } from './dingtalk'
import { SystemUserRole } from '@prisma/client'

/**
 * 根据钉钉 userid 查找系统用户
 */
export async function findSystemUserByDingUserId(dingUserId: string) {
  try {
    const user = await db.systemUser.findUnique({
      where: { dingUserId },
    })
    return user
  } catch (error) {
    console.error('查询系统用户失败:', error)
    return null
  }
}

/**
 * 根据部门名称自动推断系统角色
 * 只在新建用户或当前 role === STAFF 时使用
 */
function resolveRoleByDeptNames(deptNames: string[]): SystemUserRole {
  const names = deptNames.map((n) => n.toLowerCase())
  const has = (keyword: string) => names.some((n) => n.includes(keyword))

  if (has('财务')) return SystemUserRole.FINANCE
  if (has('采购')) return SystemUserRole.PURCHASE
  if (has('工程') || has('项目')) return SystemUserRole.PROJECT_MANAGER
  return SystemUserRole.STAFF
}

/**
 * 从钉钉用户信息创建系统用户
 */
export async function createSystemUserFromDingTalkUser(userInfo: DingTalkUser) {
  try {
    // 获取部门名称
    const deptNames = userInfo.deptIds ? await getDepartmentNames(userInfo.deptIds) : []
    const deptIdsJson = userInfo.deptIds ? JSON.stringify(userInfo.deptIds) : null
    const deptNamesJson = deptNames.length > 0 ? JSON.stringify(deptNames) : null

    // 新用户：根据部门自动推断角色
    const role = resolveRoleByDeptNames(deptNames)

    const systemUser = await db.systemUser.create({
      data: {
        id: crypto.randomUUID(),
        dingUserId: userInfo.userid,
        name: userInfo.name,
        mobile: userInfo.mobile || null,
        unionid: userInfo.unionid || null,
        deptIdsJson,
        deptNamesJson,
        role,
        isActive: true,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    })

    console.log(`创建系统用户成功: ${userInfo.userid}，自动角色: ${role}`)
    return systemUser
  } catch (error) {
    console.error('创建系统用户失败:', error)
    throw error
  }
}

/**
 * 更新或创建系统用户（幂等操作）
 * 如果用户不存在则创建，存在则更新基本信息（不覆盖 role）
 */
export async function upsertSystemUserFromDingTalkUser(userInfo: DingTalkUser) {
  try {
    // 先查询是否存在
    const existingUser = await findSystemUserByDingUserId(userInfo.userid)

    if (existingUser) {
      // 用户存在，更新基本信息
      const deptNames = userInfo.deptIds ? await getDepartmentNames(userInfo.deptIds) : []
      const deptIdsJson = userInfo.deptIds ? JSON.stringify(userInfo.deptIds) : null
      const deptNamesJson = deptNames.length > 0 ? JSON.stringify(deptNames) : null

      // 角色更新策略：
      // - 当前是 STAFF（默认/未配置）→ 允许按部门自动升级
      // - 当前是其他角色（含 ADMIN）→ 人工配置，不覆盖
      let roleUpdate: SystemUserRole | undefined
      if (existingUser.role === SystemUserRole.STAFF) {
        const resolvedRole = resolveRoleByDeptNames(deptNames)
        if (resolvedRole !== SystemUserRole.STAFF) {
          roleUpdate = resolvedRole
          console.log(`用户 ${userInfo.userid} 角色从 STAFF 自动升级为 ${resolvedRole}`)
        }
      }

      const updatedUser = await db.systemUser.update({
        where: { dingUserId: userInfo.userid },
        data: {
          name: userInfo.name,
          mobile: userInfo.mobile || null,
          unionid: userInfo.unionid || null,
          deptIdsJson,
          deptNamesJson,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          ...(roleUpdate ? { role: roleUpdate } : {}),
        },
      })

      console.log(`更新系统用户成功: ${userInfo.userid}`)
      return updatedUser
    } else {
      // 用户不存在，创建新用户
      return await createSystemUserFromDingTalkUser(userInfo)
    }
  } catch (error) {
    console.error('同步系统用户失败:', error)
    throw error
  }
}

/**
 * 更新用户最后登录时间
 */
export async function updateSystemUserLastLogin(dingUserId: string) {
  try {
    const user = await db.systemUser.update({
      where: { dingUserId },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return user
  } catch (error) {
    console.error('更新用户登录时间失败:', error)
    return null
  }
}

/**
 * 获取系统用户列表
 */
export async function getSystemUsers() {
  try {
    const users = await db.systemUser.findMany({
      select: {
        id: true,
        dingUserId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        deptIdsJson: true,
        deptNamesJson: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 解析部门JSON字段
    return users.map((u) => ({
      ...u,
      deptIds: u.deptIdsJson ? (JSON.parse(u.deptIdsJson) as number[]) : [],
      deptNames: u.deptNamesJson ? (JSON.parse(u.deptNamesJson) as string[]) : [],
    }))
  } catch (error) {
    console.error('获取系统用户列表失败:', error)
    return []
  }
}

/**
 * 根据 dingUserId 获取用户的系统角色和活跃状态
 */
export async function getSystemUserRoleAndStatus(dingUserId: string) {
  try {
    const user = await db.systemUser.findUnique({
      where: { dingUserId },
      select: {
        role: true,
        isActive: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      systemRole: user.role,
      isActive: user.isActive,
    }
  } catch (error) {
    console.error('获取用户角色和状态失败:', error)
    return null
  }
}

/**
 * 根据 dingUserId 获取用户的部门信息（已解析的数组）
 */
export async function getSystemUserDeptInfo(dingUserId: string): Promise<{ deptIds: number[]; deptNames: string[] }> {
  try {
    const user = await db.systemUser.findUnique({
      where: { dingUserId },
      select: {
        deptIdsJson: true,
        deptNamesJson: true,
      },
    })
    if (!user) return { deptIds: [], deptNames: [] }
    return {
      deptIds: user.deptIdsJson ? (JSON.parse(user.deptIdsJson) as number[]) : [],
      deptNames: user.deptNamesJson ? (JSON.parse(user.deptNamesJson) as string[]) : [],
    }
  } catch (error) {
    console.error('获取用户部门信息失败:', error)
    return { deptIds: [], deptNames: [] }
  }
}
