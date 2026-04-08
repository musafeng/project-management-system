/**
 * Feature Flag 工具类
 * 当前项目未启用数据库 FeatureFlag 模型，统一降级为默认关闭。
 */

export interface FeatureFlagOptions {
  form?: string
  role?: string
  userId?: string
  ability?: string
}

export class FeatureFlags {
  /**
   * 检查 Feature Flag 是否启用
   */
  static async isEnabled(
    _flagName: string,
    _options?: FeatureFlagOptions
  ): Promise<boolean> {
    return false
  }

  /**
   * 启用 Feature Flag
   */
  static async enable(
    _flagName: string,
    _gradualType?: string,
    _gradualValue?: string
  ): Promise<void> {
    throw new Error('feature flag 暂未启用')
  }

  /**
   * 禁用 Feature Flag
   */
  static async disable(_flagName: string): Promise<void> {
    throw new Error('feature flag 暂未启用')
  }

  /**
   * 获取 Feature Flag 配置
   */
  static async get(_flagName: string) {
    return null
  }

  /**
   * 获取所有 Feature Flag 配置
   */
  static async getAll() {
    return []
  }
}
