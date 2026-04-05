import { NextRequest, NextResponse } from 'next/server'
import { requireSystemManager } from '@/lib/api'
import { exportToCsv } from '@/lib/data-export'
import type { ExportFilter, ResourceType } from '@/lib/data-export'

export const dynamic = 'force-dynamic'

/**
 * GET /api/data-exports/download
 * 下载 CSV 文件流
 * 仅系统管理员可访问
 */
export async function GET(req: NextRequest) {
  try {
    await requireSystemManager()

    const p = req.nextUrl.searchParams
    const resourceType = p.get('resourceType') as ResourceType | null

    if (!resourceType) {
      return NextResponse.json({ success: false, error: '请选择业务模块（resourceType）' }, { status: 400 })
    }

    const filter: ExportFilter = {
      resourceType,
      regionId: p.get('regionId') || undefined,
      projectId: p.get('projectId') || undefined,
      approvalStatus: p.get('approvalStatus') || undefined,
      startDate: p.get('startDate') || undefined,
      endDate: p.get('endDate') || undefined,
    }

    const csv = await exportToCsv(filter)
    const filename = `${resourceType}_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err: any) {
    console.error('[data-exports/download]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: '下载失败' }, { status: 500 })
  }
}



