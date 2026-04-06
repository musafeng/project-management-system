export interface RecordNavigation {
  prevId: string | null
  nextId: string | null
  position: number
  total: number
}

export function getDescNavigationOrder(field: string) {
  return [
    { [field]: 'desc' as const },
    { createdAt: 'desc' as const },
    { id: 'desc' as const },
  ]
}

export function getBeforeRecordWhere(
  baseWhere: Record<string, any>,
  field: string,
  value: Date | string | number,
  createdAt: Date,
  id: string,
) {
  return {
    AND: [
      baseWhere,
      {
        OR: [
          { [field]: { gt: value } },
          { [field]: value, createdAt: { gt: createdAt } },
          { [field]: value, createdAt, id: { gt: id } },
        ],
      },
    ],
  }
}

export function getAfterRecordWhere(
  baseWhere: Record<string, any>,
  field: string,
  value: Date | string | number,
  createdAt: Date,
  id: string,
) {
  return {
    AND: [
      baseWhere,
      {
        OR: [
          { [field]: { lt: value } },
          { [field]: value, createdAt: { lt: createdAt } },
          { [field]: value, createdAt, id: { lt: id } },
        ],
      },
    ],
  }
}
