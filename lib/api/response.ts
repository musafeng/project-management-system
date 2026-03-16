/**
 * 统一 API 返回格式
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 成功返回
 */
export function success<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  }
}

/**
 * 失败返回
 */
export function error(message: string): ApiResponse {
  return {
    success: false,
    error: message,
  }
}


