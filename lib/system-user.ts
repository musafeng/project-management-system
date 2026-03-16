/**
 * 系统用户管理工具
 * 用于管理系统用户和钉钉用户的同步
 */

import { db } from './db'
import type { DingTalkUser } from './dingtalk'
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
 * 从钉钉用户信息创建系统用户
 */
export async function createSystemUserFromDingTalkUser(userInfo: DingTalkUser) {
  try {
    const systemUser = await db.systemUser.create({
      data: {
        dingUserId: userInfo.userid,
        name: userInfo.name,
        mobile: userInfo.mobile || null,
        unionid: userInfo.unionid || null,
        role: SystemUserRole.STAFF, // 默认角色为普通员工
        isActive: true,
        lastLoginAt: new Date(),
      },
    })

    console.log(`创建系统用户成功: ${userInfo.userid}`)
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
      // 用户存在，更新基本信息（不覆盖 role）
      const updatedUser = await db.systemUser.update({
        where: { dingUserId: userInfo.userid },
        data: {
          name: userInfo.name,
          mobile: userInfo.mobile || null,
          unionid: userInfo.unionid || null,
          lastLoginAt: new Date(),
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
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return users
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

