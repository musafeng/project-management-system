import { prisma } from './prisma'

interface ColumnMeta {
  column_name: string
  is_nullable: 'YES' | 'NO'
  data_type: string
  udt_name: string
  column_default: string | null
}

const tableMetaCache = new Map<string, Promise<Map<string, ColumnMeta>>>()

function assertIdentifier(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`非法标识符: ${name}`)
  }
}

function quoteIdentifier(name: string) {
  assertIdentifier(name)
  return `"${name}"`
}

async function getTableMeta(tableName: string) {
  if (!tableMetaCache.has(tableName)) {
    tableMetaCache.set(
      tableName,
      prisma.$queryRawUnsafe<ColumnMeta[]>(
        `SELECT column_name, is_nullable, data_type, udt_name, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = '${tableName}'
         ORDER BY ordinal_position`
      ).then((rows) => new Map(rows.map((row) => [row.column_name, row])))
    )
  }

  return tableMetaCache.get(tableName)!
}

function normalizeWriteData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  )
}

export async function insertCompatRecord(
  tableName: string,
  data: Record<string, unknown>
) {
  assertIdentifier(tableName)
  const meta = await getTableMeta(tableName)
  const compatible = normalizeWriteData(
    Object.fromEntries(
      Object.entries(data).filter(([key]) => meta.has(key))
    )
  )
  const entries = Object.entries(compatible)

  if (entries.length === 0) {
    throw new Error(`表 ${tableName} 没有可写入的字段`)
  }

  const columns = entries.map(([key]) => quoteIdentifier(key)).join(', ')
  const placeholders = entries
    .map(([key], index) => {
      const column = meta.get(key)!
      if (column.data_type === 'USER-DEFINED') {
        return `$${index + 1}::${quoteIdentifier(column.udt_name)}`
      }
      return `$${index + 1}`
    })
    .join(', ')
  const values = entries.map(([, value]) => value)

  await prisma.$executeRawUnsafe(
    `INSERT INTO ${quoteIdentifier(tableName)} (${columns}) VALUES (${placeholders})`,
    ...values
  )
}

export async function updateCompatRecord(
  tableName: string,
  id: string,
  data: Record<string, unknown>
) {
  assertIdentifier(tableName)
  const meta = await getTableMeta(tableName)
  const compatible = normalizeWriteData(
    Object.fromEntries(
      Object.entries(data).filter(([key]) => meta.has(key))
    )
  )
  const entries = Object.entries(compatible)

  if (entries.length === 0) {
    return
  }

  const assignments = entries
    .map(([key], index) => {
      const column = meta.get(key)!
      const placeholder =
        column.data_type === 'USER-DEFINED'
          ? `$${index + 1}::${quoteIdentifier(column.udt_name)}`
          : `$${index + 1}`
      return `${quoteIdentifier(key)} = ${placeholder}`
    })
    .join(', ')
  const values = entries.map(([, value]) => value)

  await prisma.$executeRawUnsafe(
    `UPDATE ${quoteIdentifier(tableName)} SET ${assignments} WHERE "id" = $${entries.length + 1}`,
    ...values,
    id
  )
}

export async function deleteCompatRecord(tableName: string, id: string) {
  assertIdentifier(tableName)
  await prisma.$executeRawUnsafe(
    `DELETE FROM ${quoteIdentifier(tableName)} WHERE "id" = $1`,
    id
  )
}
