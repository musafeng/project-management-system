import { apiHandlerWithPermissionAndLog, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/customers
   * 获取客户列表
   * 支持参数：keyword（按名称模糊搜索）
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword')

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { code: { contains: keyword } },
          ],
        }
      : {}

    const customers = await db.customer.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        address: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return success(customers)
  },

  /**
   * POST /api/customers
   * 创建客户
   */
  POST: async (req) => {
    const body = await req.json()

    // 验证必填字段
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestError('客户名称为必填项且不能为空')
    }

    // 生成客户编码
    const code = `CUST${Date.now()}`

    // 创建客户
    const customer = await db.customer.create({
      data: {
        id: crypto.randomUUID(),
        code,
        name: body.name.trim(),
        contact: body.contact?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        taxId: body.taxId?.trim() || null,
        bankAccount: body.bankAccount?.trim() || null,
        bankName: body.bankName?.trim() || null,
        remark: body.remark?.trim() || null,
        status: 'active',
        updatedAt: new Date(),
      },
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
      },
    })

    return success(customer)
  },
}, {
  resource: 'customers',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
