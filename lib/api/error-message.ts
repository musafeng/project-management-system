export function toChineseErrorMessage(message: string | null | undefined): string {
  const text = String(message || '').trim()

  if (!text) return '操作失败，请稍后重试'

  if (text.includes('Unique constraint failed')) {
    return '数据已存在，请检查唯一字段是否重复'
  }

  if (text.includes('Foreign key constraint failed')) {
    return '关联数据不存在或已被删除'
  }

  if (text.includes('Record to update not found')) {
    return '要更新的数据不存在或已被删除'
  }

  if (text.includes('Record to delete does not exist')) {
    return '要删除的数据不存在或已被删除'
  }

  if (text.includes('Record does not exist')) {
    return '数据不存在或已被删除'
  }

  if (text.includes('Cannot parse JSON')) {
    return '提交的数据格式不正确'
  }

  if (text.includes('Invalid `prisma.')) {
    return '数据库操作失败，请检查输入内容后重试'
  }

  if (text.includes("Can't reach database server")) {
    return '无法连接数据库，请联系管理员检查数据库服务'
  }

  if (text.includes('Environment variable not found')) {
    return '系统环境配置缺失，请联系管理员处理'
  }

  if (text.includes('Method ') && text.includes(' not allowed')) {
    return '当前请求方法不被支持'
  }

  if (text.includes('Internal Server Error')) {
    return '服务器内部错误，请稍后重试'
  }

  if (text.includes('Unknown error occurred')) {
    return '发生未知错误，请稍后重试'
  }

  return text
}
