/**
 * Feature Flag 工具类
 * 
 * 用途：
 * - 管理功能开关的启用/禁用状态
 * - 支持按表单、角色、白名单、能力灰度
 * - 提供简单的 API 查询接口
 * 
 * 设计原则：
 * - 轻量级，不依赖复杂的配置
 * - 支持多维度灰度（表单、角色、白名单、能力）
 * - 缓存友好，支持快速查询
 * - 易于回滚，Feature Flag 关闭时自动使用旧逻辑
 */

import { db } from '@/lib/db'

export interface FeatureFlagCheckOptions {
  form?: string
  role?: string
  userId?: string
  ability?: string
}

export class FeatureFlags {
  /**
   * 检查 Feature Flag 是否启用
   * 
   * @param flagName Feature Flag 名称
   * @param options 灰度选项（表单、角色、用户、能力）
   * @returns 是否启用
   */
  static async isEnabled(
    flagName: string,
    options?: FeatureFlagCheckOptions
  ): Promise<boolean> {
    try {
      // 1. 获取 Feature Flag 配置
      const flag = await db.featureFlag.findFirst({
        where: { flagName },
      })

      // 如果 Flag 不存在或未启用，返回 false
      if (!flag || !flag.isEnabled) {
        return false
      }

      // 2. 如果没有灰度配置，直接返回 true
      if (!flag.gradualType || !flag.gradualValue) {
        return true
      }

      // 3. 根据灰度类型检查是否在灰度范围内
      const gradualConfig = JSON.parse(flag.gradualValue)

      switch (flag.gradualType) {
        case 'form':
          return this.checkFormGradual(gradualConfig, options?.form)

        case 'role':
          return this.checkRoleGradual(gradualConfig, options?.role)

        case 'whitelist':
          return this.checkWhitelistGradual(gradualConfig, options?.userId)

        case 'ability':
          return this.checkAbilityGradual(gradualConfig, options?.ability)

        default:
          return true
      }
    } catch (error) {
      console.error('[FeatureFlags] Error checking flag:', flagName, error)
      // 出错时返回 false，保持保守策略
      return false
    }
  }

  /**
   * 按表单灰度检查
   */
  private static checkFormGradual(
    config: any,
    form?: string
  ): boolean {
    if (!form) return false
    const forms = config.forms || []
    return forms.includes(form)
  }

  /**
   * 按角色灰度检查
   */
  private static checkRoleGradual(
    config: any,
    role?: string
  ): boolean {
    if (!role) return false
    const roles = config.roles || []
    return roles.includes(role)
  }

  /**
   * 按白名单灰度检查
   */
  private static checkWhitelistGradual(
    config: any,
    userId?: string
  ): boolean {
    if (!userId) return false
    const userIds = config.userIds || []
    return userIds.includes(userId)
  }

  /**
   * 按能力灰度检查
   */
  private static checkAbilityGradual(
    config: any,
    ability?: string
  ): boolean {
    if (!ability) return false
    const abilities = config.abilities || []
    return abilities.includes(ability)
  }

  /**
   * 获取 Feature Flag 配置
   */
  static async getFlag(flagName: string) {
    return await db.featureFlag.findFirst({
      where: { flagName },
    })
  }

  /**
   * 获取所有 Feature Flag
   */
  static async getAllFlags(environment?: string) {
    if (environment) {
      return await db.featureFlag.findMany({
        where: { environment },
      })
    }
    return await db.featureFlag.findMany()
  }
}
