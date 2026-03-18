/**
 * API 基础层统一导出
 */

export { apiHandler, apiHandlerWithMethod } from './handler'
export { apiHandlerWithPermission, apiHandlerWithAuth, apiHandlerWithoutPermission } from './handler-with-permission'
export type { PermissionOptions } from './handler-with-permission'
export { apiHandlerWithPermissionAndLog } from './handler-with-log'
export type { PermissionAndLogOptions } from './handler-with-log'
export { success, error } from './response'
export {
  ApiError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from './errors'
export type { ApiResponse } from './response'
export { getCurrentUser, checkAuth, requireAuth, requireRole, requireAdmin, requireSystemManager, isSystemManager } from './auth'
export type { AuthenticatedUser } from './auth'
export { canAccessApi, getRolePermissionDescription } from './permissions'
export type { ApiPermissionRule } from './permissions'

