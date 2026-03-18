import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSystemManager } from '@/lib/api'

// GET /api/form-definitions?code=xxx
export async function GET(req: NextRequest) {
  try {
    // code 参数查询供业务前端使用，不需要系统管理权限
    const code = req.nextUrl.searchParams.get('code')

    if (code) {
      // 业务模块加载表单配置，仅需登录即可，不做管理员限制
      const form = await prisma.formDefinition.findUnique({
        where: { code },
        include: {
          fields: { orderBy: { sortOrder: 'asc' } },
        },
      })
      if (!form) return NextResponse.json({ success: true, data: null })
      return NextResponse.json({ success: true, data: form })
    }

    // 无 code 参数 = 管理后台拉取列表，需要系统管理权限
    await requireSystemManager()
    const forms = await prisma.formDefinition.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
      },
    })
    return NextResponse.json({ success: true, data: forms })
  } catch (err: any) {
    console.error('[form-definitions GET]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: '获取表单定义失败' }, { status: 500 })
  }
}

// POST /api/form-definitions
export async function POST(req: NextRequest) {
  try {
    await requireSystemManager()
    const body = await req.json()
    const { name, code, isActive } = body

    if (!name || !code) {
      return NextResponse.json({ success: false, error: '名称和代码不能为空' }, { status: 400 })
    }

    const form = await prisma.formDefinition.create({
      data: { name, code, isActive: isActive !== false },
      include: { fields: true },
    })
    return NextResponse.json({ success: true, data: form }, { status: 201 })
  } catch (err: any) {
    console.error('[form-definitions POST]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    if (err?.code === 'P2002') {
      return NextResponse.json({ success: false, error: '表单代码已存在' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: '创建表单定义失败' }, { status: 500 })
  }
}
