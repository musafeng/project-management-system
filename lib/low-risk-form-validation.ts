export type LowRiskFormCode =
  | 'management-expenses'
  | 'sales-expenses'
  | 'petty-cashes'
  | 'other-receipts'
  | 'other-payments'

type ValidationKind = 'text' | 'date' | 'positive-number'

interface ScopedFieldRule {
  kind?: ValidationKind
  message?: string
  required: boolean
}

const LOW_RISK_FORM_RULES: Record<LowRiskFormCode, Record<string, ScopedFieldRule>> = {
  'management-expenses': {
    submitter: { required: true, kind: 'text', message: '报销人为必填项' },
    expenseDate: { required: true, kind: 'date', message: '日期为必填项' },
    projectId: { required: false },
  },
  'sales-expenses': {
    submitter: { required: true, kind: 'text', message: '报销人为必填项' },
    expenseDate: { required: true, kind: 'date', message: '日期为必填项' },
    projectId: { required: false },
  },
  'petty-cashes': {
    holder: { required: true, kind: 'text', message: '申请人为必填项' },
    issuedAmount: { required: true, kind: 'positive-number', message: '金额必须大于0' },
    issueDate: { required: true, kind: 'date', message: '日期为必填项' },
    projectId: { required: false },
  },
  'other-receipts': {
    receiptType: { required: true, kind: 'text', message: '收款事由为必填项' },
    receiptAmount: { required: true, kind: 'positive-number', message: '金额必须大于0' },
    receiptDate: { required: true, kind: 'date', message: '日期为必填项' },
    projectId: { required: false },
  },
  'other-payments': {
    paymentType: { required: true, kind: 'text', message: '付款事由为必填项' },
    paymentAmount: { required: true, kind: 'positive-number', message: '金额必须大于0' },
    paymentDate: { required: true, kind: 'date', message: '日期为必填项' },
    projectId: { required: false },
  },
}

export function getLowRiskFieldRule(scope: LowRiskFormCode, fieldKey: string): ScopedFieldRule | undefined {
  return LOW_RISK_FORM_RULES[scope]?.[fieldKey]
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return value == null ? null : String(value).trim() || null
  const trimmed = value.trim()
  return trimmed || null
}

export function normalizeOptionalProjectId(value: unknown): string | null {
  return normalizeOptionalText(value)
}

export function validateScopedFieldValue(rule: ScopedFieldRule, value: unknown, fallbackMessage: string): string | null {
  if (!rule.required) return null

  const message = rule.message || fallbackMessage

  switch (rule.kind) {
    case 'text': {
      return normalizeOptionalText(value) ? null : message
    }
    case 'date': {
      if (value instanceof Date) return null
      if (value && typeof value === 'object' && 'isValid' in (value as Record<string, unknown>)) {
        return null
      }
      return normalizeOptionalText(value) ? null : message
    }
    case 'positive-number': {
      if (value === null || value === undefined || value === '') return message
      const numericValue = Number(value)
      return Number.isFinite(numericValue) && numericValue > 0 ? null : message
    }
    default: {
      if (typeof value === 'string') return value.trim() ? null : message
      return value === null || value === undefined ? message : null
    }
  }
}
