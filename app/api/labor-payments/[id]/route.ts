import { apiHandlerWithMethod, success, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api'
import { db } from '@/lib/db'
import { assertEditable, getApprovalTimeline } from '@/lib/approval'
import { prisma } from '@/lib/prisma'

const handler = apiHandlerWithMethod({
  /**
   * GET /api/labor-payments/{id}
   * 获取付款详情
   */
  GET: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    const payment = await db.laborPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        projectId: true,
        workerId: true,
        contract: {
          select: {
            code: true,
            name: true,
            status: true,
            payableAmount: true,
            paidAmount: true,
            unpaidAmount: true,
            project: {
              select: { name: true },
            },
            worker: {
              select: { name: true },
            },
          },
        },
        paymentAmount: true,
        paymentDate: true,
        paymentMethod: true,
        paymentNumber: true,
        approvalStatus: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    const relatedPayments = await db.laborPayment.findMany({
      where: { contractId: payment.contractId },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        paymentDate: true,
        paymentAmount: true,
        paymentMethod: true,
        paymentNumber: true,
        status: true,
        approvalStatus: true,
      },
    })
    const approvalTrail = await getApprovalTimeline('laborPayment', payment.id)

    return success({
      id: payment.id,
      contractId: payment.contractId,
      projectId: payment.projectId,
      workerId: payment.workerId,
      contractCode: payment.contract.code,
      contractName: payment.contract.name,
      contractStatus: payment.contract.status,
      projectName: payment.contract.project.name,
      laborWorkerName: payment.contract.worker.name,
      payableAmount: payment.contract.payableAmount,
      paidAmount: payment.contract.paidAmount,
      unpaidAmount: payment.contract.unpaidAmount,
      amount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentNumber: payment.paymentNumber,
      approvalStatus: payment.approvalStatus,
      status: payment.status,
      remark: payment.remark,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      relatedFlows: relatedPayments.map((item) => ({
        id: item.id,
        date: item.paymentDate,
        amount: item.paymentAmount,
        method: item.paymentMethod,
        number: item.paymentNumber,
        status: item.status,
        approvalStatus: item.approvalStatus,
      })),
      approvalTrail: approvalTrail.map((item) => ({
        id: item.id,
        nodeName: item.nodeName,
        status: item.status,
        operatorName: item.operatorName,
        handledAt: item.handledAt,
        createdAt: item.createdAt,
        comment: item.comment,
      })),
    })
  },

  /**
   * PUT /api/labor-payments/{id}
   * 更新付款记录并回写合同汇总
   */
  PUT: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    const body = await req.json()
    const existing = await db.laborPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        paymentAmount: true,
        paymentDate: true,
        approvalStatus: true,
      },
    })

    if (!existing) {
      throw new NotFoundError('付款记录不存在')
    }

    try {
      assertEditable(existing.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    const nextContractId = typeof body.contractId === 'string' && body.contractId.trim()
      ? body.contractId
      : existing.contractId
    const nextAmount = body.amount !== undefined ? Number(body.amount) : Number(existing.paymentAmount)
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      throw new BadRequestError('付款金额必须大于 0')
    }

    if (body.paymentDate !== undefined) {
      if (!body.paymentDate || typeof body.paymentDate !== 'string') {
        throw new BadRequestError('付款日期不能为空')
      }
      const paymentDate = new Date(body.paymentDate)
      if (Number.isNaN(paymentDate.getTime())) {
        throw new BadRequestError('付款日期格式不正确')
      }
    }

    const nextContract = await db.laborContract.findUnique({
      where: { id: nextContractId },
      select: {
        id: true,
        projectId: true,
        workerId: true,
        payableAmount: true,
        paidAmount: true,
      },
    })

    if (!nextContract) {
      throw new NotFoundError('关联合同不存在')
    }

    const oldContract = existing.contractId === nextContractId
      ? nextContract
      : await db.laborContract.findUnique({
          where: { id: existing.contractId },
          select: {
            id: true,
            payableAmount: true,
            paidAmount: true,
          },
        })

    if (!oldContract) {
      throw new NotFoundError('原合同不存在')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.laborPayment.update({
        where: { id },
        data: {
          contractId: nextContractId,
          projectId: nextContract.projectId,
          workerId: nextContract.workerId,
          paymentAmount: nextAmount,
          paymentDate: body.paymentDate ? new Date(body.paymentDate) : existing.paymentDate,
          paymentMethod: body.paymentMethod !== undefined ? (body.paymentMethod?.trim() || null) : undefined,
          paymentNumber: body.paymentNumber !== undefined ? (body.paymentNumber?.trim() || null) : undefined,
          remark: body.remark !== undefined ? (body.remark?.trim() || null) : undefined,
        },
        select: {
          id: true,
          contractId: true,
          projectId: true,
          workerId: true,
          contract: {
            select: {
              code: true,
              name: true,
              status: true,
              payableAmount: true,
              paidAmount: true,
              unpaidAmount: true,
              project: { select: { name: true } },
              worker: { select: { name: true } },
            },
          },
          paymentAmount: true,
          paymentDate: true,
          paymentMethod: true,
          paymentNumber: true,
          approvalStatus: true,
          status: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (existing.contractId === nextContractId) {
        const nextPaidAmount = Number(oldContract.paidAmount) - Number(existing.paymentAmount) + nextAmount
        await tx.laborContract.update({
          where: { id: nextContractId },
          data: {
            paidAmount: nextPaidAmount,
            unpaidAmount: Number(oldContract.payableAmount) - nextPaidAmount,
          },
        })
      } else {
        const oldPaidAmount = Number(oldContract.paidAmount) - Number(existing.paymentAmount)
        await tx.laborContract.update({
          where: { id: existing.contractId },
          data: {
            paidAmount: oldPaidAmount,
            unpaidAmount: Number(oldContract.payableAmount) - oldPaidAmount,
          },
        })

        const newPaidAmount = Number(nextContract.paidAmount) + nextAmount
        await tx.laborContract.update({
          where: { id: nextContractId },
          data: {
            paidAmount: newPaidAmount,
            unpaidAmount: Number(nextContract.payableAmount) - newPaidAmount,
          },
        })
      }

      return record
    })

    return success({
      id: updated.id,
      contractId: updated.contractId,
      projectId: updated.projectId,
      workerId: updated.workerId,
      contractCode: updated.contract.code,
      contractName: updated.contract.name,
      contractStatus: updated.contract.status,
      projectName: updated.contract.project.name,
      laborWorkerName: updated.contract.worker.name,
      payableAmount: updated.contract.payableAmount,
      paidAmount: updated.contract.paidAmount,
      unpaidAmount: updated.contract.unpaidAmount,
      amount: updated.paymentAmount,
      paymentDate: updated.paymentDate,
      paymentMethod: updated.paymentMethod,
      paymentNumber: updated.paymentNumber,
      approvalStatus: updated.approvalStatus,
      status: updated.status,
      remark: updated.remark,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  },

  /**
   * DELETE /api/labor-payments/{id}
   * 删除付款记录
   * 删除规则：回退合同汇总字段
   */
  DELETE: async (req) => {
    const id = req.url.split('/').pop()

    if (!id) {
      throw new BadRequestError('缺少付款记录 ID')
    }

    // 获取付款记录
    const payment = await db.laborPayment.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        paymentAmount: true,
        approvalStatus: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('付款记录不存在')
    }

    // 审批状态锁定校验
    try {
      assertEditable(payment.approvalStatus)
    } catch (err) {
      throw new ForbiddenError(err instanceof Error ? err.message : '无法修改')
    }

    // 获取合同信息
    const contract = await db.laborContract.findUnique({
      where: { id: payment.contractId },
      select: {
        id: true,
        payableAmount: true,
        paidAmount: true,
      },
    })

    if (!contract) {
      throw new NotFoundError('关联的劳务合同不存在')
    }

    // 删除付款记录
    await db.laborPayment.delete({
      where: { id },
    })

    // 回退合同汇总字段
    const newPaidAmount =
      Number(contract.paidAmount) - Number(payment.paymentAmount)
    const newUnpaidAmount =
      Number(contract.payableAmount) - newPaidAmount

    await db.laborContract.update({
      where: { id: payment.contractId },
      data: {
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
      },
    })

    return success({ message: '付款记录已删除' })
  },
})

export const GET = handler
export const PUT = handler
export const DELETE = handler
