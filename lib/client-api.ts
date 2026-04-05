type ApiResponseBody<T = unknown> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

async function parseJsonSafely<T>(response: Response): Promise<ApiResponseBody<T> | null> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as ApiResponseBody<T>
  } catch {
    return null
  }
}

function extractErrorMessage(body: ApiResponseBody<unknown> | null, fallbackMessage: string): string {
  if (!body || typeof body !== 'object') {
    return fallbackMessage
  }

  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error
  }

  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message
  }

  if (body.data && typeof body.data === 'object') {
    const data = body.data as { error?: unknown; message?: unknown }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message
    }
  }

  return fallbackMessage
}

export async function requestApi<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackMessage: string
): Promise<{ success: true; data: T; raw: Response } | { success: false; error: string; raw?: Response }> {
  try {
    const method = (init?.method || 'GET').toUpperCase()
    const requestInit =
      method === 'GET' && !init?.cache
        ? { ...init, cache: 'no-store' as RequestCache }
        : init

    const response = await fetch(input, requestInit)
    const body = await parseJsonSafely<T>(response)

    if (response.ok && body?.success !== false) {
      return {
        success: true,
        data: (body?.data ?? body) as T,
        raw: response,
      }
    }

    const error = extractErrorMessage(body, fallbackMessage)

    return { success: false, error, raw: response }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || fallbackMessage,
    }
  }
}

export async function requestAction(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackMessage: string
): Promise<{ success: true; raw?: Response } | { success: false; error: string; raw?: Response }> {
  const result = await requestApi<unknown>(input, init, fallbackMessage)

  if (!result.success) {
    return result
  }

  return {
    success: true,
    raw: result.raw,
  }
}
