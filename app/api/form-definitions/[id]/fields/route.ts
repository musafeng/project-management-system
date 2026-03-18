import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSystemManager } from '@/lib/api'

// POST /api/form-definitions/[id]/fields
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSystemManager()
    const { id: formId } = params
    const body = await req.json()
    const { label, fieldKey, componentType, required, optionsJson, sortOrder } = body

    if (!label || !fieldKey || !componentType) {
      return NextResponse.json(
        { success: false, error: 'label、fieldKey、componentType 不能为空' },
        { status: 400 }
      )
    }

    const field = await prisma.formField.create({
      data: {
        formId,
        label,
        fieldKey,
        componentType,
        required: required === true,
        optionsJson: optionsJson || null,
        sortOrder: sortOrder ?? 0,
      },
    })
    return NextResponse.json({ success: true, data: field }, { status: 201 })
  } catch (err: any) {
    console.error('[form-definitions fields POST]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: '新增字段失败' }, { status: 500 })
  }
}
