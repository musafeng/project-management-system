type ProcessNodeRecord = {
  id: string
  definitionId: string
  order: number
  name: string
  approverType: 'ROLE' | 'USER'
  approverRole: string | null
  approverUserId: string | null
  ccMode: 'NONE' | 'SUBMITTER' | 'ROLE' | 'USER'
  ccRole: string | null
  ccUserId: string | null
  createdAt: Date
  updatedAt?: Date
}

type ProcessDefinitionRecord = {
  id: string
  resourceType: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
  ProcessNode?: ProcessNodeRecord[]
  nodes?: ProcessNodeRecord[]
}

export function normalizeProcessDefinition<T extends ProcessDefinitionRecord>(definition: T) {
  const nodes = definition.nodes ?? definition.ProcessNode ?? []
  const { ProcessNode, ...rest } = definition

  return {
    ...rest,
    nodes,
  }
}

export function normalizeProcessDefinitions<T extends ProcessDefinitionRecord>(definitions: T[]) {
  return definitions.map((definition) => normalizeProcessDefinition(definition))
}
