/**
 * lib/data-export.ts
 * 统一数据导出服务
 * 支持多业务模块查询预览和 CSV 下载
 */

import { db } from '@/lib/db'
import { summarizeAttachmentUrls } from '@/lib/attachments'

export type ResourceType =
  | 'construction-approvals'
  | 'project-contracts'
  | 'project-contract-changes'
  | 'contract-receipts'
  | 'other-receipts'
  | 'procurement-contracts'
  | 'procurement-payments'
  | 'labor-contracts'
  | 'labor-payments'
  | 'subcontract-contracts'
  | 'subcontract-payments'
  | 'other-payments'
  | 'project-expenses'
  | 'management-expenses'
  | 'sales-expenses'
  | 'petty-cashes'
  | 'projects'

export interface ExportFilter {
  resourceType: ResourceType
  regionId?: string
  projectId?: string
  approvalStatus?: string
  startDate?: string
  endDate?: string
}

function applyDateRange(where: Record<string, any>, filter: ExportFilter, field: string) {
  if (filter.startDate || filter.endDate) {
    where[field] = {}
    if (filter.startDate) where[field].gte = new Date(filter.startDate)
    if (filter.endDate) where[field].lte = new Date(filter.endDate + 'T23:59:59Z')
  }
}

function applyCreatedAtRange(where: Record<string, any>, filter: ExportFilter) {
  applyDateRange(where, filter, 'createdAt')
}

function buildDirectRegionWhere(filter: ExportFilter) {
  const where: Record<string, any> = {}
  if (filter.regionId) where.regionId = filter.regionId
  if (filter.projectId) where.projectId = filter.projectId
  if (filter.approvalStatus && filter.approvalStatus !== 'ALL') {
    where.approvalStatus = filter.approvalStatus
  }
  applyCreatedAtRange(where, filter)
  return where
}

/** 将任意值转为 CSV 安全字符串 */
function csvCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // 如果含逗号、引号或换行，用双引号包裹并转义内部双引号
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** 将对象数组转为 CSV 字符串（UTF-8 BOM，Excel 可直接打开） */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(',')),
  ]
  // \uFEFF = UTF-8 BOM
  return '\uFEFF' + lines.join('\r\n')
}

/** 格式化日期 */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

/** 格式化金额 */
function fmtDecimal(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function summarizeExpenseItems(value: string | null | undefined): string {
  const items = parseJsonArray<{
    type?: string
    amount?: number | string
    remark?: string | null
    attachmentUrl?: string | null
  }>(value)

  return items
    .map((item) => {
      const parts = [`${item.type ?? ''}:${fmtDecimal(item.amount ?? '')}`]
      if (item.remark) parts.push(`备注:${item.remark}`)
      if (item.attachmentUrl) parts.push('有附件')
      return parts.join(' ')
    })
    .filter(Boolean)
    .join(' / ')
}

function summarizeDeductionItems(value: string | null | undefined): {
  summary: string
  total: number
} {
  const items = parseJsonArray<{
    type?: string
    amount?: number | string
    remark?: string | null
    attachmentUrl?: string | null
  }>(value)

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const summary = items
    .map((item) => {
      const parts = [`${item.type ?? ''}:${fmtDecimal(item.amount ?? '')}`]
      if (item.remark) parts.push(`备注:${item.remark}`)
      if (item.attachmentUrl) parts.push('有附件')
      return parts.join(' ')
    })
    .filter(Boolean)
    .join(' / ')

  return { summary, total }
}

// ============================================================
// 各模块查询实现
// ============================================================

async function exportConstructionApprovals(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.constructionApproval.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      ProjectContract: { select: { code: true, name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => {
    let formData: Record<string, unknown> = {}
    if (r.formDataJson) {
      try { formData = JSON.parse(r.formDataJson) } catch { /* ignore */ }
    }
    return {
      id: r.id,
      编号: r.code,
      立项名称: r.name,
      区域: r.Region?.name ?? '',
      项目编号: r.Project.code,
      项目名称: r.Project.name,
      合同编号: r.ProjectContract.code,
      合同名称: r.ProjectContract.name,
      预算金额: fmtDecimal(r.budget),
      审批状态: r.approvalStatus,
      开始日期: fmtDate(r.startDate),
      备注: r.remark ?? '',
      动态表单JSON: r.formDataJson ?? '',
      ...Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [`扩展_${k}`, v])
      ),
      创建时间: fmtDate(r.createdAt),
      更新时间: fmtDate(r.updatedAt),
    }
  })
}

async function exportProjectContracts(f: ExportFilter) {
  const where: Record<string, any> = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') {
    where.approvalStatus = f.approvalStatus
  }
  applyDateRange(where, f, 'signDate')

  const rows = await db.projectContract.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Customer: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: [{ signDate: 'desc' }, { createdAt: 'desc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    客户名称: r.Customer.name,
    合同金额: fmtDecimal(r.contractAmount),
    变更后金额: fmtDecimal(r.changedAmount),
    应收金额: fmtDecimal(r.receivableAmount),
    已收金额: fmtDecimal(r.receivedAmount),
    未收金额: fmtDecimal(r.unreceivedAmount),
    合同类型: r.contractType ?? '',
    付款方式: r.paymentMethod ?? '',
    有无质保金: r.hasRetention ? '有' : '无',
    质保金比例: fmtDecimal(r.retentionRate),
    质保金金额: fmtDecimal(r.retentionAmount),
    状态: r.status,
    签订日期: fmtDate(r.signDate),
    开工日期: fmtDate(r.startDate),
    竣工日期: fmtDate(r.endDate),
    附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportProjectContractChanges(f: ExportFilter) {
  const where: Record<string, any> = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') {
    where.approvalStatus = f.approvalStatus
  }
  if (f.projectId) {
    where.ProjectContract = { projectId: f.projectId }
  }
  applyCreatedAtRange(where, f)

  const rows = await db.projectContractChange.findMany({
    where,
    include: {
      ProjectContract: {
        select: {
          code: true,
          name: true,
          Project: { select: { code: true, name: true } },
        },
      },
      Region: { select: { name: true } },
    },
    orderBy: [{ changeDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    合同编号: r.ProjectContract.code,
    合同名称: r.ProjectContract.name,
    项目编号: r.ProjectContract.Project.code,
    项目名称: r.ProjectContract.Project.name,
    变更日期: fmtDate(r.changeDate),
    增项金额: fmtDecimal(r.increaseAmount ?? r.changeAmount),
    合同原金额: fmtDecimal(r.originalAmount),
    合同总金额: fmtDecimal(r.totalAmount),
    审批状态: r.approvalStatus,
    备注: r.remark ?? '',
    附件: summarizeAttachmentUrls(r.attachmentUrl),
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportContractReceipts(f: ExportFilter) {
  const where: Record<string, any> = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') {
    where.approvalStatus = f.approvalStatus
  }
  if (f.projectId) {
    where.ProjectContract = { projectId: f.projectId }
  }
  applyDateRange(where, f, 'receiptDate')

  const rows = await db.contractReceipt.findMany({
    where,
    include: {
      ProjectContract: { select: { code: true, name: true, Project: { select: { name: true, code: true } } } },
      Region: { select: { name: true } },
    },
    orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
  })
  return rows.map((r) => {
    const { summary, total } = summarizeDeductionItems(r.deductionItems)
    const actualReceivedAmount = Number(r.receiptAmount) - total

    return {
      id: r.id,
      区域: r.Region?.name ?? '',
      合同编号: r.ProjectContract.code,
      合同名称: r.ProjectContract.name,
      项目编号: r.ProjectContract.Project.code,
      项目名称: r.ProjectContract.Project.name,
      收款金额: fmtDecimal(r.receiptAmount),
      扣款明细: summary,
      扣款合计: fmtDecimal(total),
      到账金额: fmtDecimal(actualReceivedAmount),
      收款日期: fmtDate(r.receiptDate),
      收款方式: r.receiptMethod ?? '',
      收款状态: r.status,
      审批状态: r.approvalStatus,
      附件: summarizeAttachmentUrls(r.attachmentUrl),
      备注: r.remark ?? '',
      创建时间: fmtDate(r.createdAt),
      更新时间: fmtDate(r.updatedAt),
    }
  })
}

async function exportOtherReceipts(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  applyDateRange(where, f, 'receiptDate')

  const rows = await db.otherReceipt.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Region: { select: { name: true } },
    },
    orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project?.code ?? '',
    项目名称: r.Project?.name ?? '',
    收款事由: r.receiptType,
    收款金额: fmtDecimal(r.receiptAmount),
    收款日期: fmtDate(r.receiptDate),
    收款方式: r.receiptMethod ?? '',
    审批状态: r.approvalStatus,
    附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportProjectExpenses(f: ExportFilter) {
  const where: Record<string, any> = {
    Project: {
      ...(f.regionId ? { regionId: f.regionId } : {}),
      ...(f.projectId ? { id: f.projectId } : {}),
    },
  }
  if (f.approvalStatus && f.approvalStatus !== 'ALL') {
    where.approvalStatus = f.approvalStatus
  }
  applyDateRange(where, f, 'expenseDate')

  const rows = await db.projectExpense.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      ConstructionApproval: { select: { name: true, code: true } },
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    施工立项编号: r.ConstructionApproval?.code ?? '',
    施工立项名称: r.ConstructionApproval?.name ?? '',
    报销人: r.submitter ?? '',
    总金额: fmtDecimal(r.totalAmount ?? r.expenseAmount),
    费用明细: summarizeExpenseItems(r.expenseItems),
    日期: fmtDate(r.expenseDate),
    审批状态: r.approvalStatus,
    整单附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportManagementExpenses(f: ExportFilter) {
  const where: Record<string, any> = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') {
    where.approvalStatus = f.approvalStatus
  }
  applyDateRange(where, f, 'expenseDate')

  const rows = await db.managementExpense.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Region: { select: { name: true } },
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project?.code ?? '',
    项目名称: r.Project?.name ?? '',
    报销人: r.submitter ?? '',
    费用类别: r.category,
    总金额: fmtDecimal(r.totalAmount ?? r.expenseAmount),
    费用明细: summarizeExpenseItems(r.expenseItems),
    日期: fmtDate(r.expenseDate),
    审批状态: r.approvalStatus,
    整单附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportSalesExpenses(f: ExportFilter) {
  const where: Record<string, any> = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') {
    where.approvalStatus = f.approvalStatus
  }
  applyDateRange(where, f, 'expenseDate')

  const rows = await db.salesExpense.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Region: { select: { name: true } },
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project?.code ?? '',
    项目名称: r.Project?.name ?? '',
    报销人: r.submitter ?? '',
    费用类别: r.category,
    总金额: fmtDecimal(r.totalAmount ?? r.expenseAmount),
    费用明细: summarizeExpenseItems(r.expenseItems),
    日期: fmtDate(r.expenseDate),
    审批状态: r.approvalStatus,
    整单附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportOtherPayments(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  applyDateRange(where, f, 'paymentDate')

  const rows = await db.otherPayment.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Region: { select: { name: true } },
    },
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project?.code ?? '',
    项目名称: r.Project?.name ?? '',
    付款事由: r.paymentType,
    付款金额: fmtDecimal(r.paymentAmount),
    付款日期: fmtDate(r.paymentDate),
    付款方式: r.paymentMethod ?? '',
    状态: r.status,
    审批状态: r.approvalStatus,
    附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportProcurementContracts(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.procurementContract.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Supplier: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    供应商: r.Supplier.name,
    合同金额: fmtDecimal(r.contractAmount),
    应付金额: fmtDecimal(r.payableAmount),
    已付金额: fmtDecimal(r.paidAmount),
    未付金额: fmtDecimal(r.unpaidAmount),
    状态: r.status,
    审批状态: r.approvalStatus,
    签订日期: fmtDate(r.signDate),
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportProcurementPayments(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.procurementPayment.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      ProcurementContract: { select: { code: true, name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    合同编号: r.ProcurementContract.code,
    合同名称: r.ProcurementContract.name,
    付款金额: fmtDecimal(r.paymentAmount),
    付款日期: fmtDate(r.paymentDate),
    付款方式: r.paymentMethod ?? '',
    状态: r.status,
    审批状态: r.approvalStatus,
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportLaborContracts(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.laborContract.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      LaborWorker: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    劳务人员: r.LaborWorker.name,
    合同金额: fmtDecimal(r.contractAmount),
    应付金额: fmtDecimal(r.payableAmount),
    已付金额: fmtDecimal(r.paidAmount),
    未付金额: fmtDecimal(r.unpaidAmount),
    状态: r.status,
    审批状态: r.approvalStatus,
    签订日期: fmtDate(r.signDate),
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportLaborPayments(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.laborPayment.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      LaborContract: { select: { code: true, name: true } },
      LaborWorker: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    合同编号: r.LaborContract.code,
    合同名称: r.LaborContract.name,
    劳务人员: r.LaborWorker.name,
    付款金额: fmtDecimal(r.paymentAmount),
    付款日期: fmtDate(r.paymentDate),
    状态: r.status,
    审批状态: r.approvalStatus,
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportSubcontractContracts(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.subcontractContract.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      SubcontractVendor: { select: { name: true } },
      LaborWorker: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    分包对象: r.LaborWorker?.name ?? r.SubcontractVendor?.name ?? '',
    合同金额: fmtDecimal(r.contractAmount),
    应付金额: fmtDecimal(r.payableAmount),
    已付金额: fmtDecimal(r.paidAmount),
    未付金额: fmtDecimal(r.unpaidAmount),
    状态: r.status,
    审批状态: r.approvalStatus,
    签订日期: fmtDate(r.signDate),
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportSubcontractPayments(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  const rows = await db.subcontractPayment.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      SubcontractContract: { select: { code: true, name: true } },
      SubcontractVendor: { select: { name: true } },
      LaborWorker: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project.code,
    项目名称: r.Project.name,
    合同编号: r.SubcontractContract.code,
    合同名称: r.SubcontractContract.name,
    分包对象: r.LaborWorker?.name ?? r.SubcontractVendor?.name ?? '',
    付款金额: fmtDecimal(r.paymentAmount),
    付款日期: fmtDate(r.paymentDate),
    状态: r.status,
    审批状态: r.approvalStatus,
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportProjects(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  if (f.projectId) {
    where.id = f.projectId
  }
  const rows = await db.project.findMany({
    where,
    include: {
      Customer: { select: { name: true } },
      Region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    项目编号: r.code,
    项目名称: r.name,
    区域: r.Region?.name ?? '',
    客户名称: r.Customer.name,
    状态: r.status,
    预算: fmtDecimal(r.budget),
    开始日期: fmtDate(r.startDate),
    结束日期: fmtDate(r.endDate),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportPettyCashes(f: ExportFilter) {
  const where = buildDirectRegionWhere(f)
  applyDateRange(where, f, 'issueDate')

  const rows = await db.pettyCash.findMany({
    where,
    include: {
      Project: { select: { name: true, code: true } },
      Region: { select: { name: true } },
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    区域: r.Region?.name ?? '',
    项目编号: r.Project?.code ?? '',
    项目名称: r.Project?.name ?? '',
    申请人: r.holder,
    申请事由: r.applyReason ?? '',
    发放金额: fmtDecimal(r.issuedAmount),
    已退回金额: fmtDecimal(r.returnedAmount),
    发放日期: fmtDate(r.issueDate),
    退回日期: fmtDate(r.returnDate),
    状态: r.status,
    审批状态: r.approvalStatus,
    附件: summarizeAttachmentUrls(r.attachmentUrl),
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

// ============================================================
// 统一入口
// ============================================================

export async function previewExportData(filter: ExportFilter): Promise<Record<string, unknown>[]> {
  switch (filter.resourceType) {
    case 'construction-approvals': return exportConstructionApprovals(filter)
    case 'project-contracts': return exportProjectContracts(filter)
    case 'project-contract-changes': return exportProjectContractChanges(filter)
    case 'contract-receipts': return exportContractReceipts(filter)
    case 'other-receipts': return exportOtherReceipts(filter)
    case 'procurement-contracts': return exportProcurementContracts(filter)
    case 'procurement-payments': return exportProcurementPayments(filter)
    case 'labor-contracts': return exportLaborContracts(filter)
    case 'labor-payments': return exportLaborPayments(filter)
    case 'subcontract-contracts': return exportSubcontractContracts(filter)
    case 'subcontract-payments': return exportSubcontractPayments(filter)
    case 'other-payments': return exportOtherPayments(filter)
    case 'project-expenses': return exportProjectExpenses(filter)
    case 'management-expenses': return exportManagementExpenses(filter)
    case 'sales-expenses': return exportSalesExpenses(filter)
    case 'petty-cashes': return exportPettyCashes(filter)
    case 'projects': return exportProjects(filter)
    default: return []
  }
}

export async function exportToCsv(filter: ExportFilter): Promise<string> {
  const rows = await previewExportData(filter)
  return toCsv(rows)
}
