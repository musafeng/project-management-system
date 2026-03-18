'use client'

import { Form, Input, InputNumber, DatePicker, Select } from 'antd'
import type { FormInstance } from 'antd'

export interface FormFieldConfig {
  id: string
  fieldKey: string
  label: string
  componentType: 'input' | 'number' | 'date' | 'select' | 'textarea'
  required: boolean
  optionsJson?: string | null
  sortOrder: number
}

interface DynamicFormProps {
  fields: FormFieldConfig[]
  form: FormInstance
  disabled?: boolean
}

/**
 * 解析 optionsJson，返回 antd Select options 格式
 */
function parseOptions(optionsJson?: string | null): { label: string; value: string }[] {
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

/**
 * 根据 componentType 渲染对应控件
 */
function renderControl(field: FormFieldConfig, disabled?: boolean) {
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

/**
 * DynamicForm - 根据 fields 配置动态渲染表单字段
 * 必须由父组件提供 antd Form 实例（form prop）
 */
export default function DynamicForm({ fields, form: _form, disabled }: DynamicFormProps) {
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
          rules={field.required ? [{ required: true, message: `${field.label}不能为空` }] : []}
        >
          {renderControl(field, disabled)}
        </Form.Item>
      ))}
    </>
  )
}

