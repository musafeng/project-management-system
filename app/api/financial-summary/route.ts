/**
 * GET /api/financial-summary
 * 财务汇总看板 API
 * 支持按项目、日期范围筛选，返回各类金额汇总
 */
import { apiHandlerWithPermissionAndLog, success } from '@/lib/api'
import { db } from '@/lib/db'
import { requireCurrentRegionId } from '@/lib/region'
import { Decimal } from '@prisma/client/runtime/library'

function toNum(v: Decimal | null | undefined) {
  return v ? Number(v) : 0
}

export const { GET } = apiHandlerWithPermissionAndLog({
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const regionId = await requireCurrentRegionId()

    // 项目过滤
    const projectWhere: any = {}
    if (regionId) projectWhere.regionId = regionId
    if (projectId) projectWhere.id = projectId

    const projects = await db.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, code: true, status: true },
      orderBy: { createdAt: 'desc' },
    })

    const projectIds = projects.map(p => p.id)

    // 日期过滤辅助
    const dateRange = startDate || endDate ? {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    } : undefined

    // 并行查询所有金额相关数据
    const [contractReceipts, otherReceipts, procurementPayments, laborPayments,
      subcontractPayments, projectExpenses, managementExpenses, salesExpenses,
      otherPayments, pettyCashes, projectContracts, procurementContracts,
      laborContracts, subcontractContracts] = await Promise.all([
      // 收入
      db.contractReceipt.groupBy({
        by: ['contractId'],
        where: { regionId, ProjectContract: { projectId: { in: projectIds } }, approvalStatus: 'APPROVED',
          ...(dateRange ? { receiptDate: dateRange } : {}) },
        _sum: { receiptAmount: true },
      }),
      db.otherReceipt.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { receiptDate: dateRange } : {}) },
        _sum: { receiptAmount: true },
      }),
      // 支出
      db.procurementPayment.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { paymentDate: dateRange } : {}) },
        _sum: { paymentAmount: true },
      }),
      db.laborPayment.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { paymentDate: dateRange } : {}) },
        _sum: { paymentAmount: true },
      }),
      db.subcontractPayment.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { paymentDate: dateRange } : {}) },
        _sum: { paymentAmount: true },
      }),
      db.projectExpense.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, approvalStatus: 'APPROVED', Project: { regionId },
          ...(dateRange ? { expenseDate: dateRange } : {}) },
        _sum: { expenseAmount: true },
      }),
      db.managementExpense.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { expenseDate: dateRange } : {}) },
        _sum: { expenseAmount: true },
      }),
      db.salesExpense.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { expenseDate: dateRange } : {}) },
        _sum: { expenseAmount: true },
      }),
      db.otherPayment.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { paymentDate: dateRange } : {}) },
        _sum: { paymentAmount: true },
      }),
      db.pettyCash.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, regionId, approvalStatus: 'APPROVED',
          ...(dateRange ? { issueDate: dateRange } : {}) },
        _sum: { issuedAmount: true },
      }),
      // 合同汇总
      db.projectContract.findMany({
        where: { projectId: { in: projectIds }, regionId },
        select: { projectId: true, contractAmount: true, receivedAmount: true, unreceivedAmount: true },
      }),
      db.procurementContract.findMany({
        where: { projectId: { in: projectIds }, regionId },
        select: { projectId: true, contractAmount: true, paidAmount: true, unpaidAmount: true },
      }),
      db.laborContract.findMany({
        where: { projectId: { in: projectIds }, regionId },
        select: { projectId: true, contractAmount: true, paidAmount: true, unpaidAmount: true },
      }),
      db.subcontractContract.findMany({
        where: { projectId: { in: projectIds }, regionId },
        select: { projectId: true, contractAmount: true, paidAmount: true, unpaidAmount: true },
      }),
    ])

    // 查合同收款需要先获取合同的projectId映射
    const allContracts = await db.projectContract.findMany({
      where: { projectId: { in: projectIds }, regionId },
      select: { id: true, projectId: true },
    })
    const contractToProject: Record<string, string> = {}
    for (const c of allContracts) contractToProject[c.id] = c.projectId

    // 按项目聚合
    const byProject: Record<string, any> = {}
    for (const p of projects) {
      byProject[p.id] = {
        projectId: p.id, projectName: p.name, projectCode: p.code, status: p.status,
        // 收入
        contractReceiptAmount: 0, otherReceiptAmount: 0, totalReceiptAmount: 0,
        // 支出
        procurementPaymentAmount: 0, laborPaymentAmount: 0, subcontractPaymentAmount: 0,
        projectExpenseAmount: 0, managementExpenseAmount: 0, salesExpenseAmount: 0,
        otherPaymentAmount: 0, pettyCashAmount: 0, totalPaymentAmount: 0,
        // 利润
        profit: 0,
        // 合同
        contractAmount: 0, receivedAmount: 0, unreceivedAmount: 0,
        procurementContractAmount: 0, procurementPaidAmount: 0, procurementUnpaidAmount: 0,
        laborContractAmount: 0, laborPaidAmount: 0, laborUnpaidAmount: 0,
        subcontractContractAmount: 0, subcontractPaidAmount: 0, subcontractUnpaidAmount: 0,
      }
    }

    // 填充合同收款（按contractId -> projectId映射）
    for (const r of contractReceipts) {
      const pid = contractToProject[r.contractId]
      if (pid && byProject[pid]) byProject[pid].contractReceiptAmount += toNum(r._sum.receiptAmount)
    }
    for (const r of otherReceipts) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].otherReceiptAmount += toNum(r._sum.receiptAmount)
    }
    for (const r of procurementPayments) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].procurementPaymentAmount += toNum(r._sum.paymentAmount)
    }
    for (const r of laborPayments) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].laborPaymentAmount += toNum(r._sum.paymentAmount)
    }
    for (const r of subcontractPayments) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].subcontractPaymentAmount += toNum(r._sum.paymentAmount)
    }
    for (const r of projectExpenses) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].projectExpenseAmount += toNum(r._sum.expenseAmount)
    }
    for (const r of managementExpenses) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].managementExpenseAmount += toNum(r._sum.expenseAmount)
    }
    for (const r of salesExpenses) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].salesExpenseAmount += toNum(r._sum.expenseAmount)
    }
    for (const r of otherPayments) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].otherPaymentAmount += toNum(r._sum.paymentAmount)
    }
    for (const r of pettyCashes) {
      const pid = r.projectId
      if (pid && byProject[pid]) byProject[pid].pettyCashAmount += toNum(r._sum.issuedAmount)
    }
    // 项目合同汇总
    for (const c of projectContracts) {
      if (byProject[c.projectId]) {
        byProject[c.projectId].contractAmount += toNum(c.contractAmount)
        byProject[c.projectId].receivedAmount += toNum(c.receivedAmount)
        byProject[c.projectId].unreceivedAmount += toNum(c.unreceivedAmount)
      }
    }
    for (const c of procurementContracts) {
      if (byProject[c.projectId]) {
        byProject[c.projectId].procurementContractAmount += toNum(c.contractAmount)
        byProject[c.projectId].procurementPaidAmount += toNum(c.paidAmount)
        byProject[c.projectId].procurementUnpaidAmount += toNum(c.unpaidAmount)
      }
    }
    for (const c of laborContracts) {
      if (byProject[c.projectId]) {
        byProject[c.projectId].laborContractAmount += toNum(c.contractAmount)
        byProject[c.projectId].laborPaidAmount += toNum(c.paidAmount)
        byProject[c.projectId].laborUnpaidAmount += toNum(c.unpaidAmount)
      }
    }
    for (const c of subcontractContracts) {
      if (byProject[c.projectId]) {
        byProject[c.projectId].subcontractContractAmount += toNum(c.contractAmount)
        byProject[c.projectId].subcontractPaidAmount += toNum(c.paidAmount)
        byProject[c.projectId].subcontractUnpaidAmount += toNum(c.unpaidAmount)
      }
    }

    // 计算合计
    const result = Object.values(byProject).map((p: any) => {
      p.totalReceiptAmount = p.contractReceiptAmount + p.otherReceiptAmount
      p.totalPaymentAmount = p.procurementPaymentAmount + p.laborPaymentAmount +
        p.subcontractPaymentAmount + p.projectExpenseAmount + p.managementExpenseAmount +
        p.salesExpenseAmount + p.otherPaymentAmount + p.pettyCashAmount
      p.profit = p.totalReceiptAmount - p.totalPaymentAmount
      return p
    })

    // 全局汇总
    const totals = result.reduce((acc: any, p: any) => {
      acc.totalReceiptAmount += p.totalReceiptAmount
      acc.totalPaymentAmount += p.totalPaymentAmount
      acc.profit += p.profit
      acc.contractAmount += p.contractAmount
      acc.receivedAmount += p.receivedAmount
      acc.unreceivedAmount += p.unreceivedAmount
      acc.procurementPaidAmount += p.procurementPaidAmount
      acc.procurementUnpaidAmount += p.procurementUnpaidAmount
      acc.laborPaidAmount += p.laborPaidAmount
      acc.subcontractPaidAmount += p.subcontractPaidAmount
      return acc
    }, {
      totalReceiptAmount: 0, totalPaymentAmount: 0, profit: 0,
      contractAmount: 0, receivedAmount: 0, unreceivedAmount: 0,
      procurementPaidAmount: 0, procurementUnpaidAmount: 0,
      laborPaidAmount: 0, subcontractPaidAmount: 0,
    })

    return success({ projects: result, totals })
  },
}, { resource: 'financial-summary' })
