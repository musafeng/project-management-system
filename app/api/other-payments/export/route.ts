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
    const canExport = canAccessApi(user.systemRole, 'POST', '/api/other-payments')
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
          { paymentType: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const paymentDate: any = {}
      if (startDate) paymentDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) paymentDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ paymentDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.otherPayment.findMany({
      where,
      select: {
        projectId: true,
        paymentType: true,
        paymentDate: true,
        paymentAmount: true,
        remark: true,
        project: { select: { name: true } },
      },
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    const csv = toCsv(records.map(r => ({
      付款类型: r.paymentType,
      付款日期: fmtDate(r.paymentDate),
      金额: r.paymentAmount,
      项目名: r.project?.name || r.projectId || '',
      备注: r.remark || '',
    })))

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('other-payments.csv')}`,
      },
    })
  },
}, { resource: 'other-payments' })


