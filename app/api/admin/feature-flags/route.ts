/**
 * POST /api/admin/feature-flags
 * 
 * 用途：管理 Feature Flag（启用、禁用、更新灰度配置）
 * 
 * 请求体：
 * - action: 'enable' | 'disable' | 'update'
 * - flagName: Feature Flag 名称
 * - gradualType: 灰度类型（'form' | 'role' | 'whitelist' | 'ability'）
 * - gradualValue: 灰度配置（JSON 字符串）
 * 
 * 响应：
 * - { success: true, data: { ... } }
 * - { success: false, error: '...' }
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, flagName, gradualType, gradualValue } = body

    // 验证必填参数
    if (!action || !flagName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: action, flagName',
        },
        { status: 400 }
      )
    }

    // 验证 action 值
    if (!['enable', 'disable', 'update'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be one of: enable, disable, update',
        },
        { status: 400 }
      )
    }

    // 执行对应的操作
    let updateData: any = {}

    switch (action) {
      case 'enable':
        updateData = {
          isEnabled: true,
          gradualType,
          gradualValue,
          enabledAt: new Date(),
        }
        break

      case 'disable':
        updateData = {
          isEnabled: false,
          gradualType: null,
          gradualValue: null,
        }
        break

      case 'update':
        if (!gradualType || !gradualValue) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required parameters for update: gradualType, gradualValue',
            },
            { status: 400 }
          )
        }
        updateData = {
          gradualType,
          gradualValue,
        }
        break
    }

    // 更新 Feature Flag
    await db.featureFlag.updateMany({
      where: { flagName },
      data: updateData,
    })

    const flag = await db.featureFlag.findFirst({
      where: { flagName },
    })

    return NextResponse.json({
      success: true,
      data: flag,
    })
  } catch (error) {
    console.error('[admin/feature-flags] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage feature flag',
      },
      { status: 500 }
    )
  }
}
