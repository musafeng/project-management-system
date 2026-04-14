import { toChineseErrorMessage } from '@/lib/api/error-message'

export interface ClientApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  status: number
  unauthorized: boolean
  [key: string]: unknown
}

interface RequestApiOptions extends RequestInit {
  fallbackError?: string
}

export async function safeJsonParse(response: Response): Promise<unknown | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function hasChineseText(value: string) {
  return /[\u4e00-\u9fa5]/.test(value)
}

function resolveApiErrorMessage(payload: unknown, status: number, fallbackError: string) {
  const rawError =
    payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).error === 'string'
      ? String((payload as Record<string, unknown>).error)
      : ''

  if (status === 401 || rawError.includes('未登录') || rawError.includes('登录已失效')) {
    return '未登录或登录已失效，请重新登录'
  }

  if (status === 403 || rawError.includes('无权限')) {
    return '无权限执行此操作'
  }

  if (status === 404) {
    return rawError ? toChineseErrorMessage(rawError) : '请求的数据不存在或已被删除'
  }

  const translated = toChineseErrorMessage(rawError)
  return hasChineseText(translated) ? translated : fallbackError
}

function resolveThrownErrorMessage(error: unknown, fallbackError: string) {
  const rawMessage = error instanceof Error ? error.message : ''
  const translated = toChineseErrorMessage(rawMessage)
  return hasChineseText(translated) ? translated : fallbackError
}

export async function requestApi<T = unknown>(
  input: RequestInfo | URL,
  options: RequestApiOptions = {}
): Promise<ClientApiResponse<T>> {
  const { fallbackError = '操作失败，请稍后重试', ...init } = options

  try {
    const response = await fetch(input, init)
    const payload = await safeJsonParse(response)
    const unauthorized = response.status === 401

    if (payload && typeof payload === 'object' && 'success' in payload) {
      const result = payload as Record<string, unknown>
      if (Boolean(result.success)) {
        return {
          ...(result as ClientApiResponse<T>),
          success: true,
          status: response.status,
          unauthorized,
        }
      }

      return {
        ...(result as ClientApiResponse<T>),
        success: false,
        error: resolveApiErrorMessage(payload, response.status, fallbackError),
        status: response.status,
        unauthorized,
      }
    }

    if (response.ok) {
      return {
        success: true,
        data: payload as T,
        status: response.status,
        unauthorized,
      }
    }

    return {
      success: false,
      error: resolveApiErrorMessage(payload, response.status, fallbackError),
      status: response.status,
      unauthorized,
    }
  } catch (error) {
    return {
      success: false,
      error: resolveThrownErrorMessage(error, fallbackError),
      status: 0,
      unauthorized: false,
    }
  }
}
