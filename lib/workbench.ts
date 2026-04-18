/**
 * 工作台数据聚合
 * 为首页工作台提供待办、统计、快捷入口、业务提醒等聚合数据
 */

import { db } from './db'
import { hasDbColumn } from './db-column-compat'
import { filterResourceItemsByCurrentRegion, requireCurrentRegionId } from './region'

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
  'project-contract-changes': '项目合同变更',
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
  const regionId = await requireCurrentRegionId()
  const supportsProjectContractChangeRegionId = await hasDbColumn('ProjectContractChange', 'regionId')
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
    pendingContractChangeCount,
    pendingProcurementPaymentCount,
    pendingLaborPaymentCount,
    pendingSubcontractPaymentCount,
    unreceivedReceiptCount,
  ] = await Promise.all([
    // 按角色待审批
    db.processTask.findMany({
      where: { status: 'PENDING', approverType: 'ROLE', approverRole: systemRole },
      include: { ProcessInstance: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // 按用户待审批
    db.processTask.findMany({
      where: { status: 'PENDING', approverType: 'USER', approverUserId: systemUserId },
      include: { ProcessInstance: true },
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
    db.project.count({ where: { status: 'IN_PROGRESS', regionId } }),
    // 本月新增项目
    db.project.count({ where: { createdAt: { gte: monthStart }, regionId } }),
    // 本月收款
    db.contractReceipt.aggregate({
      where: { receiptDate: { gte: monthStart }, regionId },
      _sum: { receiptAmount: true },
    }),
    // 本月采购付款
    db.procurementPayment.aggregate({
      where: { paymentDate: { gte: monthStart }, regionId },
      _sum: { paymentAmount: true },
    }),
    // 本月劳务付款
    db.laborPayment.aggregate({
      where: { paymentDate: { gte: monthStart }, regionId },
      _sum: { paymentAmount: true },
    }),
    // 本月分包付款
    db.subcontractPayment.aggregate({
      where: { paymentDate: { gte: monthStart }, regionId },
      _sum: { paymentAmount: true },
    }),
    // 待审批采购合同数
    db.procurementContract.count({ where: { approvalStatus: 'PENDING', regionId } }),
    // 待审批项目合同变更数
    db.projectContractChange.count({
      where: supportsProjectContractChangeRegionId
        ? { approvalStatus: 'PENDING', regionId }
        : { approvalStatus: 'PENDING' },
    }),
    // 待审批付款数（采购）
    db.procurementPayment.count({ where: { approvalStatus: 'PENDING', regionId } }),
    // 待审批付款数（劳务）
    db.laborPayment.count({ where: { approvalStatus: 'PENDING', regionId } }),
    // 待审批付款数（分包）
    db.subcontractPayment.count({ where: { approvalStatus: 'PENDING', regionId } }),
    // 未收款合同数
    db.contractReceipt.count({ where: { status: 'UNRECEIVED', regionId } }),
  ])

  // 合并去重待审批任务
  const allPendingTasks = [...pendingTasksByRole, ...pendingTasksByUser]
  const regionScopedPendingTasks = await filterResourceItemsByCurrentRegion(allPendingTasks.map((task) => ({
    ...task,
    resourceType: task.ProcessInstance.resourceType,
    resourceId: task.ProcessInstance.resourceId,
  })))

  const uniqueTasks = Array.from(
    new Map(regionScopedPendingTasks.map((t) => [t.id, t])).values()
  ).slice(0, 10)

  const regionScopedPendingInstances = await filterResourceItemsByCurrentRegion(
    myPendingInstances.map((inst) => ({
      ...inst,
      resourceType: inst.resourceType,
      resourceId: inst.resourceId,
    }))
  )

  const regionScopedRejectedInstances = await filterResourceItemsByCurrentRegion(
    myRejectedInstances.map((inst) => ({
      ...inst,
      resourceType: inst.resourceType,
      resourceId: inst.resourceId,
    }))
  )

  const pendingTasks: PendingTask[] = uniqueTasks.map((task) => ({
    id: task.ProcessInstance.id,
    taskId: task.id,
    resourceType: task.ProcessInstance.resourceType,
    resourceLabel: RESOURCE_LABELS[task.ProcessInstance.resourceType] || task.ProcessInstance.resourceType,
    resourceId: task.ProcessInstance.resourceId,
    submitterName: task.ProcessInstance.submitterName,
    createdAt: task.createdAt.toISOString(),
  }))

  const myRecentSubmissions: RecentSubmission[] = regionScopedPendingInstances.map((inst) => ({
    id: inst.id,
    resourceType: inst.resourceType,
    resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
    resourceId: inst.resourceId,
    status: inst.status,
    createdAt: inst.startedAt.toISOString(),
  }))

  const rejectedSubmissions: RecentSubmission[] = regionScopedRejectedInstances.map((inst) => ({
    id: inst.id,
    resourceType: inst.resourceType,
    resourceLabel: RESOURCE_LABELS[inst.resourceType] || inst.resourceType,
    resourceId: inst.resourceId,
    status: inst.status,
    createdAt: inst.startedAt.toISOString(),
  }))

  const pendingPaymentCount =
    pendingProcurementPaymentCount +
    pendingLaborPaymentCount +
    pendingSubcontractPaymentCount

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
  if (pendingContractChangeCount > 0) {
    alerts.push({
      id: 'pending-contract-change',
      level: 'warning',
      title: `${pendingContractChangeCount} 份项目合同变更待审批`,
      desc: '合同变更审批通过后，系统才会同步更新项目合同金额',
      href: '/project-contract-changes',
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
  if (regionScopedRejectedInstances.length > 0) {
    alerts.push({
      id: 'rejected',
      level: 'error',
      title: `${regionScopedRejectedInstances.length} 份单据被驳回`,
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
    myPendingCount: regionScopedPendingInstances.length,
    rejectedCount: regionScopedRejectedInstances.length,
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
