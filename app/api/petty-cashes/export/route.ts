import { NextResponse } from 'next/server'
import { apiHandlerWithPermissionAndLog, canAccessApi, ForbiddenError, getCurrentUser } from '@/lib/api'
import { formatDateOnly, parseDateOnlyRangeEnd, parseDateOnlyRangeStart } from '@/lib/date-only'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map(row => headers.map(h => csvCell(row[h])).join(',')),
  ]
  return '\uFEFF' + lines.join('\r\n')
}

function fmtDate(v: Date | string | null | undefined) {
  return formatDateOnly(v)
}

export const { GET } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const user = await getCurrentUser()
    const canExport = canAccessApi(user.systemRole, 'POST', '/api/petty-cashes')
    if (!canExport) throw new ForbiddenError('无权限导出')

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const keyword = searchParams.get('keyword')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (projectId) where.projectId = projectId

    const and: any[] = []

    if (keyword) {
      and.push({
        OR: [
          { holder: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const issueDate: any = {}
      if (startDate) issueDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) issueDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ issueDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.pettyCash.findMany({
      where,
      select: {
        projectId: true,
        holder: true,
        issueDate: true,
        issuedAmount: true,
        remark: true,
        project: { select: { name: true } },
      },
      orderBy: [
        { issueDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    const csv = toCsv(records.map(r => ({
      申请人: r.holder,
      申请日期: fmtDate(r.issueDate),
      金额: r.issuedAmount,
      项目名: r.project?.name || r.projectId || '',
      备注: r.remark || '',
    })))

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('petty-cashes.csv')}`,
      },
    })
  },
}, { resource: 'petty-cashes' })



