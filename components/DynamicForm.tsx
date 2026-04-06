'use client'

import { useEffect, useMemo, useState } from 'react'
import { Form, Input, InputNumber, DatePicker, Select } from 'antd'
import type { FormInstance } from 'antd'
import type { Rule } from 'antd/es/form'
import { getLowRiskFieldRule, type LowRiskFormCode, validateScopedFieldValue } from '@/lib/low-risk-form-validation'
import AttachmentField from '@/components/AttachmentField'

interface SelectOption {
  label: string
  value: string
}

export interface FormFieldConfig {
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

interface DynamicFormProps {
  fields: FormFieldConfig[]
  form: FormInstance
  disabled?: boolean
  onLoadOptions?: (table: string, field?: FormFieldConfig) => Promise<SelectOption[]>
  validationScope?: LowRiskFormCode
}

function parseOptions(optionsJson?: string | null): SelectOption[] {
  if (!optionsJson) return []
  try {
    const parsed = JSON.parse(optionsJson)
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        if (typeof item === 'string') return { label: item, value: item }
        return { label: item.label ?? item.value, value: item.value }
      })
    }
    return []
  } catch {
    return []
  }
}

function renderControl(
  field: FormFieldConfig,
  disabled: boolean | undefined,
  cascadeOptions: Record<string, SelectOption[]>
) {
  switch (field.componentType) {
    case 'input':
      return <Input placeholder={`请输入${field.label}`} disabled={disabled} />
    case 'number':
      return (
        <InputNumber
          placeholder={`请输入${field.label}`}
          style={{ width: '100%' }}
          precision={2}
          disabled={disabled}
        />
      )
    case 'date':
      return <DatePicker style={{ width: '100%' }} disabled={disabled} />
    case 'select':
      return (
        <Select
          placeholder={`请选择${field.label}`}
          options={parseOptions(field.optionsJson)}
          disabled={disabled}
          allowClear
        />
      )
    case 'cascadeSelect':
      return (
        <Select
          placeholder={`请选择${field.label}`}
          options={cascadeOptions[field.fieldKey] || []}
          disabled={disabled}
          allowClear
        />
      )
    case 'file':
      return <AttachmentField disabled={disabled} />
    case 'textarea':
      return (
        <Input.TextArea
          placeholder={`请输入${field.label}`}
          rows={3}
          disabled={disabled}
        />
      )
    default:
      return <Input placeholder={`请输入${field.label}`} disabled={disabled} />
  }
}

function getFieldRules(field: FormFieldConfig, validationScope?: LowRiskFormCode): Rule[] {
  const scopedRule = validationScope ? getLowRiskFieldRule(validationScope, field.fieldKey) : undefined

  if (scopedRule?.required === false) {
    return []
  }

  if (!scopedRule && !field.required) {
    return []
  }

  return [{
    validator: async (_rule, value) => {
      const fallbackMessage = `${field.label}不能为空`
      const error = validateScopedFieldValue(scopedRule ?? { required: true }, value, fallbackMessage)
      if (error) {
        throw new Error(error)
      }
    },
  }]
}

export default function DynamicForm({ fields, form: _form, disabled, onLoadOptions, validationScope }: DynamicFormProps) {
  const [cascadeOptions, setCascadeOptions] = useState<Record<string, SelectOption[]>>({})

  useEffect(() => {
    let cancelled = false

    async function loadCascadeOptions() {
      if (!onLoadOptions || !fields?.length) return
      const cascadeFields = fields.filter((f) => f.componentType === 'cascadeSelect' && f.linkedTable)
      if (cascadeFields.length === 0) return

      const entries = await Promise.all(
        cascadeFields.map(async (field) => {
          const table = field.linkedTable as string
          const opts = await onLoadOptions(table, field)
          return [field.fieldKey, opts] as const
        })
      )

      if (!cancelled) {
        setCascadeOptions(Object.fromEntries(entries))
      }
    }

    loadCascadeOptions()
    return () => {
      cancelled = true
    }
  }, [fields, onLoadOptions])

  if (!fields || fields.length === 0) {
    return <div style={{ color: '#999', padding: '8px 0' }}>暂无配置字段</div>
  }

  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      {sorted.map((field) => (
        <Form.Item
          key={field.id}
          label={field.label}
          name={['formData', field.fieldKey]}
          rules={getFieldRules(field, validationScope)}
        >
          {renderControl(field, disabled, cascadeOptions)}
        </Form.Item>
      ))}
    </>
  )
}
