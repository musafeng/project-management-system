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
    const canExport = canAccessApi(user.systemRole, 'POST', '/api/management-expenses')
    if (!canExport) throw new ForbiddenError('无权限导出')

    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    const and: any[] = []

    if (keyword) {
      and.push({
        OR: [
          { submitter: { contains: keyword } },
          { remark: { contains: keyword } },
        ],
      })
    }

    if (startDate || endDate) {
      const expenseDate: any = {}
      if (startDate) expenseDate.gte = parseDateOnlyRangeStart(startDate)
      if (endDate) expenseDate.lte = parseDateOnlyRangeEnd(endDate)
      and.push({ expenseDate })
    }

    if (and.length > 0) where.AND = and

    const records = await db.managementExpense.findMany({
      where,
      select: {
        projectId: true,
        submitter: true,
        expenseDate: true,
        totalAmount: true,
        remark: true,
        project: { select: { name: true } },
      },
      orderBy: [
        { expenseDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    const csv = toCsv(records.map(r => ({
      报销人: r.submitter,
      日期: fmtDate(r.expenseDate),
      费用合计: r.totalAmount,
      备注: r.remark || '',
      项目名: r.project?.name || r.projectId || '',
    })))

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('management-expenses.csv')}`,
      },
    })
  },
}, { resource: 'management-expenses' })



