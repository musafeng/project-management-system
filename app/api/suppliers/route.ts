/**
 * 供应商管理 API - 列表和创建
 * 
 * GET /api/suppliers - 获取供应商列表
 * POST /api/suppliers - 创建供应商
 */

import { apiHandlerWithPermissionAndLog, success, BadRequestError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


/**
 * 生成供应商编码
 * 格式：SUP + 时间戳
 */
function generateSupplierCode(): string {
  return `SUP${Date.now()}`
}

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/suppliers
   * 获取供应商列表
   * 
   * 查询参数：
   * - keyword (可选) - 按供应商名称模糊搜索
   * 
   * 示例：
   * /api/suppliers
   * /api/suppliers?keyword=建材
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword') || undefined
    const supportsRegionId = await hasDbColumn('Supplier', 'regionId')
    const regionId = supportsRegionId ? await requireCurrentRegionId() : null

    // 构建查询条件
    const where: any = supportsRegionId ? { regionId } : {}

    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      }
    }

    // 查询供应商列表
    const suppliers = await db.supplier.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        contact: true,
        phone: true,
        address: true,
        bankAccount: true,
        bankName: true,
        attachmentUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return success(suppliers)
  },

  /**
   * POST /api/suppliers
   * 创建供应商
   * 
   * 请求 body：
   * {
   *   name: string (必填)
 *   contact?: string
 *   phone?: string
 *   address?: string
 *   bankAccount: string
 *   bankName: string
 *   attachmentUrl?: string
 *   remark?: string
   * }
   * 
   * 创建规则：
   * - name 必填
   * - 自动生成 code：SUP + 当前时间戳
   * 
   * 示例：
   * {
   *   "name": "某某建材有限公司",
   *   "contact": "张三",
   *   "phone": "13800138000",
   *   "address": "北京市朝阳区",
   *   "remark": "主要供应建筑材料"
   * }
   */
  POST: async (req) => {
    const body = await req.json()
    const supportsRegionId = await hasDbColumn('Supplier', 'regionId')
    const regionId = supportsRegionId ? await requireCurrentRegionId() : null

    // 验证必填字段
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestError('供应商名称为必填项')
    }

    const name = body.name.trim()
    if (name.length === 0) {
      throw new BadRequestError('供应商名称不能为空')
    }

    if (name.length > 100) {
      throw new BadRequestError('供应商名称长度不能超过 100 个字符')
    }

    const bankAccount = String(body.bankAccount ?? '').trim()
    const bankName = String(body.bankName ?? '').trim()

    if (!bankAccount) {
      throw new BadRequestError('银行卡号为必填项')
    }

    if (!bankName) {
      throw new BadRequestError('开户行为必填项')
    }

    // 创建供应商
    const supplier = await db.supplier.create({
      data: {
        id: crypto.randomUUID(),
        code: generateSupplierCode(),
        name,
        contact: body.contact?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        bankAccount,
        bankName,
        attachmentUrl: String(body.attachmentUrl ?? '').trim() || null,
        remark: body.remark?.trim() || null,
        status: 'active',
        ...(supportsRegionId ? { regionId } : {}),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        code: true,
        name: true,
        contact: true,
        phone: true,
        address: true,
        bankAccount: true,
        bankName: true,
        attachmentUrl: true,
        remark: true,
        createdAt: true,
      },
    })

    return success(supplier)
  },
}, {
  resource: 'suppliers',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
