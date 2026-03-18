/**
 * 钉钉服务端工具
 * 用于服务端调用钉钉开放平台 API
 */

import { serverEnv } from './env'

/**
 * 钉钉 API 基础地址
 */
const DINGTALK_API_BASE = 'https://oapi.dingtalk.com'

/**
 * 钉钉用户信息
 */
export interface DingTalkUser {
  userid: string
  name: string
  mobile?: string
  unionid?: string
  deptIds?: number[]
  email?: string
  avatar?: string
}

/**
 * 获取企业内部应用 access_token
 * 文档：https://open.dingtalk.com/document/orgapp/obtain-orgapp-token
 */
export async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = serverEnv.dingtalk

  if (!clientId || !clientSecret) {
    throw new Error('钉钉配置缺失：clientId 或 clientSecret 未设置')
  }

  try {
    const response = await fetch(
      `${DINGTALK_API_BASE}/gettoken?appkey=${clientId}&appsecret=${clientSecret}`,
      {
        method: 'GET',
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      throw new Error(`获取 access_token 失败: ${result.errmsg}`)
    }

    return result.access_token
  } catch (error) {
    console.error('获取钉钉 access_token 失败:', error)
    throw error
  }
}

/**
 * 通过免登授权码获取用户 userid
 * 文档：https://open.dingtalk.com/document/orgapp/obtain-the-userid-of-a-user-by-using-the-log-free
 */
export async function getUserIdByCode(code: string): Promise<string> {
  const accessToken = await getAccessToken()

  try {
    const response = await fetch(
      `${DINGTALK_API_BASE}/topapi/v2/user/getuserinfo?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${result.errmsg}`)
    }

    return result.result.userid
  } catch (error) {
    console.error('通过 code 获取 userid 失败:', error)
    throw error
  }
}

/**
 * 获取用户详细信息
 * 文档：https://open.dingtalk.com/document/orgapp/query-user-details
 */
export async function getUserDetail(userid: string): Promise<DingTalkUser> {
  const accessToken = await getAccessToken()

  try {
    const response = await fetch(
      `${DINGTALK_API_BASE}/topapi/v2/user/get?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userid }),
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      throw new Error(`获取用户详情失败: ${result.errmsg}`)
    }

    const user = result.result

    return {
      userid: user.userid,
      name: user.name,
      mobile: user.mobile || undefined,
      unionid: user.unionid || undefined,
      deptIds: user.dept_id_list || undefined,
      email: user.email || undefined,
      avatar: user.avatar || undefined,
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    throw error
  }
}

/**
 * 通过免登授权码获取完整用户信息（一步到位）
 */
export async function getUserByCode(code: string): Promise<DingTalkUser> {
  // 1. 通过 code 获取 userid
  const userid = await getUserIdByCode(code)

  // 2. 通过 userid 获取用户详情
  const userDetail = await getUserDetail(userid)

  return userDetail
}

// ============================================================================
// 网页登录（浏览器管理后台专用）
// 使用钉钉 OAuth2.0 扫码/手机登录，不依赖 dd.js
// 文档：https://open.dingtalk.com/document/orgapp/tutorial-obtaining-user-personal-information
// ============================================================================

/**
 * 生成钉钉网页登录授权 URL
 * 用于管理后台浏览器环境，引导用户扫码或使用手机钉钉登录
 */
export function generateWebLoginUrl(redirectUri: string, state = 'admin'): string {
  const { clientId } = serverEnv.dingtalk
  if (!clientId) throw new Error('DINGTALK_CLIENT_ID 未配置')

  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    response_type: 'code',
    client_id: clientId,
    scope: 'openid',
    state,
    prompt: 'consent',
  })

  return `https://login.dingtalk.com/oauth2/auth?${params.toString()}`
}

/**
 * 通过网页登录回调 code 换取用户信息
 * 流程：code → userAccessToken（含 unionId）→ userid → 用户详情
 */
export async function getUserByWebCode(code: string): Promise<DingTalkUser> {
  const { clientId, clientSecret } = serverEnv.dingtalk
  if (!clientId || !clientSecret) throw new Error('钉钉配置缺失')

  // Step 1: code 换 userAccessToken，响应里直接含 unionId
  const tokenRes = await fetch('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      clientSecret,
      code,
      grantType: 'authorization_code',
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.accessToken) {
    throw new Error(`获取 userAccessToken 失败: ${JSON.stringify(tokenData)}`)
  }
  const unionId: string = tokenData.unionId || tokenData.unionid || ''
  if (!unionId) {
    throw new Error(`token 响应中缺少 unionId，完整响应: ${JSON.stringify(tokenData)}`)
  }

  // Step 2: 用 unionId 换取企业内 userid
  const accessToken = await getAccessToken()
  const userIdRes = await fetch(
    `${DINGTALK_API_BASE}/topapi/user/getbyunionid?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unionid: unionId }),
    }
  )
  const userIdData = await userIdRes.json()
  if (userIdData.errcode !== 0) {
    throw new Error(`unionid 换 userid 失败: ${userIdData.errmsg}`)
  }
  const userid: string = userIdData.result.userid

  // Step 4: 获取完整用户详情
  return getUserDetail(userid)
}

/**
 * 获取单个部门详情
 * 文档：https://open.dingtalk.com/document/orgapp/query-department-details
 */
export async function getDepartmentDetail(deptId: number): Promise<{ deptId: number; name: string } | null> {
  try {
    const accessToken = await getAccessToken()
    const response = await fetch(
      `${DINGTALK_API_BASE}/topapi/v2/department/get?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept_id: deptId }),
      }
    )
    const result = await response.json()
    if (result.errcode !== 0) {
      console.warn(`获取部门 ${deptId} 详情失败: ${result.errmsg}`)
      return null
    }
    return {
      deptId: result.result.dept_id,
      name: result.result.name,
    }
  } catch (error) {
    console.warn(`获取部门 ${deptId} 详情异常:`, error)
    return null
  }
}

/**
 * 批量获取部门名称
 * 输入部门ID数组，输出对应部门名称数组（顺序一致，失败的返回空字符串）
 */
export async function getDepartmentNames(deptIds: number[]): Promise<string[]> {
  if (!deptIds || deptIds.length === 0) return []
  try {
    const results = await Promise.all(deptIds.map((id) => getDepartmentDetail(id)))
    return results.map((r) => r?.name ?? '')
  } catch (error) {
    console.warn('批量获取部门名称失败:', error)
    return deptIds.map(() => '')
  }
}

