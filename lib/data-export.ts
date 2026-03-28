/**
 * lib/data-export.ts
 * 统一数据导出服务
 * 支持多业务模块查询预览和 CSV 下载
 */

import { db } from '@/lib/db'

export type ResourceType =
  | 'construction-approvals'
  | 'project-contracts'
  | 'contract-receipts'
  | 'procurement-contracts'
  | 'procurement-payments'
  | 'labor-contracts'
  | 'labor-payments'
  | 'subcontract-contracts'
  | 'subcontract-payments'
  | 'projects'

export interface ExportFilter {
  resourceType: ResourceType
  regionId?: string
  projectId?: string
  approvalStatus?: string
  startDate?: string
  endDate?: string
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

// ============================================================
// 各模块查询实现
// ============================================================

async function exportConstructionApprovals(f: ExportFilter) {
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.constructionApproval.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      contract: { select: { code: true, name: true } },
      region: { select: { name: true } },
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
      区域: r.region?.name ?? '',
      项目编号: r.project.code,
      项目名称: r.project.name,
      合同编号: r.contract.code,
      合同名称: r.contract.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.projectContract.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      customer: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    客户名称: r.customer.name,
    合同金额: fmtDecimal(r.contractAmount),
    变更后金额: fmtDecimal(r.changedAmount),
    应收金额: fmtDecimal(r.receivableAmount),
    已收金额: fmtDecimal(r.receivedAmount),
    未收金额: fmtDecimal(r.unreceivedAmount),
    状态: r.status,
    签订日期: fmtDate(r.signDate),
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportContractReceipts(f: ExportFilter) {
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.contractReceipt.findMany({
    where,
    include: {
      contract: { select: { code: true, name: true, project: { select: { name: true, code: true } } } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.region?.name ?? '',
    合同编号: r.contract.code,
    合同名称: r.contract.name,
    项目编号: r.contract.project.code,
    项目名称: r.contract.project.name,
    收款金额: fmtDecimal(r.receiptAmount),
    收款日期: fmtDate(r.receiptDate),
    收款方式: r.receiptMethod ?? '',
    收款状态: r.status,
    备注: r.remark ?? '',
    创建时间: fmtDate(r.createdAt),
    更新时间: fmtDate(r.updatedAt),
  }))
}

async function exportProcurementContracts(f: ExportFilter) {
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.procurementContract.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      supplier: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    供应商: r.supplier.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.procurementPayment.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      contract: { select: { code: true, name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    合同编号: r.contract.code,
    合同名称: r.contract.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.laborContract.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      worker: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    劳务人员: r.worker.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.laborPayment.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      contract: { select: { code: true, name: true } },
      worker: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    合同编号: r.contract.code,
    合同名称: r.contract.name,
    劳务人员: r.worker.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.subcontractContract.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      vendor: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    合同编号: r.code,
    合同名称: r.name,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    分包单位: r.vendor.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.projectId) where.projectId = f.projectId
  if (f.approvalStatus && f.approvalStatus !== 'ALL') where.approvalStatus = f.approvalStatus
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.subcontractPayment.findMany({
    where,
    include: {
      project: { select: { name: true, code: true } },
      contract: { select: { code: true, name: true } },
      vendor: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    区域: r.region?.name ?? '',
    项目编号: r.project.code,
    项目名称: r.project.name,
    合同编号: r.contract.code,
    合同名称: r.contract.name,
    分包单位: r.vendor.name,
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
  const where: any = {}
  if (f.regionId) where.regionId = f.regionId
  if (f.startDate || f.endDate) {
    where.createdAt = {}
    if (f.startDate) where.createdAt.gte = new Date(f.startDate)
    if (f.endDate) where.createdAt.lte = new Date(f.endDate + 'T23:59:59Z')
  }
  const rows = await db.project.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      region: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    项目编号: r.code,
    项目名称: r.name,
    区域: r.region?.name ?? '',
    客户名称: r.customer.name,
    状态: r.status,
    预算: fmtDecimal(r.budget),
    开始日期: fmtDate(r.startDate),
    结束日期: fmtDate(r.endDate),
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
    case 'contract-receipts': return exportContractReceipts(filter)
    case 'procurement-contracts': return exportProcurementContracts(filter)
    case 'procurement-payments': return exportProcurementPayments(filter)
    case 'labor-contracts': return exportLaborContracts(filter)
    case 'labor-payments': return exportLaborPayments(filter)
    case 'subcontract-contracts': return exportSubcontractContracts(filter)
    case 'subcontract-payments': return exportSubcontractPayments(filter)
    case 'projects': return exportProjects(filter)
    default: return []
  }
}

export async function exportToCsv(filter: ExportFilter): Promise<string> {
  const rows = await previewExportData(filter)
  return toCsv(rows)
}




