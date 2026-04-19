/**
 * 区域工作空间与区域隔离公共工具
 */

import { cookies } from 'next/headers'
import { checkAuth, isSystemManager, type AuthenticatedUser } from '@/lib/api/auth'
import { ForbiddenError, NotFoundError } from '@/lib/api/errors'
import { db } from './db'
import { getDbTableColumns } from './db-column-compat'

const REGION_COOKIE = 'current_region_id'
const REGION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60

type DirectRegionModel =
  | 'project'
  | 'projectContract'
  | 'projectContractChange'
  | 'constructionApproval'
  | 'contractReceipt'
  | 'procurementContract'
  | 'procurementPayment'
  | 'laborContract'
  | 'laborPayment'
  | 'subcontractContract'
  | 'subcontractPayment'
  | 'managementExpense'
  | 'otherPayment'
  | 'otherReceipt'
  | 'pettyCash'
  | 'salesExpense'

type ProjectScopedModel =
  | 'projectExpense'

interface RegionLite {
  id: string
  name: string
  code: string | null
  isActive: boolean
}

interface CurrentRegionContext {
  user: AuthenticatedUser
  accessibleRegions: RegionLite[]
  currentRegion: RegionLite
}

const RESOURCE_TYPE_TO_MODEL: Record<string, DirectRegionModel> = {
  projects: 'project',
  'project-contracts': 'projectContract',
  'project-contract-changes': 'projectContractChange',
  'construction-approvals': 'constructionApproval',
  'contract-receipts': 'contractReceipt',
  'procurement-contracts': 'procurementContract',
  'procurement-payments': 'procurementPayment',
  'labor-contracts': 'laborContract',
  'labor-payments': 'laborPayment',
  'subcontract-contracts': 'subcontractContract',
  'subcontract-payments': 'subcontractPayment',
  'management-expenses': 'managementExpense',
  'other-payments': 'otherPayment',
  'other-receipts': 'otherReceipt',
  'petty-cashes': 'pettyCash',
  'sales-expenses': 'salesExpense',
}

const RESOURCE_TYPE_TO_PROJECT_MODEL: Record<string, ProjectScopedModel> = {
  'project-expenses': 'projectExpense',
}

const DIRECT_MODEL_TABLE_MAP: Record<DirectRegionModel, string> = {
  project: 'Project',
  projectContract: 'ProjectContract',
  projectContractChange: 'ProjectContractChange',
  constructionApproval: 'ConstructionApproval',
  contractReceipt: 'ContractReceipt',
  procurementContract: 'ProcurementContract',
  procurementPayment: 'ProcurementPayment',
  laborContract: 'LaborContract',
  laborPayment: 'LaborPayment',
  subcontractContract: 'SubcontractContract',
  subcontractPayment: 'SubcontractPayment',
  managementExpense: 'ManagementExpense',
  otherPayment: 'OtherPayment',
  otherReceipt: 'OtherReceipt',
  pettyCash: 'PettyCash',
  salesExpense: 'SalesExpense',
}

const PROJECT_SCOPED_MODEL_TABLE_MAP: Record<ProjectScopedModel, string> = {
  projectExpense: 'ProjectExpense',
}

async function getDefaultRegion(): Promise<RegionLite | null> {
  const defaultRegion = await db.region.findFirst({
    where: { code: 'DEFAULT', isActive: true },
    select: { id: true, name: true, code: true, isActive: true },
  })
  if (defaultRegion) return defaultRegion

  return db.region.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, code: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
}

async function getCurrentAuthUser(): Promise<AuthenticatedUser | null> {
  return checkAuth()
}

export async function getAccessibleRegions(
  user?: AuthenticatedUser | null
): Promise<RegionLite[]> {
  const authUser = user ?? (await getCurrentAuthUser())

  if (!authUser) {
    return []
  }

  if (authUser && isSystemManager(authUser)) {
    return db.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, isActive: true },
      orderBy: [{ code: 'asc' }, { createdAt: 'asc' }],
    })
  }

  const fallbackRegion = await getDefaultRegion()
  return fallbackRegion ? [fallbackRegion] : []
}

export async function getAccessibleRegionIds(
  user?: AuthenticatedUser | null
): Promise<string[]> {
  const regions = await getAccessibleRegions(user)
  return regions.map((region) => region.id)
}

export async function resolveCurrentRegionContext(
  user?: AuthenticatedUser | null
): Promise<CurrentRegionContext | null> {
  const authUser = user ?? (await getCurrentAuthUser())
  if (!authUser) return null

  const accessibleRegions = await getAccessibleRegions(authUser)
  if (accessibleRegions.length === 0) return null

  const cookieStore = await cookies()
  const cookieRegionId = cookieStore.get(REGION_COOKIE)?.value
  const currentRegion =
    accessibleRegions.find((region) => region.id === cookieRegionId) ?? accessibleRegions[0]

  return {
    user: authUser,
    accessibleRegions,
    currentRegion,
  }
}

/**
 * 获取当前区域 ID（服务端）
 * 规则：
 * 1. 管理员可在自己有权访问的激活区域之间切换
 * 2. 普通用户固定落到默认区域（当前系统暂无用户-区域授权关系）
 */
export async function getCurrentRegionId(): Promise<string | null> {
  const context = await resolveCurrentRegionContext()
  return context?.currentRegion.id ?? null
}

export async function requireCurrentRegionId(): Promise<string> {
  const regionId = await getCurrentRegionId()
  if (!regionId) {
    throw new ForbiddenError('当前用户没有可访问的区域')
  }
  return regionId
}

export async function assertRegionAccessible(
  regionId: string,
  user?: AuthenticatedUser | null
): Promise<RegionLite> {
  const accessibleRegions = await getAccessibleRegions(user)
  const targetRegion = accessibleRegions.find((region) => region.id === regionId)

  if (!targetRegion) {
    throw new ForbiddenError('无权限切换到该区域')
  }

  return targetRegion
}

export async function resolveRequestedRegionId(
  requestedRegionId?: string | null,
  user?: AuthenticatedUser | null
): Promise<string> {
  if (requestedRegionId) {
    const region = await assertRegionAccessible(requestedRegionId, user)
    return region.id
  }

  const context = await resolveCurrentRegionContext(user)
  if (!context) {
    throw new ForbiddenError('当前用户没有可访问的区域')
  }

  return context.currentRegion.id
}

export async function setCurrentRegionId(regionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(REGION_COOKIE, regionId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REGION_COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function assertProjectInCurrentRegion(projectId: string) {
  const regionId = await requireCurrentRegionId()
  const project = await db.project.findFirst({
    where: { id: projectId, regionId },
  })
  if (!project) {
    throw new NotFoundError('项目不存在或不属于当前区域')
  }
  return project
}

export async function assertProjectContractInCurrentRegion(contractId: string) {
  const regionId = await requireCurrentRegionId()
  const contract = await db.projectContract.findFirst({
    where: { id: contractId, regionId },
  })
  if (!contract) {
    throw new NotFoundError('合同不存在或不属于当前区域')
  }
  return contract
}

export async function assertConstructionApprovalInCurrentRegion(constructionId: string) {
  const regionId = await requireCurrentRegionId()
  const approval = await db.constructionApproval.findFirst({
    where: { id: constructionId, regionId },
  })
  if (!approval) {
    throw new NotFoundError('施工立项不存在或不属于当前区域')
  }
  return approval
}

export async function assertProcurementContractInCurrentRegion(contractId: string) {
  const regionId = await requireCurrentRegionId()
  const contract = await db.procurementContract.findFirst({
    where: { id: contractId, regionId },
  })
  if (!contract) {
    throw new NotFoundError('采购合同不存在或不属于当前区域')
  }
  return contract
}

export async function assertLaborContractInCurrentRegion(contractId: string) {
  const regionId = await requireCurrentRegionId()
  const contract = await db.laborContract.findFirst({
    where: { id: contractId, regionId },
  })
  if (!contract) {
    throw new NotFoundError('劳务合同不存在或不属于当前区域')
  }
  return contract
}

export async function assertSubcontractContractInCurrentRegion(contractId: string) {
  const regionId = await requireCurrentRegionId()
  const columns = await getDbTableColumns('SubcontractContract')
  const select = Object.fromEntries(Array.from(columns).map((column) => [column, true]))
  const contract = await db.subcontractContract.findFirst({
    where: columns.has('regionId') ? { id: contractId, regionId } : { id: contractId },
    select,
  })
  if (!contract) {
    throw new NotFoundError('分包合同不存在或不属于当前区域')
  }
  return contract
}

export async function assertDirectRecordInCurrentRegion(
  model: DirectRegionModel,
  id: string
) {
  const regionId = await requireCurrentRegionId()
  const columns = await getDbTableColumns(DIRECT_MODEL_TABLE_MAP[model])
  const select = Object.fromEntries(Array.from(columns).map((column) => [column, true]))
  const record = await (db[model] as any).findFirst({
    where: columns.has('regionId') ? { id, regionId } : { id },
    select,
  })
  if (!record) {
    throw new NotFoundError('记录不存在或不属于当前区域')
  }
  return record
}

export async function assertProjectScopedRecordInCurrentRegion(
  model: ProjectScopedModel,
  id: string
) {
  const regionId = await requireCurrentRegionId()
  const columns = await getDbTableColumns(PROJECT_SCOPED_MODEL_TABLE_MAP[model])
  const select = Object.fromEntries(Array.from(columns).map((column) => [column, true]))
  const record = await (db[model] as any).findFirst({
    where: {
      id,
      Project: { regionId },
    },
    select,
  })
  if (!record) {
    throw new NotFoundError('记录不存在或不属于当前区域')
  }
  return record
}

export function buildProjectRelationRegionWhere(regionId: string, projectId?: string) {
  const projectWhere: Record<string, unknown> = { regionId }
  if (projectId) {
    projectWhere.id = projectId
  }
  return { Project: projectWhere }
}

export async function assertResourceInCurrentRegion(resourceType: string, resourceId: string) {
  const model = RESOURCE_TYPE_TO_MODEL[resourceType]
  if (model) {
    return assertDirectRecordInCurrentRegion(model, resourceId)
  }

  const projectScopedModel = RESOURCE_TYPE_TO_PROJECT_MODEL[resourceType]
  if (projectScopedModel) {
    return assertProjectScopedRecordInCurrentRegion(projectScopedModel, resourceId)
  }

  throw new NotFoundError('不支持的流程资源类型')
}

export async function filterResourceItemsByCurrentRegion<
  T extends { resourceType: string; resourceId: string }
>(items: T[]): Promise<T[]> {
  const regionId = await getCurrentRegionId()
  if (!regionId) return []

  const cache = new Map<string, boolean>()

  const results = await Promise.all(
    items.map(async (item) => {
      const key = `${item.resourceType}:${item.resourceId}`
      if (cache.has(key)) {
        return cache.get(key) ? item : null
      }

      try {
        await assertResourceInCurrentRegion(item.resourceType, item.resourceId)
        cache.set(key, true)
        return item
      } catch {
        cache.set(key, false)
        return null
      }
    })
  )

  return results.filter(Boolean) as T[]
}
