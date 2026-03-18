/**
 * 工作台数据聚合
 * 为首页工作台提供待办、统计、快捷入口等聚合数据
 */

import { db } from './db'

export interface WorkbenchData {
  /** 待审批数量（我需要处理的） */
  pendingApprovalCount: number
  /** 我发起的审批中数量 */
  myPendingCount: number
  /** 本月新增项目数 */
  monthlyNewProjects: number
  /** 进行中项目数 */
  activeProjectCount: number
  /** 本月收款金额 */
  monthlyReceipt: number
  /** 本月付款金额 */
  monthlyPayment: number
  /** 待办事项列表（最近 10 条） */
  pendingTasks: PendingTask[]
  /** 我发起的最近单据 */
  myRecentSubmissions: RecentSubmission[]
}

export interface PendingTask {
  id: string
  taskId: string
  resourceType: string
  resourceLabel: string
  resourceId: string
  resourceCode: string
  resourceName: string
  submitterName: string
  createdAt: string
}

export interface RecentSubmission {
  id: string
  resourceType: string
  resourceLabel: string
  resourceId: string
  resourceCode: string
  resourceName: string
  status: string
  createdAt: string
}

const RESOURCE_LABELS: Record<string, string> = {
  'construction-approvals': '施工立项',
  'procurement-contracts': '采购合同',
  'procurement-payments': '采购付款',
  'labor-contracts': '劳务合同',
  'labor-payments': '劳务付款',
  'subcontract-contracts': '分包合同',
  'subcontract-payments': '分包付款',
}

/**
 * 获取指定用户的工作台数据
 * @param dingUserId 当前用户 dingUserId
 * @param systemUserId 当前用户 SystemUser.id
 * @param systemRole 当前用户角色
 */
export async function getWorkbenchData(
  dingUserId: string,
  systemUserId: string,
  systemRole: string
): Promise<WorkbenchData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    // 我需要审批的任务（按角色 or 按用户）
    pendingTasksByRole,
    pendingTasksByUser,
    // 我发起的审批中实例
    myPendingInstances,
    // 项目统计
    activeProjectCount,
    monthlyNewProjects,
    // 本月收付款
    monthlyReceiptAgg,
    monthlyPaymentProcAgg,
    monthlyPaymentLaborAgg,
    monthlyPaymentSubAgg,
  ] = await Promise.all([
    // 按角色匹配的待审批
    db.processTask.findMany({
      where: {
        status: 'PENDING',
        approverType: 'ROLE',
        approverRole: systemRole,
      },
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // 按用户匹配的待审批
    db.processTask.findMany({
      where: {
        status: 'PENDING',
        approverType: 'USER',
        approverUserId: systemUserId,
      },
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // 我发起的审批中实例
    db.processInstance.findMany({
      where: {
        submitterUserId: dingUserId,
        status: 'PENDING',
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    // 进行中项目数
    db.project.count({
      where: { status: 'IN_PROGRESS' },
    }),
    // 本月新增项目
    db.project.count({
      where: { createdAt: { gte: monthStart } },
    }),
    // 本月收款
    db.contractReceipt.aggregate({
      where: { receiptDate: { gte: monthStart } },
      _sum: { receiptAmount: true },
    }),
    // 本月采购付款
    db.procurementPayment.aggregate({
      where: { paymentDate: { gte: monthStart } },
      _sum: { paymentAmount: true },
    }),
    // 本月劳务付款
    db.laborPayment.aggregate({
      where: { paymentDate: { gte: monthStart } },
      _sum: { paymentAmount: true },
    }),
    // 本月分包付款
    db.subcontractPayment.aggregate({
      where: { paymentDate: { gte: monthStart } },
      _sum: { paymentAmount: true },
    }),
  ])

  // 合并待审批任务（去重）
  const allPendingTasks = [...pendingTasksByRole, ...pendingTasksByUser]
  const uniqueTasks = Array.from(
    new Map(allPendingTasks.map((t) => [t.id, t])).values()
  ).slice(0, 10)

  const pendingTasks: PendingTask[] = uniqueTasks.map((task) => ({
    id: task.instance.id,
    taskId: task.id,
    resourceType: task.instance.resourceType,
    resourceLabel: RESOURCE_LABELS[task.instance.resourceType] || task.instance.resourceType,
    resourceId: task.instance.resourceId,
    resourceCode: task.instance.resourceId.slice(0, 8),
    resourceName: task.instance.resourceType,
    submitterName: task.instance.submitterName,
    createdAt: task.createdAt.toISOString(),
  }))

  // 我发起的最近单据
  const myRecentSubmissions: RecentSubmission[] = myPendingInstances.map((inst) => ({
    id: inst.id,
    resourceType: inst.resourceType,
    resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
    resourceId: inst.resourceId,
    resourceCode: inst.resourceId.slice(0, 8),
    resourceName: inst.resourceType,
    status: inst.status,
    createdAt: inst.startedAt.toISOString(),
  }))

  const monthlyPayment =
    Number(monthlyPaymentProcAgg._sum.paymentAmount || 0) +
    Number(monthlyPaymentLaborAgg._sum.paymentAmount || 0) +
    Number(monthlyPaymentSubAgg._sum.paymentAmount || 0)

  return {
    pendingApprovalCount: uniqueTasks.length,
    myPendingCount: myPendingInstances.length,
    monthlyNewProjects,
    activeProjectCount,
    monthlyReceipt: Number(monthlyReceiptAgg._sum.receiptAmount || 0),
    monthlyPayment,
    pendingTasks,
    myRecentSubmissions,
  }
}

