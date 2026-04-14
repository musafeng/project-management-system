/**
 * 劳务人员管理 API - 详情、更新、删除
 * 
 * GET /api/labor-workers/{id} - 获取劳务人员详情
 * PUT /api/labor-workers/{id} - 更新劳务人员信息
 * DELETE /api/labor-workers/{id} - 删除劳务人员
 */

import { apiHandlerWithMethod, success, NotFoundError, BadRequestError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


const handler = apiHandlerWithMethod({
  /**
   * GET /api/labor-workers/{id}
   * 获取劳务人员详情
   * 
   * 路径参数：
   * - id - 劳务人员 ID
   * 
   * 示例：
   * /api/labor-workers/clx1a2b3c4d5e6f7g8h9i0j1k2
   */
  GET: async (req: any, { params }: { params: { id: string } }, context: any) => {
    const { id } = params

    if (!id || typeof id !== 'string') {
      throw new BadRequestError('劳务人员 ID 为必填项')
    }

    // 查询劳务人员
    const laborWorker = await db.laborWorker.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        idNumber: true,
        address: true,
        bankAccount: true,
        bankName: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!laborWorker) {
      throw new NotFoundError('劳务人员不存在')
    }

    return success(laborWorker)
  },

  /**
   * PUT /api/labor-workers/{id}
   * 更新劳务人员信息
   * 
   * 路径参数：
   * - id - 劳务人员 ID
   * 
   * 请求 body：
   * {
   *   name?: string
   *   contact?: string
   *   phone?: string
   *   idNumber?: string
   *   address?: string
   *   bankAccount?: string
   *   bankName?: string
   *   remark?: string
   * }
   * 
   * 示例：
   * {
   *   "name": "某某班组",
   *   "contact": "王五",
   *   "phone": "13700137000",
   *   "address": "北京市朝阳区"
   * }
   */
  PUT: async (req: any, { params }: { params: { id: string } }, context: any) => {
    const { id } = params

    if (!id || typeof id !== 'string') {
      throw new BadRequestError('劳务人员 ID 为必填项')
    }

    const body = await req.json()

    // 验证劳务人员是否存在
    const existingLaborWorker = await db.laborWorker.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingLaborWorker) {
      throw new NotFoundError('劳务人员不存在')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.name !== undefined) {
      const name = body.name?.trim()
      if (name && name.length > 0) {
        if (name.length > 100) {
          throw new BadRequestError('劳务人员名称长度不能超过 100 个字符')
        }
        updateData.name = name
      } else if (body.name === '') {
        throw new BadRequestError('劳务人员名称不能为空')
      }
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
    }

    if (body.idNumber !== undefined) {
      const idNumber = String(body.idNumber ?? '').trim()
      if (!idNumber) {
        throw new BadRequestError('身份证号不能为空')
      }
      updateData.idNumber = idNumber
    }

    if (body.address !== undefined) {
      updateData.address = body.address?.trim() || null
    }

    if (body.bankAccount !== undefined) {
      const bankAccount = String(body.bankAccount ?? '').trim()
      if (!bankAccount) {
        throw new BadRequestError('银行卡号不能为空')
      }
      updateData.bankAccount = bankAccount
    }

    if (body.bankName !== undefined) {
      const bankName = String(body.bankName ?? '').trim()
      if (!bankName) {
        throw new BadRequestError('开户行不能为空')
      }
      updateData.bankName = bankName
    }

    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = body.attachmentUrl?.trim() || null
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    // 如果没有任何更新字段，直接返回现有数据
    if (Object.keys(updateData).length === 0) {
      return success(existingLaborWorker)
    }

    // 更新劳务人员
    const laborWorker = await db.laborWorker.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        idNumber: true,
        address: true,
        bankAccount: true,
        bankName: true,
        attachmentUrl: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success(laborWorker)
  },

  /**
   * DELETE /api/labor-workers/{id}
   * 删除劳务人员
   * 
   * 删除规则：
   * - 如果劳务人员已经关联以下任一数据，则禁止删除：
   *   - LaborContract 中存在 laborWorkerId
   *   - LaborPayment 中存在 laborWorkerId
   * - 返回错误："该劳务人员已关联业务数据，无法删除"
   * 
   * 路径参数：
   * - id - 劳务人员 ID
   * 
   * 示例：
   * /api/labor-workers/clx1a2b3c4d5e6f7g8h9i0j1k2
   */
  DELETE: async (req: any, { params }: { params: { id: string } }, context: any) => {
    const { id } = params

    if (!id || typeof id !== 'string') {
      throw new BadRequestError('劳务人员 ID 为必填项')
    }

    // 验证劳务人员是否存在
    const laborWorker = await db.laborWorker.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!laborWorker) {
      throw new NotFoundError('劳务人员不存在')
    }

    // 检查是否关联劳务合同
    const relatedContracts = await db.laborContract.findMany({
      where: { workerId: id },
      select: { id: true },
      take: 1,
    })

    if (relatedContracts.length > 0) {
      throw new ConflictError('该劳务人员已关联业务数据，无法删除')
    }

    // 检查是否关联劳务付款
    const relatedPayments = await db.laborPayment.findMany({
      where: { workerId: id },
      select: { id: true },
      take: 1,
    })

    if (relatedPayments.length > 0) {
      throw new ConflictError('该劳务人员已关联业务数据，无法删除')
    }

    // 删除劳务人员
    await db.laborWorker.delete({
      where: { id },
    })

    return success({
      message: '劳务人员已删除',
      id,
    })
  },
})
