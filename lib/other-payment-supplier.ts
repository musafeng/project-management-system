const OTHER_PAYMENT_SUPPLIER_PREFIX = '__OTHER_PAYMENT_SUPPLIER__'

export interface OtherPaymentSupplierMeta {
  supplierId?: string | null
  supplierName?: string | null
  contact?: string | null
  accountName?: string | null
  bankAccount?: string | null
  bankName?: string | null
}

export interface ParsedOtherPaymentRemark extends OtherPaymentSupplierMeta {
  remark: string | null
}

function clean(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

export function parseOtherPaymentRemark(value: string | null | undefined): ParsedOtherPaymentRemark {
  const remark = clean(value)
  if (!remark || !remark.startsWith(OTHER_PAYMENT_SUPPLIER_PREFIX)) {
    return { remark }
  }

  try {
    const parsed = JSON.parse(remark.slice(OTHER_PAYMENT_SUPPLIER_PREFIX.length))
    return {
      supplierId: clean(parsed?.supplierId),
      supplierName: clean(parsed?.supplierName),
      contact: clean(parsed?.contact),
      accountName: clean(parsed?.accountName),
      bankAccount: clean(parsed?.bankAccount),
      bankName: clean(parsed?.bankName),
      remark: clean(parsed?.remark),
    }
  } catch {
    return { remark }
  }
}

export function serializeOtherPaymentRemark(
  remark: string | null | undefined,
  meta: OtherPaymentSupplierMeta
): string | null {
  const normalizedRemark = clean(remark)
  const normalizedMeta = {
    supplierId: clean(meta.supplierId),
    supplierName: clean(meta.supplierName),
    contact: clean(meta.contact),
    accountName: clean(meta.accountName),
    bankAccount: clean(meta.bankAccount),
    bankName: clean(meta.bankName),
  }

  const hasMeta = Object.values(normalizedMeta).some(Boolean)
  if (!hasMeta) return normalizedRemark

  return `${OTHER_PAYMENT_SUPPLIER_PREFIX}${JSON.stringify({
    ...normalizedMeta,
    remark: normalizedRemark,
  })}`
}
