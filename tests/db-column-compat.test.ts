import test from 'node:test'
import assert from 'node:assert/strict'
import { pickExistingDbFieldsFromColumns } from '@/lib/db-column-compat'

test('会过滤数据库里不存在的字段，保留兼容字段', () => {
  const result = pickExistingDbFieldsFromColumns(
    ['id', 'projectId', 'attachmentUrl'],
    {
      id: '1',
      projectId: 'p1',
      regionId: 'r1',
      workerId: 'w1',
      attachmentUrl: 'https://example.com/a.pdf',
    }
  )

  assert.deepEqual(result, {
    id: '1',
    projectId: 'p1',
    attachmentUrl: 'https://example.com/a.pdf',
  })
})
