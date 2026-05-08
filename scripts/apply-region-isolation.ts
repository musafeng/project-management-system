import { PrismaClient } from '@prisma/client'
import { parseOtherPaymentRemark, serializeOtherPaymentRemark } from '../lib/other-payment-supplier'

const prisma = new PrismaClient()

type RegionLite = {
  id: string
  name: string
  code: string | null
}

type MasterTable = 'Customer' | 'Supplier' | 'LaborWorker' | 'SubcontractVendor'

const SCHEMA_SQL = [
  'ALTER TABLE "ProjectContractChange" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "OtherReceipt" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "OtherPayment" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "ManagementExpense" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "SalesExpense" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "PettyCash" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "LaborWorker" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'ALTER TABLE "SubcontractVendor" ADD COLUMN IF NOT EXISTS "regionId" TEXT',
  'CREATE INDEX IF NOT EXISTS "ProjectContractChange_regionId_idx" ON "ProjectContractChange" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "OtherReceipt_regionId_idx" ON "OtherReceipt" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "OtherPayment_regionId_idx" ON "OtherPayment" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "ManagementExpense_regionId_idx" ON "ManagementExpense" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "SalesExpense_regionId_idx" ON "SalesExpense" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "PettyCash_regionId_idx" ON "PettyCash" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "Customer_regionId_idx" ON "Customer" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "Supplier_regionId_idx" ON "Supplier" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "LaborWorker_regionId_idx" ON "LaborWorker" ("regionId")',
  'CREATE INDEX IF NOT EXISTS "SubcontractVendor_regionId_idx" ON "SubcontractVendor" ("regionId")',
]

const FK_SQL = [
  ['ProjectContractChange_regionId_fkey', 'ProjectContractChange'],
  ['OtherReceipt_regionId_fkey', 'OtherReceipt'],
  ['OtherPayment_regionId_fkey', 'OtherPayment'],
  ['ManagementExpense_regionId_fkey', 'ManagementExpense'],
  ['SalesExpense_regionId_fkey', 'SalesExpense'],
  ['PettyCash_regionId_fkey', 'PettyCash'],
  ['Customer_regionId_fkey', 'Customer'],
  ['Supplier_regionId_fkey', 'Supplier'],
  ['LaborWorker_regionId_fkey', 'LaborWorker'],
  ['SubcontractVendor_regionId_fkey', 'SubcontractVendor'],
] as const

function log(step: string) {
  console.log(`[region-isolation] ${step}`)
}

async function ensureSchema() {
  for (const sql of SCHEMA_SQL) {
    await prisma.$executeRawUnsafe(sql)
  }

  for (const [constraintName, tableName] of FK_SQL) {
    await prisma.$executeRawUnsafe(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'
        ) THEN
          ALTER TABLE "${tableName}"
            ADD CONSTRAINT "${constraintName}"
            FOREIGN KEY ("regionId") REFERENCES "Region"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
      `
    )
  }
}

async function getRegions() {
  const regions = await prisma.region.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: [{ code: 'asc' }, { createdAt: 'asc' }],
  })
  if (regions.length === 0) {
    throw new Error('未找到可用区域，无法执行区域隔离迁移')
  }
  return regions
}

async function getDefaultRegion(regions: RegionLite[]) {
  return regions.find((region) => region.code === 'DEFAULT') ?? regions[0]
}

async function backfillCoreRegionIds(defaultRegionId: string) {
  const updates = [
    `
      UPDATE "Project"
      SET "regionId" = COALESCE("regionId", '${defaultRegionId}')
      WHERE "regionId" IS NULL
    `,
    `
      UPDATE "ProjectContract" pc
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE pc."projectId" = p.id
        AND (pc."regionId" IS NULL OR pc."regionId" <> p."regionId")
    `,
    `
      UPDATE "ConstructionApproval" ca
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE ca."projectId" = p.id
        AND (ca."regionId" IS NULL OR ca."regionId" <> p."regionId")
    `,
    `
      UPDATE "ContractReceipt" cr
      SET "regionId" = pc."regionId"
      FROM "ProjectContract" pc
      WHERE cr."contractId" = pc.id
        AND (cr."regionId" IS NULL OR cr."regionId" <> pc."regionId")
    `,
    `
      UPDATE "ProcurementContract" pc
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE pc."projectId" = p.id
        AND (pc."regionId" IS NULL OR pc."regionId" <> p."regionId")
    `,
    `
      UPDATE "ProcurementPayment" pp
      SET "regionId" = pc."regionId"
      FROM "ProcurementContract" pc
      WHERE pp."contractId" = pc.id
        AND (pp."regionId" IS NULL OR pp."regionId" <> pc."regionId")
    `,
    `
      UPDATE "LaborContract" lc
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE lc."projectId" = p.id
        AND (lc."regionId" IS NULL OR lc."regionId" <> p."regionId")
    `,
    `
      UPDATE "LaborPayment" lp
      SET "regionId" = lc."regionId"
      FROM "LaborContract" lc
      WHERE lp."contractId" = lc.id
        AND (lp."regionId" IS NULL OR lp."regionId" <> lc."regionId")
    `,
    `
      UPDATE "SubcontractContract" sc
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE sc."projectId" = p.id
        AND (sc."regionId" IS NULL OR sc."regionId" <> p."regionId")
    `,
    `
      UPDATE "SubcontractPayment" sp
      SET "regionId" = sc."regionId"
      FROM "SubcontractContract" sc
      WHERE sp."contractId" = sc.id
        AND (sp."regionId" IS NULL OR sp."regionId" <> sc."regionId")
    `,
    `
      UPDATE "ProjectContractChange" pcc
      SET "regionId" = pc."regionId"
      FROM "ProjectContract" pc
      WHERE pcc."contractId" = pc.id
        AND (pcc."regionId" IS NULL OR pcc."regionId" <> pc."regionId")
    `,
    `
      UPDATE "OtherReceipt" t
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE t."projectId" = p.id
        AND (t."regionId" IS NULL OR t."regionId" <> p."regionId")
    `,
    `
      UPDATE "OtherPayment" t
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE t."projectId" = p.id
        AND (t."regionId" IS NULL OR t."regionId" <> p."regionId")
    `,
    `
      UPDATE "ManagementExpense" t
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE t."projectId" = p.id
        AND (t."regionId" IS NULL OR t."regionId" <> p."regionId")
    `,
    `
      UPDATE "SalesExpense" t
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE t."projectId" = p.id
        AND (t."regionId" IS NULL OR t."regionId" <> p."regionId")
    `,
    `
      UPDATE "PettyCash" t
      SET "regionId" = p."regionId"
      FROM "Project" p
      WHERE t."projectId" = p.id
        AND (t."regionId" IS NULL OR t."regionId" <> p."regionId")
    `,
    `
      UPDATE "OtherReceipt" SET "regionId" = '${defaultRegionId}' WHERE "regionId" IS NULL
    `,
    `
      UPDATE "OtherPayment" SET "regionId" = '${defaultRegionId}' WHERE "regionId" IS NULL
    `,
    `
      UPDATE "ManagementExpense" SET "regionId" = '${defaultRegionId}' WHERE "regionId" IS NULL
    `,
    `
      UPDATE "SalesExpense" SET "regionId" = '${defaultRegionId}' WHERE "regionId" IS NULL
    `,
    `
      UPDATE "PettyCash" SET "regionId" = '${defaultRegionId}' WHERE "regionId" IS NULL
    `,
  ]

  for (const sql of updates) {
    await prisma.$executeRawUnsafe(sql)
  }
}

function deterministicCloneId(sourceId: string, regionId: string) {
  return `${sourceId}__region__${regionId}`
}

function deterministicCloneCode(sourceCode: string, regionId: string) {
  return `${sourceCode}-${regionId.slice(-6)}`
}

async function upsertMasterClone(
  tableName: MasterTable,
  originalId: string,
  regionId: string,
  createData: Record<string, unknown>
) {
  const cloneId = deterministicCloneId(originalId, regionId)
  const exists = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${tableName}" WHERE id = $1`,
    cloneId
  )

  if (exists.length > 0) {
    const entries = Object.entries(createData)
    const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(', ')
    await prisma.$executeRawUnsafe(
      `UPDATE "${tableName}" SET ${assignments} WHERE id = $1`,
      cloneId,
      ...entries.map(([, value]) => value)
    )
    return cloneId
  }

  const dataWithId = { id: cloneId, ...createData }
  const entries = Object.entries(dataWithId)
  const columns = entries.map(([key]) => `"${key}"`).join(', ')
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ')
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`,
    ...entries.map(([, value]) => value)
  )
  return cloneId
}

async function isolateCustomers(defaultRegionId: string) {
  log('开始处理客户区域归属')
  const [customers, projectRows, contractRows] = await Promise.all([
    prisma.customer.findMany(),
    prisma.project.findMany({ select: { id: true, customerId: true, regionId: true } }),
    prisma.projectContract.findMany({ select: { id: true, customerId: true, regionId: true } }),
  ])

  const usage = new Map<string, Set<string>>()
  for (const row of [...projectRows, ...contractRows]) {
    if (!row.customerId || !row.regionId) continue
    if (!usage.has(row.customerId)) usage.set(row.customerId, new Set())
    usage.get(row.customerId)!.add(row.regionId)
  }

  for (const customer of customers) {
    const regionIds = Array.from(usage.get(customer.id) ?? []).sort()
    const primaryRegionId = regionIds[0] ?? customer.regionId ?? defaultRegionId

    await prisma.customer.update({
      where: { id: customer.id },
      data: { regionId: primaryRegionId, updatedAt: new Date() },
    })

    for (const regionId of regionIds.slice(1)) {
      const cloneId = await upsertMasterClone('Customer', customer.id, regionId, {
        code: deterministicCloneCode(customer.code, regionId),
        name: customer.name,
        contact: customer.contact,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        remark: customer.remark,
        createdAt: customer.createdAt,
        bankAccount: customer.bankAccount,
        bankName: customer.bankName,
        status: customer.status,
        taxId: customer.taxId,
        updatedAt: new Date(),
        regionId,
      })

      await prisma.project.updateMany({
        where: { customerId: customer.id, regionId },
        data: { customerId: cloneId },
      })
      await prisma.projectContract.updateMany({
        where: { customerId: customer.id, regionId },
        data: { customerId: cloneId },
      })
    }
  }
}

async function isolateSuppliers(defaultRegionId: string) {
  log('开始处理供应商区域归属')
  const [suppliers, procurementContracts, otherPayments] = await Promise.all([
    prisma.supplier.findMany(),
    prisma.procurementContract.findMany({ select: { id: true, supplierId: true, regionId: true } }),
    prisma.otherPayment.findMany({ select: { id: true, regionId: true, remark: true } }),
  ])

  const usage = new Map<string, Set<string>>()
  for (const row of procurementContracts) {
    if (!row.supplierId || !row.regionId) continue
    if (!usage.has(row.supplierId)) usage.set(row.supplierId, new Set())
    usage.get(row.supplierId)!.add(row.regionId)
  }
  for (const payment of otherPayments) {
    const supplierId = parseOtherPaymentRemark(payment.remark).supplierId
    if (!supplierId || !payment.regionId) continue
    if (!usage.has(supplierId)) usage.set(supplierId, new Set())
    usage.get(supplierId)!.add(payment.regionId)
  }

  for (const supplier of suppliers) {
    const regionIds = Array.from(usage.get(supplier.id) ?? []).sort()
    const primaryRegionId = regionIds[0] ?? supplier.regionId ?? defaultRegionId

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { regionId: primaryRegionId, updatedAt: new Date() },
    })

    for (const regionId of regionIds.slice(1)) {
      const cloneId = await upsertMasterClone('Supplier', supplier.id, regionId, {
        code: deterministicCloneCode(supplier.code, regionId),
        name: supplier.name,
        contact: supplier.contact,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        remark: supplier.remark,
        createdAt: supplier.createdAt,
        bankAccount: supplier.bankAccount,
        bankName: supplier.bankName,
        status: supplier.status,
        taxId: supplier.taxId,
        attachmentUrl: supplier.attachmentUrl,
        updatedAt: new Date(),
        regionId,
      })

      await prisma.procurementContract.updateMany({
        where: { supplierId: supplier.id, regionId },
        data: { supplierId: cloneId },
      })

      const scopedPayments = otherPayments.filter((payment) => payment.regionId === regionId)
      for (const payment of scopedPayments) {
        const parsed = parseOtherPaymentRemark(payment.remark)
        if (parsed.supplierId !== supplier.id) continue
        await prisma.otherPayment.update({
          where: { id: payment.id },
          data: {
            remark: serializeOtherPaymentRemark(parsed.remark, {
              supplierId: cloneId,
              supplierName: parsed.supplierName,
              contact: parsed.contact,
              accountName: parsed.accountName,
              bankAccount: parsed.bankAccount,
              bankName: parsed.bankName,
            }),
          },
        })
      }
    }
  }
}

async function isolateLaborWorkers(defaultRegionId: string) {
  log('开始处理劳务人员区域归属')
  const [workers, laborContracts, laborPayments, subcontractContracts, subcontractPayments] = await Promise.all([
    prisma.laborWorker.findMany(),
    prisma.laborContract.findMany({ select: { id: true, workerId: true, regionId: true } }),
    prisma.laborPayment.findMany({ select: { id: true, workerId: true, regionId: true } }),
    prisma.subcontractContract.findMany({ select: { id: true, workerId: true, regionId: true } }),
    prisma.subcontractPayment.findMany({ select: { id: true, workerId: true, regionId: true } }),
  ])

  const usage = new Map<string, Set<string>>()
  for (const row of [...laborContracts, ...laborPayments, ...subcontractContracts, ...subcontractPayments]) {
    if (!row.workerId || !row.regionId) continue
    if (!usage.has(row.workerId)) usage.set(row.workerId, new Set())
    usage.get(row.workerId)!.add(row.regionId)
  }

  for (const worker of workers) {
    const regionIds = Array.from(usage.get(worker.id) ?? []).sort()
    const primaryRegionId = regionIds[0] ?? worker.regionId ?? defaultRegionId

    await prisma.laborWorker.update({
      where: { id: worker.id },
      data: { regionId: primaryRegionId, updatedAt: new Date() },
    })

    for (const regionId of regionIds.slice(1)) {
      const cloneId = await upsertMasterClone('LaborWorker', worker.id, regionId, {
        code: deterministicCloneCode(worker.code, regionId),
        name: worker.name,
        idNumber: worker.idNumber,
        phone: worker.phone,
        address: worker.address,
        bankAccount: worker.bankAccount,
        bankName: worker.bankName,
        status: worker.status,
        remark: worker.remark,
        createdAt: worker.createdAt,
        updatedAt: new Date(),
        attachmentUrl: worker.attachmentUrl,
        regionId,
      })

      await prisma.laborContract.updateMany({
        where: { workerId: worker.id, regionId },
        data: { workerId: cloneId },
      })
      await prisma.laborPayment.updateMany({
        where: { workerId: worker.id, regionId },
        data: { workerId: cloneId },
      })
      await prisma.subcontractContract.updateMany({
        where: { workerId: worker.id, regionId },
        data: { workerId: cloneId },
      })
      await prisma.subcontractPayment.updateMany({
        where: { workerId: worker.id, regionId },
        data: { workerId: cloneId },
      })
    }
  }
}

async function isolateSubcontractVendors(defaultRegionId: string) {
  log('开始处理分包单位区域归属')
  const [vendors, subcontractContracts, subcontractPayments] = await Promise.all([
    prisma.subcontractVendor.findMany(),
    prisma.subcontractContract.findMany({ select: { id: true, vendorId: true, regionId: true } }),
    prisma.subcontractPayment.findMany({ select: { id: true, vendorId: true, regionId: true } }),
  ])

  const usage = new Map<string, Set<string>>()
  for (const row of [...subcontractContracts, ...subcontractPayments]) {
    if (!row.vendorId || !row.regionId) continue
    if (!usage.has(row.vendorId)) usage.set(row.vendorId, new Set())
    usage.get(row.vendorId)!.add(row.regionId)
  }

  for (const vendor of vendors) {
    const regionIds = Array.from(usage.get(vendor.id) ?? []).sort()
    const primaryRegionId = regionIds[0] ?? vendor.regionId ?? defaultRegionId

    await prisma.subcontractVendor.update({
      where: { id: vendor.id },
      data: { regionId: primaryRegionId, updatedAt: new Date() },
    })

    for (const regionId of regionIds.slice(1)) {
      const cloneId = await upsertMasterClone('SubcontractVendor', vendor.id, regionId, {
        code: deterministicCloneCode(vendor.code, regionId),
        name: vendor.name,
        contact: vendor.contact,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address,
        taxId: vendor.taxId,
        bankAccount: vendor.bankAccount,
        bankName: vendor.bankName,
        status: vendor.status,
        remark: vendor.remark,
        createdAt: vendor.createdAt,
        updatedAt: new Date(),
        regionId,
      })

      await prisma.subcontractContract.updateMany({
        where: { vendorId: vendor.id, regionId },
        data: { vendorId: cloneId },
      })
      await prisma.subcontractPayment.updateMany({
        where: { vendorId: vendor.id, regionId },
        data: { vendorId: cloneId },
      })
    }
  }
}

async function printSummary() {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string; null_count: bigint }>>(`
    SELECT 'ProjectContractChange' AS table_name, COUNT(*)::bigint AS null_count FROM "ProjectContractChange" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'OtherReceipt', COUNT(*)::bigint FROM "OtherReceipt" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'OtherPayment', COUNT(*)::bigint FROM "OtherPayment" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'ManagementExpense', COUNT(*)::bigint FROM "ManagementExpense" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'SalesExpense', COUNT(*)::bigint FROM "SalesExpense" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'PettyCash', COUNT(*)::bigint FROM "PettyCash" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'Customer', COUNT(*)::bigint FROM "Customer" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'Supplier', COUNT(*)::bigint FROM "Supplier" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'LaborWorker', COUNT(*)::bigint FROM "LaborWorker" WHERE "regionId" IS NULL
    UNION ALL
    SELECT 'SubcontractVendor', COUNT(*)::bigint FROM "SubcontractVendor" WHERE "regionId" IS NULL
  `)

  for (const row of rows) {
    log(`${row.table_name} 剩余空 regionId: ${Number(row.null_count)}`)
  }
}

async function main() {
  log('开始执行区域隔离迁移')
  await ensureSchema()

  const regions = await getRegions()
  const defaultRegion = await getDefaultRegion(regions)
  log(`默认归属区域: ${defaultRegion.name} (${defaultRegion.id})`)

  await backfillCoreRegionIds(defaultRegion.id)
  await isolateCustomers(defaultRegion.id)
  await isolateSuppliers(defaultRegion.id)
  await isolateLaborWorkers(defaultRegion.id)
  await isolateSubcontractVendors(defaultRegion.id)
  await printSummary()
  log('区域隔离迁移完成')
}

main()
  .catch((error) => {
    console.error('[region-isolation] 执行失败:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
