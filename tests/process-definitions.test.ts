import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProcessDefinition, normalizeProcessDefinitions } from '@/lib/process-definitions'

test('流程定义接口会把 Prisma 的 ProcessNode 关系序列化为 nodes', () => {
  const definition = normalizeProcessDefinition({
    id: 'def-1',
    resourceType: 'construction-approvals',
    name: '施工立项流程',
    isActive: true,
    createdAt: new Date('2026-04-22T00:00:00.000Z'),
    ProcessNode: [
      {
        id: 'node-1',
        definitionId: 'def-1',
        order: 1,
        name: '审批',
        approverType: 'ROLE',
        approverRole: 'ADMIN',
        approverUserId: null,
        ccMode: 'NONE',
        ccRole: null,
        ccUserId: null,
        createdAt: new Date('2026-04-22T00:00:00.000Z'),
      },
    ],
  })

  assert.equal('ProcessNode' in definition, false)
  assert.equal(definition.nodes.length, 1)
  assert.equal(definition.nodes[0].id, 'node-1')
})

test('流程定义列表序列化会保留已有的 nodes 字段', () => {
  const definitions = normalizeProcessDefinitions([
    {
      id: 'def-1',
      resourceType: 'construction-approvals',
      name: '施工立项流程',
      isActive: true,
      createdAt: new Date('2026-04-22T00:00:00.000Z'),
      nodes: [],
    },
  ])

  assert.deepEqual(definitions[0].nodes, [])
})
