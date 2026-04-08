import { BadRequestError, NotFoundError } from './api'
import { db } from './db'
import { assertProjectContractInCurrentRegion, requireCurrentRegionId } from './region'

export const PROJECT_CONTRACT_CHANGE_SELECT = {
  id: true,
  contractId: true,
  regionId: true,
  changeDate: true,
  changeType: true,
  changeAmount: true,
  increaseAmount: true,
  originalAmount: true,
  totalAmount: true,
  attachmentUrl: true,
  remark: true,
  approvalStatus: true,
  approvedAt: true,
  rejectedReason: true,
  ProjectContract: {
    select: {
      code: true,
      name: true,
      projectId: true,
      Project: { select: { name: true } },
    },
  },
  createdAt: true,
} as const

export async function createProjectContractChangeRecord(input: {
  contractId: string
  changeDate: string
  increaseAmount: number
  remark: string
  attachmentUrl: string
}) {
  const contractId = String(input.contractId ?? '').trim()
  const changeDate = String(input.changeDate ?? '').trim()
  const remark = String(input.remark ?? '').trim()
  const attachmentUrl = String(input.attachmentUrl ?? '').trim()
  const increaseAmount = Number(input.increaseAmount ?? 0)

  if (!contractId) throw new BadRequestError('项目合同为必填项')
  if (!changeDate) throw new BadRequestError('变更日期为必填项')
  if (increaseAmount <= 0) throw new BadRequestError('增项金额必须大于 0')
  if (!remark) throw new BadRequestError('备注为必填项')
  if (!attachmentUrl) throw new BadRequestError('附件为必填项')

  const contract = await assertProjectContractInCurrentRegion(contractId)
  if (!contract) throw new NotFoundError('项目合同不存在')

  const originalAmount = Number(contract.contractAmount)
  const totalAmount = originalAmount + increaseAmount
  const regionId = await requireCurrentRegionId()

  return db.projectContractChange.create({
    data: {
      id: crypto.randomUUID(),
      contractId,
      regionId: regionId ?? undefined,
      changeDate: new Date(changeDate),
      changeType: 'INCREASE',
      changeAmount: increaseAmount,
      increaseAmount,
      originalAmount,
      totalAmount,
      changeReason: remark,
      remark,
      attachmentUrl,
      approvalStatus: 'APPROVED',
      updatedAt: new Date(),
    },
    select: PROJECT_CONTRACT_CHANGE_SELECT,
  })
}

export async function applyApprovedProjectContractChange(id: string) {
  const change = await db.projectContractChange.findUnique({
    where: { id },
    select: {
      id: true,
      contractId: true,
      approvalStatus: true,
      increaseAmount: true,
      totalAmount: true,
      ProjectContract: {
        select: {
          id: true,
          receivedAmount: true,
        },
      },
    },
  })

  if (!change || change.approvalStatus !== 'APPROVED' || change.totalAmount === null) {
    return
  }

  const totalAmount = Number(change.totalAmount)
  const increaseAmount = Number(change.increaseAmount ?? 0)
  const receivedAmount = Number(change.ProjectContract.receivedAmount)

  await db.projectContract.update({
    where: { id: change.contractId },
    data: {
      contractAmount: totalAmount,
      changedAmount: increaseAmount,
      receivableAmount: totalAmount,
      unreceivedAmount: totalAmount - receivedAmount,
      updatedAt: new Date(),
    },
  })
}
