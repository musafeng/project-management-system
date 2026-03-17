import { db } from './db'

export async function getProjectStats(projectId: string) {
  try {
    const incomeResult = await db.contractReceipt.aggregate({
      where: { contract: { projectId } },
      _sum: { receiptAmount: true }
    })
    const income = Number(incomeResult._sum.receiptAmount || 0)

    const [procurement, labor, subcontract, projectExpense, management, sales] = await Promise.all([
      db.procurementPayment.aggregate({
        where: { projectId },
        _sum: { paymentAmount: true }
      }),
      db.laborPayment.aggregate({
        where: { projectId },
        _sum: { paymentAmount: true }
      }),
      db.subcontractPayment.aggregate({
        where: { projectId },
        _sum: { paymentAmount: true }
      }),
      db.projectExpense.aggregate({
        where: { projectId },
        _sum: { expenseAmount: true }
      }),
      db.managementExpense.aggregate({
        where: { projectId },
        _sum: { expenseAmount: true }
      }),
      db.salesExpense.aggregate({
        where: { projectId },
        _sum: { expenseAmount: true }
      })
    ])

    const expense = [
      Number(procurement._sum.paymentAmount || 0),
      Number(labor._sum.paymentAmount || 0),
      Number(subcontract._sum.paymentAmount || 0),
      Number(projectExpense._sum.expenseAmount || 0),
      Number(management._sum.expenseAmount || 0),
      Number(sales._sum.expenseAmount || 0)
    ].reduce((sum, val) => sum + val, 0)

    return {
      income: parseFloat(income.toFixed(2)),
      expense: parseFloat(expense.toFixed(2)),
      profit: parseFloat((income - expense).toFixed(2)),
      detail: {
        procurement: parseFloat(Number(procurement._sum.paymentAmount || 0).toFixed(2)),
        labor: parseFloat(Number(labor._sum.paymentAmount || 0).toFixed(2)),
        subcontract: parseFloat(Number(subcontract._sum.paymentAmount || 0).toFixed(2)),
        projectExpense: parseFloat(Number(projectExpense._sum.expenseAmount || 0).toFixed(2)),
        management: parseFloat(Number(management._sum.expenseAmount || 0).toFixed(2)),
        sales: parseFloat(Number(sales._sum.expenseAmount || 0).toFixed(2))
      }
    }
  } catch (error) {
    console.error('统计计算错误:', error)
    throw new Error('项目统计计算失败')
  }
}
