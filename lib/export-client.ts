import { requestApi } from './client-api'

export async function downloadExportFile(url: string, filename: string, fallbackMessage: string) {
  const response = await fetch(url)

  if (!response.ok) {
    const result = await requestApi(url, undefined, fallbackMessage)
    throw new Error(result.success ? fallbackMessage : result.error)
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(downloadUrl)
}
