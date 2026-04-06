import type { Rule } from 'antd/es/form'

export function positiveAmountRules(label: string): Rule[] {
  return [
    { required: true, message: `请输入${label}` },
    {
      validator: async (_rule, value) => {
        if (value === undefined || value === null || value === '') return
        if (Number.isFinite(Number(value)) && Number(value) > 0) return
        throw new Error(`${label}必须大于 0`)
      },
    },
  ]
}

export function requiredDateRule(label: string): Rule {
  return { required: true, message: `请选择${label}` }
}

export function endDateAfterStartRule(getStartDate: () => any, startLabel = '开始日期'): Rule {
  return {
    validator: async (_rule, value) => {
      const startDate = getStartDate()
      if (!startDate || !value) return
      if (typeof value.isBefore === 'function' && value.isBefore(startDate, 'day')) {
        throw new Error(`结束日期不能早于${startLabel}`)
      }
    },
  }
}
