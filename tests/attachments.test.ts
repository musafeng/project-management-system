import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAttachmentUrls, serializeAttachmentUrls } from '@/lib/attachments'

test('单附件仍保持原有字符串格式', () => {
  assert.equal(serializeAttachmentUrls(['https://example.com/a.pdf']), 'https://example.com/a.pdf')
})

test('多附件会序列化为 JSON 数组字符串并可回读', () => {
  const serialized = serializeAttachmentUrls([
    'https://example.com/a.pdf',
    'https://example.com/b.pdf',
  ])

  assert.equal(
    serialized,
    JSON.stringify(['https://example.com/a.pdf', 'https://example.com/b.pdf'])
  )
  assert.deepEqual(parseAttachmentUrls(serialized), [
    'https://example.com/a.pdf',
    'https://example.com/b.pdf',
  ])
})

test('会去重并过滤空附件', () => {
  const serialized = serializeAttachmentUrls([
    'https://example.com/a.pdf',
    '  ',
    'https://example.com/a.pdf',
  ])

  assert.equal(serialized, 'https://example.com/a.pdf')
})
