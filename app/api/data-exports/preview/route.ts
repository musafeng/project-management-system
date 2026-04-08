import { NextRequest, NextResponse } from 'next/server'
import { requireSystemManager } from '@/lib/api'
import { previewExportData } from '@/lib/data-export'
import type { ExportFilter, ResourceType } from '@/lib/data-export'
import { resolveRequestedRegionId } from '@/lib/region'

/**
 * GET /api/data-exports/preview
 * 查询导出预览数据（JSON 列表）
 * 仅系统管理员可访问
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSystemManager()

    const p = req.nextUrl.searchParams
    const resourceType = p.get('resourceType') as ResourceType | null

    if (!resourceType) {
      return NextResponse.json({ success: false, error: '请选择业务模块（resourceType）' }, { status: 400 })
    }

    const regionId = await resolveRequestedRegionId(p.get('regionId'), user)

    const filter: ExportFilter = {
      resourceType,
      regionId,
      projectId: p.get('projectId') || undefined,
      approvalStatus: p.get('approvalStatus') || undefined,
      startDate: p.get('startDate') || undefined,
      endDate: p.get('endDate') || undefined,
    }

    const rows = await previewExportData(filter)
    return NextResponse.json({ success: true, data: rows, total: rows.length })
  } catch (err: any) {
    console.error('[data-exports/preview]', err)
    if (err?.message?.includes('无权限')) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err?.message?.includes('未登录') || err?.message?.includes('登录已失效')) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 })
  }
}


