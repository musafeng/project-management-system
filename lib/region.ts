/**
 * 区域工作空间上下文工具
 * current_region_id 存储在 cookie 中，所有人可自由切换
 */

import { cookies } from 'next/headers'
import { db } from './db'

const REGION_COOKIE = 'current_region_id'
const REGION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 年

/**
 * 获取当前区域 ID（服务端）
 * 优先读 cookie，读不到则返回 DEFAULT 区域 id
 */
export async function getCurrentRegionId(): Promise<string | null> {
  const cookieStore = await cookies()
  const val = cookieStore.get(REGION_COOKIE)?.value
  if (val) return val

  // 回退到默认区域
  const def = await db.region.findUnique({ where: { code: 'DEFAULT' }, select: { id: true } })
  return def?.id ?? null
}

/**
 * 设置当前区域 cookie（服务端）
 */
export async function setCurrentRegionId(regionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(REGION_COOKIE, regionId, {
    httpOnly: false, // 前端需要读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REGION_COOKIE_MAX_AGE,
    path: '/',
  })
}





