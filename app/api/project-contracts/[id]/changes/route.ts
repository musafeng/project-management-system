import { apiHandlerWithPermissionAndLog, success, BadRequestError } from '@/lib/api'
import { db } from '@/lib/db'
import { createProjectContractChangeRecord } from '@/lib/project-contract-changes'

export const dynamic = 'force-dynamic'


/**
 * POST /api/project-contracts/{id}/changes
 * 记录合同变更
 */
export const { POST } = apiHandlerWithPermissionAndLog(
  {
    POST: async (req) => {
      const id = req.url.split('/').slice(-3)[0]
      if (!id) {
        throw new BadRequestError('缺少合同 ID')
      }

      const body = await req.json()
      const increaseAmount = Number(body.increaseAmount ?? body.changeAmount ?? 0)
      if (increaseAmount <= 0) {
        throw new BadRequestError('增项金额必须大于 0')
      }

      const change = await createProjectContractChangeRecord({
        contractId: id,
        changeDate: body.changeDate || new Date().toISOString().slice(0, 10),
        increaseAmount,
        remark: body.remark || body.changeReason || '历史兼容接口创建',
        attachmentUrl: body.attachmentUrl || '/compat/project-contract-change',
      })

      const contract = await db.projectContract.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          name: true,
          contractAmount: true,
          changedAmount: true,
          receivableAmount: true,
          receivedAmount: true,
          unreceivedAmount: true,
          updatedAt: true,
        },
      })

      return success({
        change: {
          id: change.id,
          contractId: change.contractId,
          changeType: change.changeType,
          changeAmount: change.changeAmount,
          increaseAmount: change.increaseAmount,
          originalAmount: change.originalAmount,
          totalAmount: change.totalAmount,
          changeDate: change.changeDate,
          changeReason: change.remark,
          approvalStatus: change.approvalStatus,
          createdAt: change.createdAt,
        },
        contract,
      })
    },
  },
  {
    resource: 'project-contract-changes',
    resourceIdExtractor: (_req, result) => result?.data?.change?.id ?? null,
  }
)
