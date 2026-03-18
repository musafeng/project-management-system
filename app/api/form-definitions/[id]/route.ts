import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSystemManager } from '@/lib/api'

// PUT /api/form-definitions/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSystemManager()
    const { id } = params
    const body = await req.json()
    const { name, isActive } = body

    const form = await prisma.formDefinition.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
      },
    })
    return NextResponse.json({ success: true, data: form })
  } catch (err: any) {
    console.error('[form-definitions PUT]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ success: false, error: '表单定义不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: '更新表单定义失败' }, { status: 500 })
  }
}
