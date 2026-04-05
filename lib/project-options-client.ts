import { requestApi } from './client-api'

export interface ProjectOption {
  label: string
  value: string
}

type ProjectRecord = {
  id: string
  name?: string | null
}

export async function loadProjectOptions(): Promise<
  | { status: 'ready'; options: ProjectOption[]; message: string }
  | { status: 'empty' | 'error'; options: ProjectOption[]; message: string }
> {
  const result = await requestApi<ProjectRecord[]>(
    '/api/projects',
    undefined,
    '加载项目选项失败'
  )

  if (!result.success) {
    return {
      status: 'error',
      options: [],
      message: `${result.error}，项目字段可暂时留空`,
    }
  }

  const options = Array.isArray(result.data)
    ? result.data.map((project) => ({
        label: project.name || project.id,
        value: project.id,
      }))
    : []

  if (options.length === 0) {
    return {
      status: 'empty',
      options: [],
      message: '当前暂无可选项目，项目字段可留空',
    }
  }

  return {
    status: 'ready',
    options,
    message: '',
  }
}

export function ensureProjectOption(
  options: ProjectOption[],
  projectId?: string | null,
  projectName?: string | null
): ProjectOption[] {
  if (!projectId) return options

  const existingOption = options.find((option) => option.value === projectId)
  if (existingOption) {
    if (projectName && existingOption.label !== projectName) {
      return options.map((option) =>
        option.value === projectId
          ? {
              ...option,
              label: projectName,
            }
          : option
      )
    }

    return options
  }

  return [
    {
      label: projectName || projectId,
      value: projectId,
    },
    ...options,
  ]
}
