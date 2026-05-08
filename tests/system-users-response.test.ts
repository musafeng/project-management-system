import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSystemUsersPayload } from '@/lib/system-users-response'

test('审批流程页可兼容数组形式的系统用户返回', () => {
  const users = normalizeSystemUsersPayload([
    { id: '1', name: '张三', dingUserId: 'u1', role: 'ADMIN' },
  ])

  assert.equal(users.length, 1)
  assert.equal(users[0].id, '1')
})

test('审批流程页可兼容对象包裹的系统用户返回', () => {
  const users = normalizeSystemUsersPayload({
    users: [{ id: '1', name: '张三', dingUserId: 'u1', role: 'ADMIN' }],
  })

  assert.equal(users.length, 1)
  assert.equal(users[0].dingUserId, 'u1')
})

test('审批流程页遇到异常返回时会退化为空数组', () => {
  assert.deepEqual(normalizeSystemUsersPayload({ users: null }), [])
  assert.deepEqual(normalizeSystemUsersPayload(undefined), [])
})
