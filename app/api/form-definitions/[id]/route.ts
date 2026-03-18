import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/form-definitions/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    if (err?.code === 'P2025') {
      return NextResponse.json({ success: false, error: '表单定义不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: '更新表单定义失败' }, { status: 500 })
  }
}

