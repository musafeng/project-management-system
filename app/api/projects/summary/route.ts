/**
 * 首页项目汇总 API
 * 
 * GET /api/projects/summary
 * 
 * 功能：返回项目总览列表，用于首页展示
 * 支持参数：keyword（可选）、status（可选）
 */

import { apiHandler, success, ApiError } from '@/lib/api'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

type ProjectWithCustomer = Prisma.ProjectGetPayload<{ include: { customer: { select: { name: true } } } }>

/**
 * 项目汇总数据类型
 */
interface ProjectSummary {
  id: string
  code: string
  name: string
  customerName: string
  status: string
  startDate: string | null
  endDate: string | null

  // 收入统计
  contractReceivableAmount: number
  contractReceivedAmount: number
  contractUnreceivedAmount: number
  otherReceiptAmount: number
  totalIncomeAmount: number

  // 支出统计
  procurementPaidAmount: number
  laborPaidAmount: number
  subcontractPaidAmount: number
  projectExpenseAmount: number
  otherPaymentAmount: number
  managementExpenseAmount: number
  salesExpenseAmount: number
  totalExpenseAmount: number

  // 利润
  profitAmount: number

  createdAt: string
}

/**
 * Decimal 转 number，null 按 0 处理
 */
function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }
  return Number(value)
}

/**
 * 计算单个项目的收入统计
 */
async function calculateIncomeStats(projectId: string) {
  // 1. 项目合同收款统计
  const contracts = await db.projectContract.findMany({
    where: { projectId },
    select: {
      receivableAmount: true,
      receivedAmount: true,
      unreceivedAmount: true,
    },
  })

  const contractReceivableAmount = contracts.reduce(
    (sum, c) => sum + toNumber(c.receivableAmount),
    0
  )
  const contractReceivedAmount = contracts.reduce(
    (sum, c) => sum + toNumber(c.receivedAmount),
    0
  )
  const contractUnreceivedAmount = contracts.reduce(
    (sum, c) => sum + toNumber(c.unreceivedAmount),
    0
  )

  // 2. 其他收款统计
  const otherReceiptsResult = await db.otherReceipt.aggregate({
    where: { projectId },
    _sum: { receiptAmount: true },
  })
  const otherReceiptAmount = toNumber(otherReceiptsResult._sum.receiptAmount)

  // 3. 总收入 = 合同已收 + 其他收款
  const totalIncomeAmount = contractReceivedAmount + otherReceiptAmount

  return {
    contractReceivableAmount,
    contractReceivedAmount,
    contractUnreceivedAmount,
    otherReceiptAmount,
    totalIncomeAmount,
  }
}

/**
 * 计算单个项目的支出统计
 */
async function calculateExpenseStats(projectId: string) {
  // 并行查询所有支出类型
  const [
    procurementResult,
    laborResult,
    subcontractResult,
    projectExpenseResult,
    otherPaymentResult,
    managementExpenseResult,
    salesExpenseResult,
  ] = await Promise.all([
    // 1. 采购付款
    db.procurementPayment.aggregate({
      where: { projectId },
      _sum: { paymentAmount: true },
    }),
    // 2. 劳务付款
    db.laborPayment.aggregate({
      where: { projectId },
      _sum: { paymentAmount: true },
    }),
    // 3. 分包付款
    db.subcontractPayment.aggregate({
      where: { projectId },
      _sum: { paymentAmount: true },
    }),
    // 4. 项目费用
    db.projectExpense.aggregate({
      where: { projectId },
      _sum: { expenseAmount: true },
    }),
    // 5. 其他付款
    db.otherPayment.aggregate({
      where: { projectId },
      _sum: { paymentAmount: true },
    }),
    // 6. 管理费用
    db.managementExpense.aggregate({
      where: { projectId },
      _sum: { expenseAmount: true },
    }),
    // 7. 销售费用
    db.salesExpense.aggregate({
      where: { projectId },
      _sum: { expenseAmount: true },
    }),
  ])

  const procurementPaidAmount = toNumber(procurementResult._sum.paymentAmount)
  const laborPaidAmount = toNumber(laborResult._sum.paymentAmount)
  const subcontractPaidAmount = toNumber(subcontractResult._sum.paymentAmount)
  const projectExpenseAmount = toNumber(projectExpenseResult._sum.expenseAmount)
  const otherPaymentAmount = toNumber(otherPaymentResult._sum.paymentAmount)
  const managementExpenseAmount = toNumber(managementExpenseResult._sum.expenseAmount)
  const salesExpenseAmount = toNumber(salesExpenseResult._sum.expenseAmount)

  // 总支出
  const totalExpenseAmount =
    procurementPaidAmount +
    laborPaidAmount +
    subcontractPaidAmount +
    projectExpenseAmount +
    otherPaymentAmount +
    managementExpenseAmount +
    salesExpenseAmount

  return {
    procurementPaidAmount,
    laborPaidAmount,
    subcontractPaidAmount,
    projectExpenseAmount,
    otherPaymentAmount,
    managementExpenseAmount,
    salesExpenseAmount,
    totalExpenseAmount,
  }
}

/**
 * GET 处理器
 */
export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('keyword') || undefined
  const status = searchParams.get('status') || undefined

  // 构建查询条件
  const where: Prisma.ProjectWhereInput = {}

  if (keyword) {
    where.name = {
      contains: keyword,
      mode: 'insensitive',
    }
  }

  if (status) {
    where.status = status as any
  }

  // 查询项目列表（关联客户信息）
  const projects = await db.project.findMany({
    where,
    include: {
      customer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // 并行计算每个项目的统计数据
  const summaryList: ProjectSummary[] = await Promise.all(
      projects.map(async (project: ProjectWithCustomer) => {
      // 并行计算收入和支出
      const [incomeStats, expenseStats] = await Promise.all([
        calculateIncomeStats(project.id),
        calculateExpenseStats(project.id),
      ])

      // 计算利润
      const profitAmount = incomeStats.totalIncomeAmount - expenseStats.totalExpenseAmount

        return {
          id: project.id,
        code: project.code,
          name: project.name,
        customerName: project.customer.name,
          status: project.status,
        startDate: project.startDate ? project.startDate.toISOString().split('T')[0] : null,
        endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : null,

        // 收入
        contractReceivableAmount: incomeStats.contractReceivableAmount,
        contractReceivedAmount: incomeStats.contractReceivedAmount,
        contractUnreceivedAmount: incomeStats.contractUnreceivedAmount,
        otherReceiptAmount: incomeStats.otherReceiptAmount,
        totalIncomeAmount: incomeStats.totalIncomeAmount,

        // 支出
        procurementPaidAmount: expenseStats.procurementPaidAmount,
        laborPaidAmount: expenseStats.laborPaidAmount,
        subcontractPaidAmount: expenseStats.subcontractPaidAmount,
        projectExpenseAmount: expenseStats.projectExpenseAmount,
        otherPaymentAmount: expenseStats.otherPaymentAmount,
        managementExpenseAmount: expenseStats.managementExpenseAmount,
        salesExpenseAmount: expenseStats.salesExpenseAmount,
        totalExpenseAmount: expenseStats.totalExpenseAmount,

        // 利润
        profitAmount,

        createdAt: project.createdAt.toISOString(),
  }
    })
  )

  return success(summaryList)
})
