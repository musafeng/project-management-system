/**
 * 工作台数据聚合
 * 为首页工作台提供待办、统计、快捷入口、业务提醒等聚合数据
 */

import { db } from './db'

// ============================================================
// 类型定义
// ============================================================

export interface WorkbenchData {
  /** 待审批数量（我需要处理的） */
  pendingApprovalCount: number
  /** 我发起的审批中数量 */
  myPendingCount: number
  /** 被驳回数量 */
  rejectedCount: number
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
  /** 我发起的被驳回单据 */
  rejectedSubmissions: RecentSubmission[]
  /** 业务提醒 */
  alerts: BusinessAlert[]
}

export interface PendingTask {
  id: string
  taskId: string
  resourceType: string
  resourceLabel: string
  resourceId: string
  submitterName: string
  createdAt: string
}

export interface RecentSubmission {
  id: string
  resourceType: string
  resourceLabel: string
  resourceId: string
  status: string
  createdAt: string
}

export type AlertLevel = 'warning' | 'error' | 'info'

export interface BusinessAlert {
  id: string
  level: AlertLevel
  title: string
  desc: string
  href: string
}

// ============================================================
// 常量
// ============================================================

const RESOURCE_LABELS: Record<string, string> = {
  'construction-approvals': '施工立项',
  'procurement-contracts': '采购合同',
  'procurement-payments': '采购付款',
  'labor-contracts': '劳务合同',
  'labor-payments': '劳务付款',
  'subcontract-contracts': '分包合同',
  'subcontract-payments': '分包付款',
}

// ============================================================
// 主函数
// ============================================================

export async function getWorkbenchData(
  dingUserId: string,
  systemUserId: string,
  systemRole: string
): Promise<WorkbenchData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    pendingTasksByRole,
    pendingTasksByUser,
    myPendingInstances,
    myRejectedInstances,
    activeProjectCount,
    monthlyNewProjects,
    monthlyReceiptAgg,
    monthlyPaymentProcAgg,
    monthlyPaymentLaborAgg,
    monthlyPaymentSubAgg,
    // 业务提醒原始数据
    pendingContractCount,
    pendingPaymentCount,
    unreceivedReceiptCount,
  ] = await Promise.all([
    // 按角色待审批
    db.processTask.findMany({
      where: { status: 'PENDING', approverType: 'ROLE', approverRole: systemRole },
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // 按用户待审批
    db.processTask.findMany({
      where: { status: 'PENDING', approverType: 'USER', approverUserId: systemUserId },
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // 我发起的审批中
    db.processInstance.findMany({
      where: { submitterUserId: dingUserId, status: 'PENDING' },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    // 我发起的被驳回
    db.processInstance.findMany({
      where: { submitterUserId: dingUserId, status: 'REJECTED' },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    // 进行中项目数
    db.project.count({ where: { status: 'IN_PROGRESS' } }),
    // 本月新增项目
    db.project.count({ where: { createdAt: { gte: monthStart } } }),
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
    // 待审批采购合同数
    db.procurementContract.count({ where: { approvalStatus: 'PENDING' } }),
    // 待审批付款数（采购+劳务+分包）
    db.procurementPayment.count({ where: { approvalStatus: 'PENDING' } }),
    // 未收款合同数
    db.contractReceipt.count({ where: { status: 'UNRECEIVED' } }),
  ])

  // 合并去重待审批任务
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
    submitterName: task.instance.submitterName,
    createdAt: task.createdAt.toISOString(),
  }))

  const myRecentSubmissions: RecentSubmission[] = myPendingInstances.map((inst) => ({
    id: inst.id,
    resourceType: inst.resourceType,
    resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
    resourceId: inst.resourceId,
    status: inst.status,
    createdAt: inst.startedAt.toISOString(),
  }))

  const rejectedSubmissions: RecentSubmission[] = myRejectedInstances.map((inst) => ({
    id: inst.id,
    resourceType: inst.resourceType,
    resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
    resourceId: inst.resourceId,
    status: inst.status,
    createdAt: inst.startedAt.toISOString(),
  }))

  // 业务提醒
  const alerts: BusinessAlert[] = []
  if (pendingContractCount > 0) {
    alerts.push({
      id: 'pending-contract',
      level: 'warning',
      title: `${pendingContractCount} 份采购合同待审批`,
      desc: '合同未审批将影响后续付款操作',
      href: '/procurement-contracts',
    })
  }
  if (pendingPaymentCount > 0) {
    alerts.push({
      id: 'pending-payment',
      level: 'warning',
      title: `${pendingPaymentCount} 笔付款申请待审批`,
      desc: '请及时处理，避免影响施工进度',
      href: '/procurement-payments',
    })
  }
  if (unreceivedReceiptCount > 0) {
    alerts.push({
      id: 'unreceived',
      level: 'info',
      title: `${unreceivedReceiptCount} 条收款记录未到账`,
      desc: '请确认款项是否已到账并更新状态',
      href: '/contract-receipts',
    })
  }
  if (myRejectedInstances.length > 0) {
    alerts.push({
      id: 'rejected',
      level: 'error',
      title: `${myRejectedInstances.length} 份单据被驳回`,
      desc: '请查看驳回原因并修改后重新提交',
      href: '/',
    })
  }

  const monthlyPayment =
    Number(monthlyPaymentProcAgg._sum.paymentAmount || 0) +
    Number(monthlyPaymentLaborAgg._sum.paymentAmount || 0) +
    Number(monthlyPaymentSubAgg._sum.paymentAmount || 0)

  return {
    pendingApprovalCount: uniqueTasks.length,
    myPendingCount: myPendingInstances.length,
    rejectedCount: myRejectedInstances.length,
    monthlyNewProjects,
    activeProjectCount,
    monthlyReceipt: Number(monthlyReceiptAgg._sum.receiptAmount || 0),
    monthlyPayment,
    pendingTasks,
    myRecentSubmissions,
    rejectedSubmissions,
    alerts,
  }
}
