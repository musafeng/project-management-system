/**
 * 劳务人员管理 API - 列表和创建
 * 
 * GET /api/labor-workers - 获取劳务人员列表
 * POST /api/labor-workers - 创建劳务人员
 */

import { apiHandlerWithPermissionAndLog, success, BadRequestError } from '@/lib/api'
import { db } from '@/lib/db'

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

    // 构建查询条件
    const where: any = {}

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
        contact: true,
        phone: true,
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
   *   contact?: string
   *   phone?: string
   *   address?: string
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

    // 创建劳务人员
    const laborWorker = await db.laborWorker.create({
      data: {
        code: generateLaborWorkerCode(),
        name,
        contact: body.contact?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        remark: body.remark?.trim() || null,
        status: 'active',
      },
      select: {
        id: true,
        code: true,
        name: true,
        contact: true,
        phone: true,
        address: true,
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

