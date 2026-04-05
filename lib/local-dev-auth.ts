import { SystemUserRole } from '@prisma/client'
import { db } from '@/lib/db'
import { setAuthCookie } from '@/lib/auth'

const DEFAULT_DEV_USER_ID = 'local-dev-admin'
const DEFAULT_DEV_USER_NAME = '本地开发管理员'

function getDevRole(): SystemUserRole {
  const rawRole = process.env.DEV_AUTH_ROLE
  if (rawRole && Object.values(SystemUserRole).includes(rawRole as SystemUserRole)) {
    return rawRole as SystemUserRole
  }
  return SystemUserRole.ADMIN
}

export function isLocalDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

async function getOrCreateLocalDevSystemUser() {
  const preferredUserId = process.env.DEV_AUTH_DING_USER_ID?.trim() || DEFAULT_DEV_USER_ID
  const preferredName = process.env.DEV_AUTH_USER_NAME?.trim() || DEFAULT_DEV_USER_NAME
  const preferredRole = getDevRole()

  const existingPreferredUser = await db.systemUser.findUnique({
    where: { dingUserId: preferredUserId },
  })

  if (existingPreferredUser) {
    return existingPreferredUser
  }

  const existingActiveUser = await db.systemUser.findFirst({
    where: { isActive: true },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  if (existingActiveUser) {
    return existingActiveUser
  }

  return db.systemUser.create({
    data: {
      dingUserId: preferredUserId,
      name: preferredName,
      role: preferredRole,
      isActive: true,
      deptIdsJson: JSON.stringify([]),
      deptNamesJson: JSON.stringify(['本地开发']),
      remark: 'Codex 自动创建的本地开发登录用户',
      lastLoginAt: new Date(),
    },
  })
}

export async function ensureLocalDevAuth() {
  if (!isLocalDevAuthEnabled()) {
    return null
  }

  const user = await getOrCreateLocalDevSystemUser()

  if (!user.isActive) {
    await db.systemUser.update({
      where: { id: user.id },
      data: { isActive: true, lastLoginAt: new Date() },
    })
  } else {
    await db.systemUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
  }

  await setAuthCookie({
    userid: user.dingUserId,
    name: user.name,
    mobile: user.mobile || undefined,
    unionid: user.unionid || undefined,
    deptIds: user.deptIdsJson ? (JSON.parse(user.deptIdsJson) as number[]) : [],
  })

  return {
    userid: user.dingUserId,
    name: user.name,
    mobile: user.mobile || undefined,
    unionid: user.unionid || undefined,
    deptIds: user.deptIdsJson ? (JSON.parse(user.deptIdsJson) as number[]) : [],
    deptNames: user.deptNamesJson ? (JSON.parse(user.deptNamesJson) as string[]) : [],
    systemRole: user.role,
    isActive: true,
  }
}
