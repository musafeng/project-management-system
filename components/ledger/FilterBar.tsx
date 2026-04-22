/**
 * FilterBar — 台账筛选栏
 *
 * 用法：
 *   <FilterBar
 *     fields={[
 *       { type: 'input',  key: 'keyword', placeholder: '搜索合同名称/编号' },
 *       { type: 'select', key: 'status',  placeholder: '全部状态', options: [...] },
 *       { type: 'select', key: 'projectId', placeholder: '全部项目', options: [...] },
 *       { type: 'dateRange', key: 'dateRange', placeholder: ['开始日期', '结束日期'] },
 *     ]}
 *     onSearch={handleSearch}
 *     onReset={handleReset}
 *     extra={<Button icon={<DownloadOutlined />} size="small">导出</Button>}
 *   />
 */
'use client'

import { Input, Select, DatePicker, Button } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useState, type ReactNode } from 'react'
import { useMobile } from '@/hooks/useMobile'

const { RangePicker } = DatePicker

export type FilterValue = string | [string, string] | null

export interface FilterField {
  type: 'input' | 'select' | 'dateRange'
  key: string
  placeholder?: string | [string, string]
  options?: { label: string; value: string }[]
  width?: number
}

export type FilterValues = Record<string, FilterValue>

interface FilterBarProps {
  fields: FilterField[]
  onSearch: (values: FilterValues) => void
  onReset?: () => void
  loading?: boolean
  extra?: ReactNode   // 导出按钮等，弱化在右侧
}

export function FilterBar({ fields, onSearch, onReset, loading, extra }: FilterBarProps) {
  const [values, setValues] = useState<FilterValues>({})
  const isMobile = useMobile()

  const set = (key: string, val: FilterValue) =>
    setValues((prev) => ({ ...prev, [key]: val }))

  const handleSearch = () => onSearch(values)

  const handleReset = () => {
    setValues({})
    onReset?.()
    onSearch({})
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: '12px 0 8px',
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      {fields.map((f) => {
        if (f.type === 'input') {
          return (
            <Input
              key={f.key}
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder={f.placeholder as string}
              value={(values[f.key] as string) ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: isMobile ? '100%' : (f.width ?? 200) }}
              size={isMobile ? 'middle' : 'small'}
              allowClear
            />
          )
        }
        if (f.type === 'select') {
          return (
            <Select
              key={f.key}
              placeholder={f.placeholder as string}
              value={(values[f.key] as string) || undefined}
              onChange={(v) => set(f.key, v ?? null)}
              style={{ width: isMobile ? '100%' : (f.width ?? 140) }}
              size={isMobile ? 'middle' : 'small'}
              allowClear
              options={f.options}
            />
          )
        }
        if (f.type === 'dateRange') {
          const ph = f.placeholder as [string, string] | undefined
          return (
            <RangePicker
              key={f.key}
              size={isMobile ? 'middle' : 'small'}
              placeholder={ph ?? ['开始日期', '结束日期']}
              style={{ width: isMobile ? '100%' : (f.width ?? 220) }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  set(f.key, [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
                } else {
                  set(f.key, null)
                }
              }}
            />
          )
        }
        return null
      })}

      <div
        style={{
          display: 'flex',
          gap: 8,
          width: isMobile ? '100%' : 'auto',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
        }}
      >
        <Button
          type="primary"
          size={isMobile ? 'middle' : 'small'}
          onClick={handleSearch}
          loading={loading}
          style={{ flex: isMobile ? 1 : undefined }}
        >
          查询
        </Button>
        <Button
          size={isMobile ? 'middle' : 'small'}
          icon={<ReloadOutlined />}
          onClick={handleReset}
          style={{ flex: isMobile ? 1 : undefined }}
        >
          重置
        </Button>
      </div>

      {/* 导出等辅助操作弱化在右侧 */}
      {extra && (
        <div
          style={{
            marginLeft: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : 'auto',
            display: 'flex',
            justifyContent: isMobile ? 'flex-end' : 'flex-start',
          }}
        >
          {extra}
        </div>
      )}
    </div>
  )
}



