/**
 * Settlement 类型定义
 * 
 * 设计原则：
 * - 最小公共字段 + 各对象扩展字段
 * - 不强行统一所有对象的字段
 * - 支持灵活的对象类型扩展
 */

import type { Decimal } from '@prisma/client/runtime/library'

/**
 * 结算对象类型
 */
export type SettlementObjectType = 
  | 'ProcurementPayment'
  | 'ContractReceipt'
  | 'LaborPayment'
  | 'SubcontractPayment'

/**
 * 结算对象基础接口
 * 所有结算对象都必须有这些字段
 */
export interface SettlementObjectBase {
  id: string
  type: SettlementObjectType
  amount: Decimal | number
  contractId: string
  status: string
}

/**
 * 采购付款对象
 */
export interface ProcurementPaymentObject extends SettlementObjectBase {
  type: 'ProcurementPayment'
  projectId: string
  paymentDate: Date
  approvalStatus?: string
}

/**
 * 合同收款对象
 */
export interface ContractReceiptObject extends SettlementObjectBase {
  type: 'ContractReceipt'
  receiptDate: Date
  approvalStatus?: string
}

/**
 * 劳务付款对象
 */
export interface LaborPaymentObject extends SettlementObjectBase {
  type: 'LaborPayment'
  projectId: string
  workerId: string
  paymentDate: Date
  approvalStatus?: string
}

/**
 * 分包付款对象
 */
export interface SubcontractPaymentObject extends SettlementObjectBase {
  type: 'SubcontractPayment'
  projectId: string
  vendorId: string
  paymentDate: Date
  approvalStatus?: string
}

/**
 * 联合类型：任意结算对象
 */
export type SettlementObject = 
  | ProcurementPaymentObject
  | ContractReceiptObject
  | LaborPaymentObject
  | SubcontractPaymentObject

/**
 * 结算上下文
 * 在事务中传递，包含当前操作的元数据
 */
export interface SettlementContext {
  objectType: SettlementObjectType
  objectId: string
  userId?: string
  idempotencyKey?: string
  metadata?: Record<string, any>
}

/**
 * 幂等性检查结果
 */
export interface IdempotencyResult {
  isDuplicate: boolean
  existingId?: string
  existingResult?: any
}

/**
 * 金额刷新结果
 */
export interface AmountRefreshResult {
  contractId: string
  payableAmount?: Decimal
  paidAmount?: Decimal
  unpaidAmount?: Decimal
  receivableAmount?: Decimal
  receivedAmount?: Decimal
  unreceivedAmount?: Decimal
}

/**
 * 结算错误
 */
export interface SettlementError {
  code: string
  message: string
  statusCode: number
  details?: Record<string, any>
}

/**
 * 事务选项
 */
export interface TransactionOptions {
  timeout?: number
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
}

/**
 * 审计日志操作类型
 */
export type SettlementActionType = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'REFRESH_AMOUNTS'
  | 'APPROVE'
  | 'REJECT'

/**
 * 审计日志数据
 */
export interface SettlementAuditLog {
  action: SettlementActionType
  objectType: SettlementObjectType
  objectId: string
  userId?: string
  details?: Record<string, any>
  timestamp: Date
}







