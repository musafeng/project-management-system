/**
 * 表单联动引擎 - useDynamicForm Hook
 *
 * 用法：
 *   const { isVisible, isReadonly, runValidations, onValuesChange } = useDynamicForm(form, config)
 *
 *   在 <Form onValuesChange={onValuesChange}> 中挂载即可。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormInstance } from 'antd'
import type {
  FormEngineConfig,
  FormValues,
  DynamicFormState,
  RuleContext,
} from './types'

export function useDynamicForm(
  form: FormInstance,
  config: FormEngineConfig,
): DynamicFormState {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [readonlyFields, setReadonlyFields] = useState<Set<string>>(new Set())

  // 用 ref 追踪上一次的值，避免死循环
  const prevValuesRef = useRef<FormValues>({})
  const extraRef = useRef<Record<string, any>>({})

  // ============================================================
  // 内部：构建 RuleContext
  // ============================================================
  const buildCtx = useCallback(
    (allValues: FormValues): RuleContext => ({
      values: allValues,
      prevValues: prevValuesRef.current,
      extra: extraRef.current,
    }),
    [],
  )

  // ============================================================
  // 内部：计算可见字段
  // ============================================================
  const computeVisibility = useCallback(
    (ctx: RuleContext): Set<string> => {
      const hidden = new Set<string>()

      // 字段组规则（优先级最高）
      if (config.fieldGroup) {
        const { switchField, groups, defaultGroup } = config.fieldGroup
        const switchVal = ctx.values[switchField]
        const allowedFields = groups[switchVal] ?? defaultGroup
        if (allowedFields) {
          // 将所有分组中出现过的字段收集起来
          const allGroupFields = new Set(
            Object.values(groups).flat().concat(defaultGroup ?? []),
          )
          allGroupFields.forEach((f) => {
            if (!allowedFields.includes(f)) hidden.add(f)
          })
        }
      }

      // visibility 规则
      ;(config.visibility ?? []).forEach((rule) => {
        if (!rule.visible(ctx)) hidden.add(rule.field)
      })

      // 返回「可见集合」= 所有字段 - hidden（这里直接返回 hidden 的补集）
      // 实际使用时通过 isVisible 判断即可
      const visible = new Set<string>()
      // 将「不在 hidden 中」的视为可见
      // 注意：我们只维护 hiddenFields，isVisible 做取反
      return hidden // 返回 hidden，isVisible 做 !has(field)
    },
    [config],
  )

  // ============================================================
  // 内部：计算只读字段
  // ============================================================
  const computeReadonly = useCallback(
    (ctx: RuleContext): Set<string> => {
      const readonly = new Set<string>()
      ;(config.readonly ?? []).forEach((rule) => {
        if (rule.readonly(ctx)) readonly.add(rule.field)
      })
      return readonly
    },
    [config],
  )

  // ============================================================
  // 内部：执行默认值 / 计算字段规则
  // ============================================================
  const applyDerivedValues = useCallback(
    (ctx: RuleContext) => {
      const updates: Record<string, any> = {}

      // computed 字段（强制覆盖）
      ;(config.computed ?? []).forEach((rule) => {
        const depChanged = rule.deps.some(
          (d) => ctx.values[d] !== ctx.prevValues?.[d],
        )
        if (depChanged) {
          updates[rule.field] = rule.compute(ctx)
        }
      })

      // defaultValues 规则
      ;(config.defaultValues ?? []).forEach((rule) => {
        const shouldRun =
          !rule.watchFields ||
          rule.watchFields.some((f) => ctx.values[f] !== ctx.prevValues?.[f])

        if (!shouldRun) return

        const currentVal = ctx.values[rule.field]
        const isEmpty =
          currentVal === undefined || currentVal === null || currentVal === ''

        if (isEmpty || rule.forceUpdate) {
          const newVal = rule.getValue(ctx)
          if (newVal !== undefined) {
            updates[rule.field] = newVal
          }
        }
      })

      if (Object.keys(updates).length > 0) {
        form.setFieldsValue(updates)
      }
    },
    [config, form],
  )

  // ============================================================
  // 内部：隐藏字段清空
  // ============================================================
  const clearHiddenFields = useCallback(
    (hiddenFields: Set<string>, prevHidden: Set<string>) => {
      const newlyHidden: string[] = []
      hiddenFields.forEach((f) => {
        if (!prevHidden.has(f)) newlyHidden.push(f)
      })
      if (newlyHidden.length === 0) return

      // 只清空配置了 clearOnHide !== false 的字段
      const toClear: Record<string, undefined> = {}
      newlyHidden.forEach((f) => {
        const rule = (config.visibility ?? []).find((r) => r.field === f)
        if (!rule || rule.clearOnHide !== false) {
          toClear[f] = undefined
        }
      })
      if (Object.keys(toClear).length > 0) {
        form.setFieldsValue(toClear)
      }
    },
    [config, form],
  )

  // ============================================================
  // 主联动入口：onValuesChange
  // ============================================================
  const prevHiddenRef = useRef<Set<string>>(new Set())

  const onValuesChange = useCallback(
    (_changedValues: FormValues, allValues: FormValues) => {
      const ctx = buildCtx(allValues)

      // 1. 计算显隐
      const hidden = computeVisibility(ctx)
      setVisibleFields(hidden) // 这里存的是 hiddenFields
      clearHiddenFields(hidden, prevHiddenRef.current)
      prevHiddenRef.current = hidden

      // 2. 计算只读
      const ro = computeReadonly(ctx)
      setReadonlyFields(ro)

      // 3. 派生值（计算字段 + 默认值带出）
      applyDerivedValues(ctx)

      // 4. 更新 prevValues
      prevValuesRef.current = { ...allValues }
    },
    [buildCtx, computeVisibility, computeReadonly, applyDerivedValues, clearHiddenFields],
  )

  // 初始化时触发一次
  useEffect(() => {
    const initialValues = form.getFieldsValue(true)
    onValuesChange({}, initialValues)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // 暴露给外部的工具方法
  // ============================================================

  const isVisible = useCallback(
    (field: string) => !visibleFields.has(field),
    [visibleFields],
  )

  const isReadonly = useCallback(
    (field: string) => readonlyFields.has(field),
    [readonlyFields],
  )

  const runValidations = useCallback(
    (values: FormValues) => {
      const ctx = buildCtx(values)
      const errors: Array<{ field: string; message: string }> = []
      ;(config.validations ?? []).forEach((rule) => {
        const msg = rule.validate(ctx)
        if (msg) errors.push({ field: rule.field, message: msg })
      })
      return errors
    },
    [buildCtx, config],
  )

  /** 允许外部注入 extra 数据（如远程选项列表） */
  const setExtra = useCallback((key: string, value: any) => {
    extraRef.current = { ...extraRef.current, [key]: value }
  }, [])

  return {
    visibleFields,   // 实为 hiddenFields，通过 isVisible 取反使用
    readonlyFields,
    isVisible,
    isReadonly,
    runValidations,
    onValuesChange,
    setExtra,
  } satisfies DynamicFormState
}

