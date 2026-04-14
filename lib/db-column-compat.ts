import { prisma } from '@/lib/prisma'

const tableColumnsCache = new Map<string, Promise<Set<string>>>()

type RecordLike = Record<string, unknown>

export function pickExistingDbFieldsFromColumns<T extends RecordLike>(
  columns: Iterable<string>,
  data: T
): Partial<T> {
  const available = new Set(columns)
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => available.has(key))
  ) as Partial<T>
}

export async function getDbTableColumns(tableName: string): Promise<Set<string>> {
  if (!tableColumnsCache.has(tableName)) {
    tableColumnsCache.set(
      tableName,
      prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}'`
      ).then((rows: Array<{ column_name: string }>) => new Set(rows.map((row: { column_name: string }) => row.column_name)))
    )
  }

  return tableColumnsCache.get(tableName)!
}

export async function hasDbColumn(tableName: string, columnName: string) {
  const columns = await getDbTableColumns(tableName)
  return columns.has(columnName)
}

export async function pickExistingDbFields<T extends RecordLike>(tableName: string, data: T): Promise<Partial<T>> {
  const columns = await getDbTableColumns(tableName)
  return pickExistingDbFieldsFromColumns(columns, data)
}
