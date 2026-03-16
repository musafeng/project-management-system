import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ConflictError } from '@/lib/api'
import { db } from '@/lib/db'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/customers/{id}
   * 获取客户详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少客户 ID')
    }

    const customer = await db.customer.findUnique({
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

    if (!customer) {
      throw new NotFoundError('客户不存在')
    }

    return success(customer)
  },

  /**
   * PUT /api/customers/{id}
   * 更新客户信息
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少客户 ID')
    }

    const body = await req.json()

    // 检查客户是否存在
    const existingCustomer = await db.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      throw new NotFoundError('客户不存在')
    }

    // 构建更新数据
    const updateData: any = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        throw new BadRequestError('客户名称不能为空')
      }
      updateData.name = body.name.trim()
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

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    // 更新客户
    const customer = await db.customer.update({
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

    return success(customer)
  },

  /**
   * DELETE /api/customers/{id}
   * 删除客户
   * 删除规则：如果客户已关联项目，禁止删除
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少客户 ID')
    }

    // 检查客户是否存在
    const customer = await db.customer.findUnique({
      where: { id },
    })

    if (!customer) {
      throw new NotFoundError('客户不存在')
    }

    // 检查客户是否关联项目
    const projectCount = await db.project.count({
      where: { customerId: id },
    })

    if (projectCount > 0) {
      throw new ConflictError('该客户已关联项目，无法删除')
    }

    // 检查客户是否关联合同
    const contractCount = await db.projectContract.count({
      where: { customerId: id },
    })

    if (contractCount > 0) {
      throw new ConflictError('该客户已关联合同，无法删除')
    }

    // 删除客户
    await db.customer.delete({
      where: { id },
    })

    return success({ message: '客户已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler

