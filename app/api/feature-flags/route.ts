/**
 * GET /api/feature-flags
 * 
 * 用途：查询 Feature Flag 状态
 * 
 * 查询参数：
 * - flagName: 指定 Feature Flag 名称（可选）
 * - form: 表单名称（用于灰度检查）
 * - role: 用户角色（用于灰度检查）
 * - userId: 用户 ID（用于白名单检查）
 * - ability: 能力名称（用于能力灰度检查）
 * 
 * 响应：
 * - 单个 Flag: { isEnabled: boolean, ... }
 * - 所有 Flag: [{ flagName, isEnabled, ... }]
 */

import { NextResponse } from 'next/server'
import { FeatureFlags } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const flagName = searchParams.get('flagName')
    const form = searchParams.get('form')
    const role = searchParams.get('role')
    const userId = searchParams.get('userId')
    const ability = searchParams.get('ability')

    // 如果指定了 flagName，返回单个 Flag 的状态
    if (flagName) {
      const isEnabled = await FeatureFlags.isEnabled(flagName, {
        form: form || undefined,
        role: role || undefined,
        userId: userId || undefined,
        ability: ability || undefined,
      })

      const flag = await FeatureFlags.getFlag(flagName)

      return NextResponse.json({
        success: true,
        data: {
          flagName,
          isEnabled,
          ...flag,
        },
      })
    }

    // 否则返回所有 Flag 的列表
    const flags = await FeatureFlags.getAllFlags()

    return NextResponse.json({
      success: true,
      data: flags,
    })
  } catch (error) {
    console.error('[feature-flags] GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feature flags',
      },
      { status: 500 }
    )
  }
}







