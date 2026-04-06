import { NextResponse } from 'next/server'
import { apiHandlerWithPermissionAndLog, canAccessApi, ForbiddenError, getCurrentUser } from '@/lib/api'
import { exportToCsv, type ResourceType } from '@/lib/data-export'
import { getCurrentRegionId } from '@/lib/region'

export function createCsvExportRoute(resourceType: ResourceType, filename: string) {
  return apiHandlerWithPermissionAndLog({
    GET: async (req: Request) => {
      const user = await getCurrentUser()
      const canExport = canAccessApi(user.systemRole, 'POST', `/api/${resourceType}`)
      if (!canExport) {
        throw new ForbiddenError('无权限导出')
      }

      const { searchParams } = new URL(req.url)
      const regionId = await getCurrentRegionId()
      const csv = await exportToCsv({
        resourceType,
        regionId: regionId ?? undefined,
        projectId: searchParams.get('projectId') || undefined,
        contractId: searchParams.get('contractId') || undefined,
        keyword: searchParams.get('keyword') || undefined,
        status: searchParams.get('status') || undefined,
        approvalStatus: searchParams.get('approvalStatus') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
      })

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      })
    },
  }, { resource: resourceType })
}
