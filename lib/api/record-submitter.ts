import { ActionType } from '@prisma/client'
import { db } from '@/lib/db'

interface ResolveRecordSubmitterNamesOptions {
  ids: string[]
  resourceType: string
  actionLogResource: string
}

export async function resolveRecordSubmitterNames({
  ids,
  resourceType,
  actionLogResource,
}: ResolveRecordSubmitterNamesOptions) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  const submitterMap = new Map<string, string>()

  if (uniqueIds.length === 0) return submitterMap

  const [instances, createLogs] = await Promise.all([
    db.processInstance.findMany({
      where: {
        resourceType,
        resourceId: { in: uniqueIds },
      },
      select: {
        resourceId: true,
        submitterName: true,
      },
      orderBy: { startedAt: 'desc' },
    }),
    db.actionLog.findMany({
      where: {
        resource: actionLogResource,
        action: ActionType.CREATE,
        resourceId: { in: uniqueIds },
      },
      select: {
        resourceId: true,
        userName: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  for (const instance of instances) {
    if (!submitterMap.has(instance.resourceId)) {
      submitterMap.set(instance.resourceId, instance.submitterName)
    }
  }

  for (const log of createLogs) {
    if (log.resourceId && !submitterMap.has(log.resourceId)) {
      submitterMap.set(log.resourceId, log.userName)
    }
  }

  return submitterMap
}
