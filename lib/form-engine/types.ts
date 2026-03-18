/**
 * 表单联动引擎 - 类型定义
 *
 * 设计原则：
 * - 只描述「运行时联动行为」，不做 UI 渲染配置
 * - 所有规则都是纯函数，输入 values 输出结论
 * - 与 Ant Design Form 解耦，可单独测试
 */

// ============================================================
// 基础类型
// ============================================================

/** 表单当前所有字段值（宽松类型，运行时确定） */
export type FormValues = Record<string, any>

/** 联动规则的执行上下文 */
export interface RuleContext {
  values: FormValues          // 当前所有字段值
  prevValues?: FormValues     // 上一次的字段值（用于检测变化）
  extra?: Record<string, any> // 业务扩展数据（如远程加载的选项）
}

// ============================================================
// 显隐规则
// ============================================================

/** 字段可见性规则 */
export interface VisibilityRule {
  /** 目标字段 key */
  field: string
  /** 返回 true 则显示，false 则隐藏 */
  visible: (ctx: RuleContext) => boolean
  /** 隐藏时是否清空字段值（默认 true） */
  clearOnHide?: boolean
}

// ============================================================
// 只读规则
// ============================================================

/** 字段只读规则 */
export interface ReadonlyRule {
  field: string
  /** 返回 true 则只读 */
  readonly: (ctx: RuleContext) => boolean
}

// ============================================================
// 默认值规则
// ============================================================

/** 字段默认值/自动填充规则 */
export interface DefaultValueRule {
  field: string
  /**
   * 计算默认值
   * - 返回非 undefined 时，自动 setFieldValue
   * - 只在字段当前为空 或 watchFields 发生变化时触发
   */
  getValue: (ctx: RuleContext) => any
  /** 监听哪些字段变化时重新计算（不填则每次 values 变化都触发） */
  watchFields?: string[]
  /** 即使字段已有值也强制覆盖（慎用，适合联动带出场景） */
  forceUpdate?: boolean
}

// ============================================================
// 实时计算规则
// ============================================================

/** 表单内计算字段（如合计、剩余金额） */
export interface ComputedRule {
  field: string
  /** 依赖字段变化时触发 */
  deps: string[]
  compute: (ctx: RuleContext) => any
}

// ============================================================
// 提交前校验规则
// ============================================================

/** 业务级校验（补充 Ant Design Form 内置校验） */
export interface BusinessValidationRule {
  /** 校验标识，便于调试 */
  id: string
  /** 关联字段（校验失败时在该字段上显示错误） */
  field: string
  /** 返回 null 表示通过，返回字符串表示错误信息 */
  validate: (ctx: RuleContext) => string | null
}

// ============================================================
// 字段组切换规则（按业务类型切换字段集）
// ============================================================

/** 按条件切换字段分组 */
export interface FieldGroupRule {
  /** 哪个字段控制分组切换 */
  switchField: string
  /** key = 字段值，value = 该分组下可见的字段列表 */
  groups: Record<string, string[]>
  /** 兜底分组（switchField 值未命中任何 key 时使用） */
  defaultGroup?: string[]
}

// ============================================================
// 引擎配置（组合所有规则）
// ============================================================

export interface FormEngineConfig {
  /** 字段显隐规则 */
  visibility?: VisibilityRule[]
  /** 字段只读规则 */
  readonly?: ReadonlyRule[]
  /** 默认值/自动带出规则 */
  defaultValues?: DefaultValueRule[]
  /** 计算字段规则 */
  computed?: ComputedRule[]
  /** 业务校验规则 */
  validations?: BusinessValidationRule[]
  /** 字段组切换规则 */
  fieldGroup?: FieldGroupRule
}

// ============================================================
// Hook 返回值
// ============================================================

export interface DynamicFormState {
  /** 当前可见字段集合（实为 hiddenFields，通过 isVisible 取反） */
  visibleFields: Set<string>
  /** 当前只读字段集合 */
  readonlyFields: Set<string>
  /** 判断某字段是否可见 */
  isVisible: (field: string) => boolean
  /** 判断某字段是否只读 */
  isReadonly: (field: string) => boolean
  /** 运行业务校验，返回错误列表 */
  runValidations: (values: FormValues) => Array<{ field: string; message: string }>
  /** 主动触发所有联动计算（values 变化时调用） */
  onValuesChange: (changedValues: FormValues, allValues: FormValues) => void
  /** 注入外部数据（如远程加载的选项），供规则函数通过 ctx.extra 读取 */
  setExtra: (key: string, value: any) => void
}

