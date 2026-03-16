import { prisma } from './prisma'

export async function getProjectStats(projectId: number) {
  try {
    const incomeResult = await prisma.contractReceipt.aggregate({
      where: { contract: { projectId } },
      _sum: { amount: true }
    })
    const income = incomeResult._sum.amount || 0

    const [procurement, labor, subcontract, projectExpense, management, sales] = await Promise.all([
      prisma.procurementPayment.aggregate({
        where: { contract: { construction: { contract: { projectId } } } },
        _sum: { amount: true }
      }),
      prisma.laborPayment.aggregate({
        where: { contract: { construction: { contract: { projectId } } } },
        _sum: { amount: true }
      }),
      prisma.subcontractPayment.aggregate({
        where: { contract: { construction: { contract: { projectId } } } },
        _sum: { amount: true }
      }),
      prisma.projectExpense.aggregate({
        where: { construction: { contract: { projectId } } },
        _sum: { amount: true }
      }),
      prisma.managementExpense.aggregate({
        where: { projectId },
        _sum: { amount: true }
      }),
      prisma.salesExpense.aggregate({
        where: { projectId },
        _sum: { amount: true }
      })
    ])

    const expense = [
      procurement._sum.amount,
      labor._sum.amount,
      subcontract._sum.amount,
      projectExpense._sum.amount,
      management._sum.amount,
      sales._sum.amount
    ].reduce((sum, val) => sum + (val || 0), 0)

    return {
      income: parseFloat(income.toFixed(2)),
      expense: parseFloat(expense.toFixed(2)),
      profit: parseFloat((income - expense).toFixed(2)),
      detail: {
        procurement: parseFloat((procurement._sum.amount || 0).toFixed(2)),
        labor: parseFloat((labor._sum.amount || 0).toFixed(2)),
        subcontract: parseFloat((subcontract._sum.amount || 0).toFixed(2)),
        projectExpense: parseFloat((projectExpense._sum.amount || 0).toFixed(2)),
        management: parseFloat((management._sum.amount || 0).toFixed(2)),
        sales: parseFloat((sales._sum.amount || 0).toFixed(2))
      }
    }
  } catch (error) {
    console.error('统计计算错误:', error)
    throw new Error('项目统计计算失败')
  }
}

