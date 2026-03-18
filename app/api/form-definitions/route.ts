import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/form-definitions?code=xxx
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')

    if (code) {
      const form = await prisma.formDefinition.findUnique({
        where: { code },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
      if (!form) {
        return NextResponse.json({ success: true, data: null })
      }
      return NextResponse.json({ success: true, data: form })
    }

    const forms = await prisma.formDefinition.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    return NextResponse.json({ success: true, data: forms })
  } catch (err) {
    console.error('[form-definitions GET]', err)
    return NextResponse.json({ success: false, error: '获取表单定义失败' }, { status: 500 })
  }
}

// POST /api/form-definitions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, code, isActive } = body

    if (!name || !code) {
      return NextResponse.json({ success: false, error: '名称和代码不能为空' }, { status: 400 })
    }

    const form = await prisma.formDefinition.create({
      data: {
        name,
        code,
        isActive: isActive !== false,
      },
      include: { fields: true },
    })
    return NextResponse.json({ success: true, data: form }, { status: 201 })
  } catch (err: any) {
    console.error('[form-definitions POST]', err)
    if (err?.code === 'P2002') {
      return NextResponse.json({ success: false, error: '表单代码已存在' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: '创建表单定义失败' }, { status: 500 })
  }
}

