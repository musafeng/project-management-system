import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSystemManager } from '@/lib/api'

export const dynamic = 'force-dynamic'


// PUT /api/form-definitions/[id]/fields/[fieldId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    await requireSystemManager()
    const { fieldId } = params
    const body = await req.json()
    const { label, fieldKey, componentType, required, optionsJson, sortOrder } = body

    const field = await prisma.formField.update({
      where: { id: fieldId },
      data: {
        ...(label !== undefined && { label }),
        ...(fieldKey !== undefined && { fieldKey }),
        ...(componentType !== undefined && { componentType }),
        ...(required !== undefined && { required }),
        ...(optionsJson !== undefined && { optionsJson }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })
    return NextResponse.json({ success: true, data: field })
  } catch (err: any) {
    console.error('[form-definitions fields PUT]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ success: false, error: '字段不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: '更新字段失败' }, { status: 500 })
  }
}

// DELETE /api/form-definitions/[id]/fields/[fieldId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    await requireSystemManager()
    const { fieldId } = params
    await prisma.formField.delete({ where: { id: fieldId } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[form-definitions fields DELETE]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ success: false, error: '字段不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: '删除字段失败' }, { status: 500 })
  }
}
