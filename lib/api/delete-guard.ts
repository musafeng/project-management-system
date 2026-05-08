import { ForbiddenError } from '@/lib/api/errors'
import { getCurrentUser } from '@/lib/api/auth'
import { isSystemManagerUser } from '@/lib/system-manager'

export async function requireDeletePermission() {
  const user = await getCurrentUser()
  if (!isSystemManagerUser(user)) {
    throw new ForbiddenError('仅系统管理员可删除')
  }
  return user
}
