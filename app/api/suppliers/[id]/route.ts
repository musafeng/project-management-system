/**
 * 供应商管理 API - 详情、更新、删除
 * 
 * GET /api/suppliers/{id} - 获取供应商详情
 * PUT /api/suppliers/{id} - 更新供应商信息
 * DELETE /api/suppliers/{id} - 删除供应商
 */

import { apiHandlerWithMethod, success, NotFoundError, BadRequestError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/suppliers/{id}
   * 获取供应商详情
   * 
   * 路径参数：
   * - id - 供应商 ID
   * 
   * 示例：
   * /api/suppliers/clx1a2b3c4d5e6f7g8h9i0j1k2
   */
  GET: async (req: any, { params }: { params: { id: string } }) => {
    const { id } = params

    if (!id || typeof id !== 'string') {
      throw new BadRequestError('供应商 ID 为必填项')
    }

    // 查询供应商
    const supplier = await db.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        address: true,
        taxId: true,
        bankAccount: true,
        bankName: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!supplier) {
      throw new NotFoundError('供应商不存在')
    }

    return success(supplier)
  },

  /**
   * PUT /api/suppliers/{id}
   * 更新供应商信息
   * 
   * 路径参数：
   * - id - 供应商 ID
   * 
   * 请求 body：
   * {
   *   name?: string
   *   contact?: string
   *   phone?: string
   *   email?: string
   *   address?: string
   *   taxId?: string
   *   bankAccount?: string
   *   bankName?: string
   *   remark?: string
   * }
   * 
   * 示例：
   * {
   *   "name": "某某建材有限公司",
   *   "contact": "李四",
   *   "phone": "13900139000",
   *   "address": "上海市浦东新区"
   * }
   */
  PUT: async (req: any, { params }: { params: { id: string } }) => {
    const { id } = params

    if (!id || typeof id !== 'string') {
      throw new BadRequestError('供应商 ID 为必填项')
    }

    const body = await req.json()

    // 验证供应商是否存在
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingSupplier) {
      throw new NotFoundError('供应商不存在')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.name !== undefined) {
      const name = body.name?.trim()
      if (name && name.length > 0) {
        if (name.length > 100) {
          throw new BadRequestError('供应商名称长度不能超过 100 个字符')
        }
        updateData.name = name
      } else if (body.name === '') {
        throw new BadRequestError('供应商名称不能为空')
      }
    }

    if (body.contact !== undefined) {
      updateData.contact = body.contact?.trim() || null
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
    }

    if (body.email !== undefined) {
      updateData.email = body.email?.trim() || null
    }

    if (body.address !== undefined) {
      updateData.address = body.address?.trim() || null
    }

    if (body.taxId !== undefined) {
      updateData.taxId = body.taxId?.trim() || null
    }

    if (body.bankAccount !== undefined) {
      updateData.bankAccount = body.bankAccount?.trim() || null
    }

    if (body.bankName !== undefined) {
      updateData.bankName = body.bankName?.trim() || null
    }

    if (body.remark !== undefined) {
      updateData.remark = body.remark?.trim() || null
    }

    // 如果没有任何更新字段，直接返回现有数据
    if (Object.keys(updateData).length === 0) {
      return success(existingSupplier)
    }

    // 更新供应商
    const supplier = await db.supplier.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        address: true,
        taxId: true,
        bankAccount: true,
        bankName: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return success(supplier)
  },

  /**
   * DELETE /api/suppliers/{id}
   * 删除供应商
   * 
   * 删除规则：
   * - 如果供应商已经关联采购合同（ProcurementContract 表中存在 supplierId），禁止删除
   * - 返回错误："该供应商已关联采购合同，无法删除"
   * 
   * 路径参数：
   * - id - 供应商 ID
   * 
   * 示例：
   * /api/suppliers/clx1a2b3c4d5e6f7g8h9i0j1k2
   */
  DELETE: async (req: any, { params }: { params: { id: string } }) => {
    const { id } = params

    if (!id || typeof id !== 'string') {
      throw new BadRequestError('供应商 ID 为必填项')
    }

    // 验证供应商是否存在
    const supplier = await db.supplier.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!supplier) {
      throw new NotFoundError('供应商不存在')
    }

    // 检查是否关联采购合同
    const relatedContracts = await db.procurementContract.findMany({
      where: { supplierId: id },
      select: { id: true },
      take: 1,
    })

    if (relatedContracts.length > 0) {
      throw new ConflictError('该供应商已关联采购合同，无法删除')
    }

    // 删除供应商
    await db.supplier.delete({
      where: { id },
    })

    return success({
      message: '供应商已删除',
      id,
    })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler

