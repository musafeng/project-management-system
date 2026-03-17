import { apiHandler, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

/**
 * POST /api/project-contracts/{id}/changes
 * 记录合同变更
 */
export const POST = apiHandler(async (req) => {
  const id = req.url.split('/').slice(-3)[0]

  if (!id) {
    throw new BadRequestError('缺少合同 ID')
  }

  const body = await req.json()

  // 验证必填字段
  if (body.changeAmount === undefined || typeof body.changeAmount !== 'number') {
    throw new BadRequestError('变更金额为必填项且必须是数字')
  }

  // 检查合同是否存在
  const contract = await db.projectContract.findUnique({
    where: { id },
  })

  if (!contract) {
    throw new NotFoundError('合同不存在')
  }

  // 确定变更类型
  let changeType: 'INCREASE' | 'DECREASE' | 'ADJUSTMENT' = 'ADJUSTMENT'
  if (body.changeAmount > 0) {
    changeType = 'INCREASE'
  } else if (body.changeAmount < 0) {
    changeType = 'DECREASE'
  }

  // 创建变更记录
  const change = await db.projectContractChange.create({
    data: {
      contractId: id,
      changeType,
      changeAmount: body.changeAmount,
      changeReason: body.remark?.trim() || null,
    },
    select: {
      id: true,
      contractId: true,
      changeType: true,
      changeAmount: true,
      changeReason: true,
      createdAt: true,
    },
  })

  // 计算新的变更后金额
  const newChangedAmount =
    Number(contract.changedAmount) + Number(body.changeAmount)
  const newReceivableAmount =
    Number(contract.contractAmount) + newChangedAmount
  const newUnreceivedAmount =
    newReceivableAmount - Number(contract.receivedAmount)

  // 更新合同的汇总字段
  const updatedContract = await db.projectContract.update({
    where: { id },
    data: {
      changedAmount: newChangedAmount,
      receivableAmount: newReceivableAmount,
      unreceivedAmount: newUnreceivedAmount,
    },
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
    change,
    contract: updatedContract,
  })
})

