/**
 * lib/utils/format.ts
 * 通用格式化工具函数
 *
 * 使用方式：
 *   import { fmtMoney, fmtDate } from '@/lib/utils/format'
 */

/**
 * 格式化金额
 * @param v 数字、null 或 undefined
 * @returns 格式化后的金额字符串，如 ¥1,234.56，空值返回 —
 */
export function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—'
  return `¥${Number(v).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * 格式化日期
 * @param iso ISO 日期字符串、null 或 undefined
 * @returns 格式化后的日期字符串，如 2024/01/15，空值返回 —
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

