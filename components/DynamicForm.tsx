'use client'

import { useEffect, useState, useCallback } from 'react'
import { Form, Input, InputNumber, DatePicker, Select, Button, Table, Upload, Space } from 'antd'
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'

export interface FormFieldConfig {
  id: string
  fieldKey: string
  label: string
  componentType: 'input' | 'number' | 'date' | 'select' | 'textarea' | 'table' | 'file' | 'cascadeSelect'
  required: boolean
  optionsJson?: string | null
  sortOrder: number
  dependsOn?: string | null
  dependsValue?: string | null
  computeFormula?: string | null
  linkedTable?: string | null
  linkedLabelField?: string | null
  linkedValueField?: string | null
  linkedCopyFields?: string | null
  placeholder?: string | null
  isReadonly?: boolean
  tableColumnsJson?: string | null
}

interface DynamicFormProps {
  fields: FormFieldConfig[]
  form: FormInstance
  disabled?: boolean
  /** 级联选择器加载远端选项的函数 */
  onLoadOptions?: (table: string) => Promise<{ label: string; value: string; raw?: any }[]>
  /** 级联选择后自动带出字段的回调 */
  onCascadeSelect?: (field: FormFieldConfig, selectedId: string, raw: any) => void
}

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

function parseTableColumns(tableColumnsJson?: string | null) {
  if (!tableColumnsJson) return []
  try {
    return JSON.parse(tableColumnsJson) as Array<{
      key: string
      label: string
      componentType: string
      options?: string[]
    }>
  } catch {
    return []
  }
}

/** 多行表格字段组件 */
function TableField({ field, disabled }: { field: FormFieldConfig; disabled?: boolean }) {
  const cols = parseTableColumns(field.tableColumnsJson)
  const form = Form.useFormInstance()

  return (
    <Form.List name={['formData', field.fieldKey]}>
      {(subFields, { add, remove }) => (
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
          {subFields.map((subField) => (
            <Space key={subField.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              {cols.map((col) => (
                <Form.Item
                  key={col.key}
                  name={[subField.name, col.key]}
                  label={col.label}
                  style={{ marginBottom: 0, minWidth: 120 }}
                >
                  {col.componentType === 'select' ? (
                    <Select
                      placeholder={`选择${col.label}`}
                      options={(col.options || []).map((o: string) => ({ label: o, value: o }))}
                      style={{ minWidth: 120 }}
                      disabled={disabled}
                    />
                  ) : col.componentType === 'number' ? (
                    <InputNumber placeholder={col.label} precision={2} style={{ minWidth: 100 }} disabled={disabled} />
                  ) : (
                    <Input placeholder={col.label} disabled={disabled} />
                  )}
                </Form.Item>
              ))}
              {!disabled && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(subField.name)}
                />
              )}
            </Space>
          ))}
          {!disabled && (
            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">
              添加明细
            </Button>
          )}
        </div>
      )}
    </Form.List>
  )
}

/** 级联选择组件（异步加载远端选项） */
function CascadeSelectField({
  field,
  disabled,
  onLoadOptions,
  onCascadeSelect,
}: {
  field: FormFieldConfig
  disabled?: boolean
  onLoadOptions?: DynamicFormProps['onLoadOptions']
  onCascadeSelect?: DynamicFormProps['onCascadeSelect']
}) {
  const [options, setOptions] = useState<{ label: string; value: string; raw?: any }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!field.linkedTable || !onLoadOptions) return
    setLoading(true)
    onLoadOptions(field.linkedTable)
      .then(setOptions)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.linkedTable])

  const handleChange = (value: string) => {
    if (!onCascadeSelect) return
    const raw = options.find((o) => o.value === value)?.raw
    if (raw) onCascadeSelect(field, value, raw)
  }

  return (
    <Select
      showSearch
      optionFilterProp="label"
      placeholder={field.placeholder || `请选择${field.label}`}
      options={options}
      loading={loading}
      disabled={disabled}
      allowClear
      onChange={handleChange}
    />
  )
}

/** 文件上传字段（对接阿里云 OSS） */
function FileField({ field, disabled }: { field: FormFieldConfig; disabled?: boolean }) {
  const form = Form.useFormInstance()
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState<string>('')

  // 初始化时读取已有值显示文件名
  const currentUrl: string = form.getFieldValue(['formData', field.fieldKey]) || ''
  useEffect(() => {
    if (currentUrl && !fileName) {
      // 从 URL 中提取文件名
      const parts = currentUrl.split('/')
      const raw = parts[parts.length - 1] || ''
      // 去掉时间戳前缀（格式：timestamp-原文件名）
      const name = raw.replace(/^\d+-/, '')
      setFileName(decodeURIComponent(name))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        const { message } = await import('antd')
        message.error(json.error || '上传失败')
        return false
      }
      form.setFieldValue(['formData', field.fieldKey], json.url)
      setFileName(json.name)
      const { message } = await import('antd')
      message.success(`${json.name} 上传成功`)
    } catch {
      const { message } = await import('antd')
      message.error('上传失败，请检查网络')
    } finally {
      setUploading(false)
    }
    return false // 阻止 antd Upload 默认行为
  }, [field.fieldKey, form])

  const handleClear = useCallback(() => {
    form.setFieldValue(['formData', field.fieldKey], '')
    setFileName('')
  }, [field.fieldKey, form])

  if (disabled) {
    return currentUrl
      ? <a href={currentUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{fileName || currentUrl}</a>
      : <span style={{ color: '#999' }}>暂无附件</span>
  }

  return (
    <Space>
      <Upload
        beforeUpload={handleUpload}
        showUploadList={false}
        disabled={uploading}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          {uploading ? '上传中...' : '选择文件'}
        </Button>
      </Upload>
      {fileName && (
        <Space size={4}>
          <a href={currentUrl} target="_blank" rel="noreferrer">{fileName}</a>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={handleClear} />
        </Space>
      )}
      {!fileName && <span style={{ color: '#999', fontSize: 12 }}>支持 图片 / PDF / Word / Excel / ZIP，最大 100MB</span>}
    </Space>
  )
}

function renderControl(
  field: FormFieldConfig,
  disabled?: boolean,
  onLoadOptions?: DynamicFormProps['onLoadOptions'],
  onCascadeSelect?: DynamicFormProps['onCascadeSelect'],
) {
  const isDisabled = disabled || field.isReadonly
  switch (field.componentType) {
    case 'input':
      return <Input placeholder={field.placeholder || `请输入${field.label}`} disabled={isDisabled} />
    case 'number':
      return (
        <InputNumber
          placeholder={field.placeholder || `请输入${field.label}`}
          style={{ width: '100%' }}
          precision={2}
          disabled={isDisabled}
        />
      )
    case 'date':
      return <DatePicker style={{ width: '100%' }} disabled={isDisabled} />
    case 'select':
      return (
        <Select
          placeholder={field.placeholder || `请选择${field.label}`}
          options={parseOptions(field.optionsJson)}
          disabled={isDisabled}
          allowClear
        />
      )
    case 'textarea':
      return (
        <Input.TextArea
          placeholder={field.placeholder || `请输入${field.label}`}
          rows={3}
          disabled={isDisabled}
        />
      )
    case 'cascadeSelect':
      return (
        <CascadeSelectField
          field={field}
          disabled={isDisabled}
          onLoadOptions={onLoadOptions}
          onCascadeSelect={onCascadeSelect}
        />
      )
    case 'file':
      return <FileField field={field} disabled={isDisabled} />
    case 'table':
      return <TableField field={field} disabled={isDisabled} />
    default:
      return <Input placeholder={`请输入${field.label}`} disabled={isDisabled} />
  }
}

export default function DynamicForm({
  fields,
  form: _form,
  disabled,
  onLoadOptions,
  onCascadeSelect,
}: DynamicFormProps) {
  // 获取当前表单值，用于显隐联动（必须在所有 return 之前调用）
  const formValues = Form.useWatch([], _form) || {}
  const allValues = (formValues as any)?.formData || formValues

  if (!fields || fields.length === 0) {
    return <div style={{ color: '#999', padding: '8px 0' }}>暂无配置字段</div>
  }

  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      {sorted.map((field) => {
        // 显隐联动
        if (field.dependsOn && field.dependsValue) {
          const watchVal = allValues[field.dependsOn]
          if (watchVal !== field.dependsValue) return null
        }

        // table 字段用 Form.List，不用 Form.Item 包裹 name
        if (field.componentType === 'table') {
          return (
            <Form.Item key={field.id} label={field.label}>
              <TableField field={field} disabled={disabled} />
            </Form.Item>
          )
        }

        return (
          <Form.Item
            key={field.id}
            label={field.label}
            name={['formData', field.fieldKey]}
            rules={
              field.required && !field.isReadonly
                ? [{ required: true, message: `${field.label}不能为空` }]
                : []
            }
            tooltip={field.isReadonly ? '此字段自动计算，无需填写' : undefined}
          >
            {renderControl(field, disabled, onLoadOptions, onCascadeSelect)}
          </Form.Item>
        )
      })}
    </>
  )
}
