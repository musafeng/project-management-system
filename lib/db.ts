/**
 * 数据库访问层封装
 * 统一 Prisma Client 访问入口
 */

import { prisma } from '@/lib/prisma'

/**
 * 数据库访问对象
 * 所有 API 通过 db.xxx 访问数据库
 */
export const db = {
  // 主数据表
  customer: prisma.customer,
  supplier: prisma.supplier,
  laborWorker: prisma.laborWorker,
  subcontractVendor: prisma.subcontractVendor,

  // 项目相关表
  project: prisma.project,
  projectStatusChange: prisma.projectStatusChange,
  constructionApproval: prisma.constructionApproval,

  // 合同相关表
  projectContract: prisma.projectContract,
  projectContractChange: prisma.projectContractChange,
  procurementContract: prisma.procurementContract,
  laborContract: prisma.laborContract,
  subcontractContract: prisma.subcontractContract,

  // 收款相关表
  contractReceipt: prisma.contractReceipt,
  otherReceipt: prisma.otherReceipt,

  // 付款相关表
  procurementPayment: prisma.procurementPayment,
  laborPayment: prisma.laborPayment,
  subcontractPayment: prisma.subcontractPayment,
  otherPayment: prisma.otherPayment,

  // 费用相关表
  projectExpense: prisma.projectExpense,
  managementExpense: prisma.managementExpense,
  salesExpense: prisma.salesExpense,

  // 其他表
  pettyCash: prisma.pettyCash,
}

export type DB = typeof db

