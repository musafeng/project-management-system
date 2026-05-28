import test from 'node:test'
import assert from 'node:assert/strict'
import { getAttachmentDisplayName, getAttachmentPreviewType, parseAttachmentUrls, serializeAttachmentUrls } from '@/lib/attachments'

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

test('附件显示名会去掉上传时追加的 uuid 前缀', () => {
  assert.equal(
    getAttachmentDisplayName('attachments/202605/1715910000-11111111-2222-3333-4444-555555555555-合同.pdf'),
    '合同.pdf'
  )
})

test('按扩展名识别预览类型', () => {
  assert.equal(getAttachmentPreviewType('attachments/202605/a.png'), 'image')
  assert.equal(getAttachmentPreviewType('attachments/202605/a.pdf'), 'pdf')
  assert.equal(getAttachmentPreviewType('attachments/202605/a.docx'), 'office')
  assert.equal(getAttachmentPreviewType('attachments/202605/a.zip'), 'download')
})
