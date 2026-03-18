/**
 * 系统用户更新 API
 * PUT /api/system-users/[id]
 *
 * 仅 ADMIN 可调用，用于修改用户角色和启用/禁用状态
 */

import { NextResponse } from 'next/server'
import { requireSystemManager } from '@/lib/api'
import { db } from '@/lib/db'
import { SystemUserRole } from '@prisma/client'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 仅系统管理员可操作
    await requireSystemManager()

    const { id } = params
    const body = await req.json()

    // 检查用户是否存在
    const existing = await db.systemUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    const updateData: { role?: SystemUserRole; isActive?: boolean } = {}

    // 更新角色
    if (body.role !== undefined) {
      if (!Object.values(SystemUserRole).includes(body.role)) {
        return NextResponse.json({ success: false, error: '无效的角色值' }, { status: 400 })
      }
      updateData.role = body.role as SystemUserRole
    }

    // 更新启用/禁用
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: '没有可更新的字段' }, { status: 400 })
    }

    const updated = await db.systemUser.update({
      where: { id },
      data: updateData,
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
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        deptIds: updated.deptIdsJson ? JSON.parse(updated.deptIdsJson) : [],
        deptNames: updated.deptNamesJson ? JSON.parse(updated.deptNamesJson) : [],
      },
    })
  } catch (err) {
    console.error('[PUT /api/system-users/:id]', err)
    if (err instanceof Error) {
      if (err.message.includes('未登录') || err.message.includes('登录已失效')) {
        return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
      }
      if (err.message.includes('无权限') || err.message.includes('管理员')) {
        return NextResponse.json({ success: false, error: '无权限，仅管理员可操作' }, { status: 403 })
      }
      return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: '未知错误' }, { status: 500 })
  }
}



