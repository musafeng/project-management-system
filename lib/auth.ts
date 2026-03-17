/**
 * 登录态管理
 * 使用 HttpOnly Cookie 存储用户登录信息
 */

import { cookies } from 'next/headers'

/**
 * 登录用户信息
 */
export interface AuthUser {
  userid: string
  name: string
  mobile?: string
  unionid?: string
  deptIds?: number[]
}

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = 'auth'

/**
 * Cookie 过期时间（7 天）
 */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

/**
 * 设置登录态
 */
export async function setAuthCookie(user: AuthUser): Promise<void> {
  const cookieStore = await cookies()

  // 将用户信息序列化为 JSON 字符串
  const userJson = JSON.stringify(user)

  cookieStore.set(AUTH_COOKIE_NAME, userJson, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * 获取登录态
 */
export async function getAuthCookie(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME)

    if (!authCookie || !authCookie.value) {
      return null
    }

    const user = JSON.parse(authCookie.value) as AuthUser
    return user
  } catch (error) {
    console.error('解析登录态 cookie 失败:', error)
    return null
  }
}

/**
 * 清除登录态
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

