export interface ExpenseItemInput {
  type?: unknown
  amount?: unknown
  [key: string]: unknown
}

export interface NormalizedExpenseItem {
  type: string
  amount: number | null
}

interface ValidExpenseItem {
  type: string
  amount: number
}

interface NormalizeResult {
  error: string | null
  items: NormalizedExpenseItem[]
  totalAmount: number
}

function normalizeItemType(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function normalizeItemAmount(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : Number.NaN
}

function isBlankItem(item: NormalizedExpenseItem): boolean {
  return !item.type && item.amount === null
}

function buildItemErrorMessage(index: number, reason: string): string {
  return `第${index + 1}条费用明细${reason}`
}

export function normalizeExpenseItems(items: unknown): NormalizeResult {
  if (!Array.isArray(items)) {
    return { error: '费用明细格式不正确', items: [], totalAmount: 0 }
  }

  const normalizedItems = items.map((item) => ({
    type: normalizeItemType((item as ExpenseItemInput)?.type),
    amount: normalizeItemAmount((item as ExpenseItemInput)?.amount),
  }))

  const validItems: ValidExpenseItem[] = []

  for (let index = 0; index < normalizedItems.length; index += 1) {
    const item = normalizedItems[index]

    if (isBlankItem(item)) {
      continue
    }

    if (!item.type) {
      return { error: buildItemErrorMessage(index, '的类型不能为空'), items: [], totalAmount: 0 }
    }

    if (item.amount === null || Number.isNaN(item.amount)) {
      return { error: buildItemErrorMessage(index, '的金额不能为空'), items: [], totalAmount: 0 }
    }

    if (item.amount <= 0) {
      return { error: buildItemErrorMessage(index, '的金额必须大于0'), items: [], totalAmount: 0 }
    }

    validItems.push({ type: item.type, amount: Number(item.amount.toFixed(2)) })
  }

  if (validItems.length === 0) {
    return { error: '请至少填写一条费用明细', items: [], totalAmount: 0 }
  }

  const totalAmount = Number(validItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2))

  return {
    error: null,
    items: validItems,
    totalAmount,
  }
}
