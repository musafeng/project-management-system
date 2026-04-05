/**
 * BaseSettlementService
 * 
 * 结算类 API 的通用后端事务处理骨架
 * 
 * 职责：
 * - 事务控制（Prisma $transaction）
 * - 幂等控制（可选，基于 idempotencyKey）
 * - 金额刷新入口（统一的 refreshAmounts 方法）
 * - 错误处理（统一的异常捕获和回滚）
 * - 审计日志预留接口
 * 
 * 不负责：
 * - 具体的业务逻辑
 * - 权限判断
 * - 审批流程
 */

import { db } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import type {
  SettlementObjectType,
  SettlementContext,
  IdempotencyResult,
  AmountRefreshResult,
  SettlementError,
  TransactionOptions,
  SettlementActionType,
} from './types'
import type { Decimal } from '@prisma/client/runtime/library'
import { Decimal as DecimalJS } from 'decimal.js'

/**
 * 幂等性记录存储（内存缓存，仅用于 development fallback）
 * 
 * ⚠️ 重要限制：
 * - 当前实现仅是占位符，不是真正的持久化幂等
 * - 服务器重启后所有记录丢失
 * - 只在单机开发环境下有效
 * - 生产环境必须使用 Redis 或数据库实现
 * 
 * 后续改进方向（Week2）：
 * - 使用 Redis 存储幂等性记录
 * - 或创建数据库表存储
 * - 支持分布式环境
 */
const idempotencyCache = new Map<string, { id: string; result: any; timestamp: number }>()
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000 // 24 小时

export class BaseSettlementService {
  /**
   * 执行事务
   * 
   * @param callback 事务回调函数
   * @param options 事务选项
   * @returns 回调函数的返回值
   */
  static async executeInTransaction<T>(
    callback: (context: SettlementContext) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 创建事务上下文
          const context: SettlementContext = {
            objectType: 'ProcurementPayment', // 默认值，会被覆盖
            objectId: '',
          }

          // 执行回调
          return await callback(context)
        }
      )

      return result
    } catch (error) {
      const settlementError = this.handleSettlementError(error)
      throw settlementError
    }
  }

  /**
   * 检查幂等性
   * 
   * ⚠️ 当前实现仅是 development fallback only：
   * - 使用内存缓存，服务器重启后丢失
   * - 不支持分布式环境
   * - 仅用于兼容层占位
   * 
   * 如果前端没有传 idempotencyKey，则跳过检查（允许重复）
   * 如果传了，则检查是否已存在相同的请求（基于内存缓存）
   * 
   * @param idempotencyKey 幂等性键（可选）
   * @param resourceType 资源类型
   * @returns 幂等性检查结果
   */
  static async checkIdempotency(
    idempotencyKey: string | undefined,
    resourceType: string
  ): Promise<IdempotencyResult> {
    // 如果没有传 idempotencyKey，允许重复
    if (!idempotencyKey) {
      return { isDuplicate: false }
    }

    const cacheKey = `${resourceType}:${idempotencyKey}`
    const cached = idempotencyCache.get(cacheKey)

    // 检查缓存是否过期
    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < IDEMPOTENCY_TTL) {
        return {
          isDuplicate: true,
          existingId: cached.id,
          existingResult: cached.result,
        }
      } else {
        // 过期，删除缓存
        idempotencyCache.delete(cacheKey)
      }
    }

    return { isDuplicate: false }
  }

  /**
   * 记录幂等性结果
   * 
   * @param idempotencyKey 幂等性键
   * @param resourceType 资源类型
   * @param id 创建的资源 ID
   * @param result 操作结果
   */
  static recordIdempotency(
    idempotencyKey: string | undefined,
    resourceType: string,
    id: string,
    result: any
  ): void {
    if (!idempotencyKey) return

    const cacheKey = `${resourceType}:${idempotencyKey}`
    idempotencyCache.set(cacheKey, {
      id,
      result,
      timestamp: Date.now(),
    })
  }

  /**
   * 刷新金额汇总
   * 
   * 这是一个统一入口，具体的刷新逻辑由各对象类型的方法实现
   * 
   * @param objectType 结算对象类型
   * @param contractId 合同 ID
   * @param context 结算上下文
   * @returns 刷新结果
   */
  static async refreshAmounts(
    objectType: SettlementObjectType,
    contractId: string,
    context?: SettlementContext
  ): Promise<AmountRefreshResult> {
    switch (objectType) {
      case 'ProcurementPayment':
        return this.refreshProcurementAmounts(contractId)

      case 'LaborPayment':
        return this.refreshLaborAmounts(contractId)

      case 'SubcontractPayment':
        return this.refreshSubcontractAmounts(contractId)

      case 'ContractReceipt':
        return this.refreshReceiptAmounts(contractId)

      default:
        throw new Error(`Unsupported settlement object type: ${objectType}`)
    }
  }

  /**
   * 刷新采购合同的付款金额
   * 
   * 逻辑：
   * - 查询所有已批准的采购付款记录
   * - 求和得到 paidAmount（使用 Decimal 保证精度）
   * - 计算 unpaidAmount = payableAmount - paidAmount
   * - 更新合同
   * 
   * 注意：全程使用 Decimal，不转 number，避免精度丢失
   */
  private static async refreshProcurementAmounts(
    contractId: string
  ): Promise<AmountRefreshResult> {
    // 获取合同信息
    const contract = await db.procurementContract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        contractAmount: true,
        changedAmount: true,
      },
    })

    if (!contract) {
      throw new Error(`Procurement contract not found: ${contractId}`)
    }

    // 计算应付金额（使用 Decimal）
    const contractAmountDecimal = new DecimalJS(contract.contractAmount.toString())
    const changedAmountDecimal = new DecimalJS(contract.changedAmount.toString())
    const payableAmount = contractAmountDecimal.plus(changedAmountDecimal)

    // 查询所有已批准的付款记录
    const payments = await db.procurementPayment.findMany({
      where: {
        contractId,
        approvalStatus: 'APPROVED',
      },
      select: { paymentAmount: true },
    })

    // 求和已付金额（使用 Decimal）
    const paidAmount = payments.reduce((sum, p) => {
      const paymentDecimal = new DecimalJS(p.paymentAmount.toString())
      return sum.plus(paymentDecimal)
    }, new DecimalJS(0))

    // 计算未付金额（使用 Decimal）
    const unpaidAmount = payableAmount.minus(paidAmount)

    // 更新合同（转换为 Prisma Decimal）
    await db.procurementContract.update({
      where: { id: contractId },
      data: {
        payableAmount: payableAmount.toDecimalPlaces(2),
        paidAmount: paidAmount.toDecimalPlaces(2),
        unpaidAmount: unpaidAmount.toDecimalPlaces(2),
      },
    })

    return {
      contractId,
      payableAmount: payableAmount.toDecimalPlaces(2) as any,
      paidAmount: paidAmount.toDecimalPlaces(2) as any,
      unpaidAmount: unpaidAmount.toDecimalPlaces(2) as any,
    }
  }

  /**
   * 刷新劳务合同的付款金额
   * 
   * 全程使用 Decimal，不转 number，避免精度丢失
   */
  private static async refreshLaborAmounts(
    contractId: string
  ): Promise<AmountRefreshResult> {
    const contract = await db.laborContract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        contractAmount: true,
        changedAmount: true,
      },
    })

    if (!contract) {
      throw new Error(`Labor contract not found: ${contractId}`)
    }

    const contractAmountDecimal = new DecimalJS(contract.contractAmount.toString())
    const changedAmountDecimal = new DecimalJS(contract.changedAmount.toString())
    const payableAmount = contractAmountDecimal.plus(changedAmountDecimal)

    const payments = await db.laborPayment.findMany({
      where: {
        contractId,
        approvalStatus: 'APPROVED',
      },
      select: { paymentAmount: true },
    })

    const paidAmount = payments.reduce((sum, p) => {
      const paymentDecimal = new DecimalJS(p.paymentAmount.toString())
      return sum.plus(paymentDecimal)
    }, new DecimalJS(0))

    const unpaidAmount = payableAmount.minus(paidAmount)

    await db.laborContract.update({
      where: { id: contractId },
      data: {
        payableAmount: payableAmount.toDecimalPlaces(2),
        paidAmount: paidAmount.toDecimalPlaces(2),
        unpaidAmount: unpaidAmount.toDecimalPlaces(2),
      },
    })

    return {
      contractId,
      payableAmount: payableAmount.toDecimalPlaces(2) as any,
      paidAmount: paidAmount.toDecimalPlaces(2) as any,
      unpaidAmount: unpaidAmount.toDecimalPlaces(2) as any,
    }
  }

  /**
   * 刷新分包合同的付款金额
   * 
   * 全程使用 Decimal，不转 number，避免精度丢失
   */
  private static async refreshSubcontractAmounts(
    contractId: string
  ): Promise<AmountRefreshResult> {
    const contract = await db.subcontractContract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        contractAmount: true,
        changedAmount: true,
      },
    })

    if (!contract) {
      throw new Error(`Subcontract not found: ${contractId}`)
    }

    const contractAmountDecimal = new DecimalJS(contract.contractAmount.toString())
    const changedAmountDecimal = new DecimalJS(contract.changedAmount.toString())
    const payableAmount = contractAmountDecimal.plus(changedAmountDecimal)

    const payments = await db.subcontractPayment.findMany({
      where: {
        contractId,
        approvalStatus: 'APPROVED',
      },
      select: { paymentAmount: true },
    })

    const paidAmount = payments.reduce((sum, p) => {
      const paymentDecimal = new DecimalJS(p.paymentAmount.toString())
      return sum.plus(paymentDecimal)
    }, new DecimalJS(0))

    const unpaidAmount = payableAmount.minus(paidAmount)

    await db.subcontractContract.update({
      where: { id: contractId },
      data: {
        payableAmount: payableAmount.toDecimalPlaces(2),
        paidAmount: paidAmount.toDecimalPlaces(2),
        unpaidAmount: unpaidAmount.toDecimalPlaces(2),
      },
    })

    return {
      contractId,
      payableAmount: payableAmount.toDecimalPlaces(2) as any,
      paidAmount: paidAmount.toDecimalPlaces(2) as any,
      unpaidAmount: unpaidAmount.toDecimalPlaces(2) as any,
    }
  }

  /**
   * 刷新项目合同的收款金额
   * 
   * 全程使用 Decimal，不转 number，避免精度丢失
   */
  private static async refreshReceiptAmounts(
    contractId: string
  ): Promise<AmountRefreshResult> {
    const contract = await db.projectContract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        receivableAmount: true,
      },
    })

    if (!contract) {
      throw new Error(`Project contract not found: ${contractId}`)
    }

    // 查询所有已批准的收款记录
    const receipts = await db.contractReceipt.findMany({
      where: {
        contractId,
        approvalStatus: 'APPROVED',
      },
      select: { receiptAmount: true },
    })

    // 求和已收金额（使用 Decimal）
    const receivedAmount = receipts.reduce((sum, r) => {
      const receiptDecimal = new DecimalJS(r.receiptAmount.toString())
      return sum.plus(receiptDecimal)
    }, new DecimalJS(0))

    // 计算未收金额（使用 Decimal）
    const receivableAmountDecimal = new DecimalJS(contract.receivableAmount.toString())
    const unreceivedAmount = receivableAmountDecimal.minus(receivedAmount)

    // 更新合同
    await db.projectContract.update({
      where: { id: contractId },
      data: {
        receivedAmount: receivedAmount.toDecimalPlaces(2),
        unreceivedAmount: unreceivedAmount.toDecimalPlaces(2),
      },
    })

    return {
      contractId,
      receivableAmount: contract.receivableAmount,
      receivedAmount: receivedAmount.toDecimalPlaces(2) as any,
      unreceivedAmount: unreceivedAmount.toDecimalPlaces(2) as any,
    }
  }

  /**
   * 审计日志预留接口
   * 
   * 第一版仅做占位实现，可以 console 或存储到日志系统
   * 后续阶段可以扩展为完整的审计系统
   * 
   * @param action 操作类型
   * @param objectType 结算对象类型
   * @param objectId 对象 ID
   * @param details 操作详情
   */
  static async logAudit(
    action: SettlementActionType,
    objectType: SettlementObjectType,
    objectId: string,
    details?: Record<string, any>
  ): Promise<void> {
    // 第一版：仅 console 输出
    console.log('[Settlement Audit]', {
      action,
      objectType,
      objectId,
      details,
      timestamp: new Date().toISOString(),
    })

    // TODO: 后续可以接入完整的审计日志系统
    // await db.settlementAuditLog.create({
    //   data: {
    //     action,
    //     objectType,
    //     objectId,
    //     details: JSON.stringify(details),
    //     timestamp: new Date(),
    //   },
    // })
  }

  /**
   * 统一错误处理
   * 
   * @param error 原始错误
   * @returns 结算错误对象
   */
  static handleSettlementError(error: any): SettlementError {
    // 已知的业务错误
    if (error instanceof Error) {
      const message = error.message

      // 金额超付
      if (message.includes('超付')) {
        return {
          code: 'OVERPAYMENT',
          message: message,
          statusCode: 400,
        }
      }

      // 数据不存在
      if (message.includes('not found')) {
        return {
          code: 'NOT_FOUND',
          message: message,
          statusCode: 404,
        }
      }

      // 重复提交
      if (message.includes('重复')) {
        return {
          code: 'DUPLICATE',
          message: message,
          statusCode: 409,
        }
      }

      // 通用业务错误
      return {
        code: 'BUSINESS_ERROR',
        message: message,
        statusCode: 400,
      }
    }

    // 未知错误
    return {
      code: 'INTERNAL_ERROR',
      message: '内部错误，请稍后重试',
      statusCode: 500,
      details: { originalError: String(error) },
    }
  }

  /**
   * 验证金额
   * 
   * 使用 Decimal 进行精确比较，避免浮点数精度问题
   * 
   * @param amount 金额
   * @param maxAmount 最大允许金额
   * @throws 如果金额无效
   */
  static validateAmount(amount: number | Decimal, maxAmount?: number | Decimal): void {
    const amountDecimal = new DecimalJS(amount.toString())

    if (amountDecimal.lessThanOrEqualTo(0)) {
      throw new Error('金额必须大于 0')
    }

    if (maxAmount !== undefined) {
      const maxDecimal = new DecimalJS(maxAmount.toString())
      if (amountDecimal.greaterThan(maxDecimal)) {
        throw new Error(`金额不能超过 ${maxDecimal.toString()}`)
      }
    }
  }
}
