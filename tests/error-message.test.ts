import test from 'node:test'
import assert from 'node:assert/strict'
import { toChineseErrorMessage } from '@/lib/api/error-message'

test('Prisma 缺列错误会映射为中文数据库错误提示', () => {
  assert.equal(
    toChineseErrorMessage('Invalid `prisma.otherReceipt.create()` invocation: The column `OtherReceipt.regionId` does not exist in the current database.'),
    '数据库操作失败，请检查输入内容后重试'
  )
})

test('网络错误会映射为中文网络提示', () => {
  assert.equal(
    toChineseErrorMessage('Failed to fetch'),
    '网络连接失败，请检查网络后重试'
  )
})
