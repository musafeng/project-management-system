/**
 * 劳务人员管理 API - 列表和创建
 * 
 * GET /api/labor-workers - 获取劳务人员列表
 * POST /api/labor-workers - 创建劳务人员
 */

import { apiHandlerWithPermissionAndLog, success, BadRequestError } from '@/lib/api'
import { hasDbColumn } from '@/lib/db-column-compat'
import { db } from '@/lib/db'
import { requireCurrentRegionId } from '@/lib/region'

export const dynamic = 'force-dynamic'


/**
 * 生成劳务人员编码
 * 格式：LABW + 时间戳
 */
function generateLaborWorkerCode(): string {
  return `LABW${Date.now()}`
}

export const { GET, POST } = apiHandlerWithPermissionAndLog({
  /**
   * GET /api/labor-workers
   * 获取劳务人员列表
   * 
   * 查询参数：
   * - keyword (可选) - 按劳务人员名称模糊搜索
   * 
   * 示例：
   * /api/labor-workers
   * /api/labor-workers?keyword=班组
   */
  GET: async (req) => {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword') || undefined
    const supportsRegionId = await hasDbColumn('LaborWorker', 'regionId')
    const regionId = supportsRegionId ? await requireCurrentRegionId() : null

    // 构建查询条件
    const where: any = supportsRegionId ? { regionId } : {}

    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      }
    }

    // 查询劳务人员列表
    const laborWorkers = await db.laborWorker.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        idNumber: true,
        bankAccount: true,
        bankName: true,
        attachmentUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return success(laborWorkers)
  },

  /**
   * POST /api/labor-workers
   * 创建劳务人员
   * 
   * 请求 body：
   * {
   *   name: string (必填)
 *   phone?: string
 *   idNumber: string
 *   address?: string
 *   bankAccount: string
 *   bankName: string
 *   attachmentUrl?: string
 *   remark?: string
   * }
   * 
   * 创建规则：
   * - name 必填
   * - 自动生成 code：LABW + 当前时间戳
   * 
   * 示例：
   * {
   *   "name": "某某班组",
   *   "contact": "王五",
   *   "phone": "13700137000",
   *   "address": "北京市朝阳区",
   *   "remark": "专业砌筑班组"
   * }
   */
  POST: async (req) => {
    const body = await req.json()
    const supportsRegionId = await hasDbColumn('LaborWorker', 'regionId')
    const regionId = supportsRegionId ? await requireCurrentRegionId() : null

    // 验证必填字段
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestError('劳务人员名称为必填项')
    }

    const name = body.name.trim()
    if (name.length === 0) {
      throw new BadRequestError('劳务人员名称不能为空')
    }

    if (name.length > 100) {
      throw new BadRequestError('劳务人员名称长度不能超过 100 个字符')
    }

    const idNumber = String(body.idNumber ?? '').trim()
    const bankAccount = String(body.bankAccount ?? '').trim()
    const bankName = String(body.bankName ?? '').trim()

    if (!idNumber) {
      throw new BadRequestError('身份证号为必填项')
    }

    if (!bankAccount) {
      throw new BadRequestError('银行卡号为必填项')
    }

    if (!bankName) {
      throw new BadRequestError('开户行为必填项')
    }

    // 创建劳务人员
    const laborWorker = await db.laborWorker.create({
      data: {
        id: crypto.randomUUID(),
        code: generateLaborWorkerCode(),
        name,
        phone: body.phone?.trim() || null,
        idNumber,
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
        phone: true,
        idNumber: true,
        address: true,
        bankAccount: true,
        bankName: true,
        attachmentUrl: true,
        remark: true,
        createdAt: true,
      },
    })

    return success(laborWorker)
  },
}, {
  resource: 'labor-workers',
  resourceIdExtractor: (req, result) => result?.data?.id || null,
})
