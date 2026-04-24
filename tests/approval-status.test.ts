import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canSubmitApproval,
  getApprovalLockReason,
  getApprovalStatusMeta,
  isApprovalLocked,
} from '@/lib/approval-status'

test('草稿态会显示待提交且允许编辑', () => {
  const record = { approvalStatus: 'APPROVED', approvedAt: null }

  assert.equal(isApprovalLocked(record), false)
  assert.equal(getApprovalLockReason(record), null)
  assert.deepEqual(getApprovalStatusMeta(record), { color: 'blue', label: '待提交' })
  assert.equal(canSubmitApproval(record, null), true)
})

test('审批中会锁定且不可再次提交', () => {
  const record = { approvalStatus: 'PENDING', approvedAt: null }

  assert.equal(isApprovalLocked(record), true)
  assert.equal(getApprovalLockReason(record), '当前单据审批中，无法修改')
  assert.equal(canSubmitApproval(record, 'PENDING'), false)
})

test('审批通过终态会锁定且不可提交', () => {
  const record = { approvalStatus: 'APPROVED', approvedAt: '2026-04-24T00:00:00.000Z' }

  assert.equal(isApprovalLocked(record), true)
  assert.equal(getApprovalLockReason(record), '当前单据已审批通过，无法修改')
  assert.equal(canSubmitApproval(record, 'APPROVED'), false)
})

test('驳回态允许编辑并可重新提交', () => {
  const record = { approvalStatus: 'REJECTED', approvedAt: null }

  assert.equal(isApprovalLocked(record), false)
  assert.equal(getApprovalLockReason(record), null)
  assert.equal(canSubmitApproval(record, 'REJECTED'), true)
})
