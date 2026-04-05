import { requestApi } from './client-api'

type FormFieldConfig = {
  id: string
  fieldKey: string
  label: string
  componentType: 'input' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'cascadeSelect'
  required: boolean
  optionsJson?: string | null
  sortOrder: number
  linkedTable?: string | null
  linkedLabelField?: string | null
  linkedValueField?: string | null
}

type FormDefinitionResponse = {
  fields?: FormFieldConfig[]
}

export async function loadFormFields(code: string): Promise<
  | { status: 'ready'; fields: FormFieldConfig[]; message: string }
  | { status: 'empty' | 'error'; fields: FormFieldConfig[]; message: string }
> {
  const result = await requestApi<FormDefinitionResponse[]>(
    `/api/form-definitions?code=${encodeURIComponent(code)}`,
    undefined,
    '加载表单配置失败'
  )

  if (!result.success) {
    return {
      status: 'error',
      fields: [],
      message: result.error,
    }
  }

  const form = Array.isArray(result.data) ? result.data[0] : undefined
  const fields = Array.isArray(form?.fields) ? form.fields : []

  if (fields.length === 0) {
    return {
      status: 'empty',
      fields: [],
      message: '表单配置缺失或暂无可用字段',
    }
  }

  return {
    status: 'ready',
    fields,
    message: '',
  }
}
