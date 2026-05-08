import type { AuthUser } from '@/lib/auth-client'
import type { AuthenticatedUser } from '@/lib/api/auth'
import { clientEnv, serverEnv } from '@/lib/env'

type MaybeUser = Pick<AuthUser, 'userid' | 'systemRole'> | Pick<AuthenticatedUser, 'userid' | 'systemRole'> | null | undefined

export function isSystemManagerUser(user: MaybeUser) {
  if (!user) return false
  if (user.systemRole === 'ADMIN') return true
  return Boolean(user.userid) && serverEnv.systemManagerIds.includes(user.userid)
}

export function isSystemManagerClientUser(user: MaybeUser) {
  if (!user) return false
  if (user.systemRole === 'ADMIN') return true
  return Boolean(user.userid) && clientEnv.systemManagerIds.includes(user.userid)
}
